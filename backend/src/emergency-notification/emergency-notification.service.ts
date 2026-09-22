import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationChannel, NotificationSessionStatus, NotificationAttemptStatus, NotificationCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LocationSharingService } from '../location-sharing/location-sharing.service';
import { TriggerNotificationDto } from './dto/trigger-notification.dto';
import { generateShareToken } from './acknowledge-token.util';

const ESCALATION_INTERVAL_MS = (parseInt(process.env.ESCALATION_INTERVAL_SECONDS || '45', 10)) * 1000;
const SESSION_EXPIRY_MS = 30 * 60 * 1000;

import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

// ─── RoboCall.pk & RoboSMS.pk ─────────────────────────────────────────────
// All calls/sms are placed server-side via simple HTTPS GET requests.
// No native Android code, no CALL_PHONE permission needed.

const ROBOCALL_BASE = 'https://portal.robocall.pk/api';
const ROBOSMS_BASE = 'https://portal.robosms.pk/api';

/**
 * Normalize a phone number to RoboCall/RoboSMS format:
 * Pakistan format → 923XXXXXXXXX (no +, no leading 0)
 */
function normalizePkPhone(phone: string): string {
  let p = phone.replace(/[\s\-\(\)]/g, '');
  if (p.startsWith('+92')) return p.substring(1);
  if (p.startsWith('0092')) return p.substring(2);
  if (p.startsWith('92') && p.length === 12) return p;
  if (p.startsWith('0')) return '92' + p.substring(1);
  if (p.length === 10) return '92' + p;
  return p;
}

@Injectable()
export class EmergencyNotificationService {
  private readonly logger = new Logger(EmergencyNotificationService.name);

  // RoboCall.pk config (from .env)
  private robocallApiKey = (process.env.ROBOCALL_API_KEY || '').trim();
  private robocallVoiceId = (process.env.ROBOCALL_VOICE_ID || '102').trim();

  // RoboSMS.pk config (from .env)
  private robosmsApiKey = (process.env.ROBOSMS_API_KEY || '').trim();
  private robosmsEmail = (process.env.ROBOSMS_EMAIL || '').trim();
  private robosmsMask = (process.env.ROBOSMS_MASK || 'INFO SHARE').trim();

  constructor(
    private prisma: PrismaService,
    private locationSharingService: LocationSharingService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) {}

  /**
   * Reverse-geocodes coordinates into an exact and recognizable human location.
   * Prioritizes: Road/Landmark + Sector/Neighbourhood + City (e.g. "Kashmir Highway, Sector H-9, Islamabad")
   */
  private async reverseGeocodeLocation(lat: number, lng: number, fallbackAddress?: string): Promise<string> {
    if (fallbackAddress && fallbackAddress.trim().length > 3) {
      return fallbackAddress.trim();
    }

    const geoapifyKey = process.env.GEOAPIFY_API_KEY || '';
    if (geoapifyKey) {
      try {
        const response = await fetch(
          `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${geoapifyKey}`,
          { signal: AbortSignal.timeout(4000) }
        );
        const data = (await response.json()) as any;
        const props = data.features?.[0]?.properties;
        if (props) {
          const parts: string[] = [];
          const roadOrLandmark = props.street || props.name || props.road || props.address_line1;
          const area = props.suburb || props.district || props.neighbourhood || props.quarter;
          const city = props.city || props.town || props.village || props.county || props.state;

          if (roadOrLandmark) parts.push(roadOrLandmark);
          if (area && area !== roadOrLandmark) parts.push(area);
          if (city && city !== area) parts.push(city);

          if (parts.length > 0) {
            return parts.join(', ');
          }
          if (props.formatted) {
            return props.formatted;
          }
        }
      } catch (err: any) {
        this.logger.warn(`Geoapify reverse geocode failed: ${err.message}`);
      }
    }

    // Fallback to OpenStreetMap Nominatim
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: { 'User-Agent': 'ResQDrive-Emergency-Platform/1.0' },
          signal: AbortSignal.timeout(3000),
        }
      );
      const data = (await response.json()) as any;
      if (data && data.address) {
        const addr = data.address;
        const parts: string[] = [];
        const road = addr.road || addr.amenity || addr.building;
        const suburb = addr.suburb || addr.neighbourhood || addr.city_district || addr.subdivision;
        const city = addr.city || addr.town || addr.county || addr.state;
        if (road) parts.push(road);
        if (suburb && suburb !== road) parts.push(suburb);
        if (city && city !== suburb) parts.push(city);
        if (parts.length > 0) return parts.join(', ');
      }
    } catch (err: any) {
      this.logger.warn(`Nominatim fallback reverse geocode failed: ${err.message}`);
    }

    return `near ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  }

  // ─── RoboCall.pk: Place automated voice call ────────────────────────────
  private async placeRoboCall(
    phoneNumber: string,
    driverName: string,
    locationText: string,
  ): Promise<{ callId: string; callTo: string }> {
    const callerId = normalizePkPhone(phoneNumber);
    const url = `${ROBOCALL_BASE}/calls?api_key=${encodeURIComponent(this.robocallApiKey)}`
      + `&caller_id=${callerId}`
      + `&voice_id=${this.robocallVoiceId}`
      + `&amount=0`
      + `&key1=0&key2=0`
      + `&text1=${encodeURIComponent(driverName)}`
      + `&text2=${encodeURIComponent(locationText)}`
      + `&text3=ResQDrive&text4=0&text5=0`;

    const response = await fetch(url);
    const data = await response.json() as any;

    if (data.status !== 200) {
      throw new Error(`RoboCall API error: ${JSON.stringify(data)}`);
    }

    this.logger.log(`[ROBOCALL] Call placed to ${callerId}. Location: "${locationText}". Call ID: ${data.data?.call_id}`);
    return { callId: data.data?.call_id, callTo: callerId };
  }

  // ─── RoboSMS.pk: Send SMS ───────────────────────────────────────────────
  private async sendRoboSms(
    phoneNumber: string,
    message: string,
  ): Promise<{ messageId: string }> {
    const to = normalizePkPhone(phoneNumber);
    const url = `${ROBOSMS_BASE}/send-message?email=${encodeURIComponent(this.robosmsEmail)}`
      + `&key=${encodeURIComponent(this.robosmsApiKey)}`
      + `&mask=${encodeURIComponent(this.robosmsMask)}`
      + `&to=${to}`
      + `&message=${encodeURIComponent(message)}`
      + `&unicode=0`;

    const response = await fetch(url);
    const data = await response.json() as any;

    const rawCode = data.sms?.code ?? data.code;
    const isSuccess =
      data.status === 'success' ||
      rawCode === '000' ||
      rawCode === 200 ||
      rawCode === '200' ||
      rawCode === 100 ||
      rawCode === '100' ||
      rawCode === 102 ||
      rawCode === '102';

    if (!isSuccess) {
      throw new Error(`RoboSMS API error: ${JSON.stringify(data)}`);
    }

    const messageId = data.message_id || data.sms?.message_id || data.sms?.response || 'QUEUED';
    this.logger.log(`[ROBOSMS] SMS sent to ${to}. Message ID: ${messageId}`);
    return { messageId };
  }

  // ─── RoboCall.pk: Check account balance ─────────────────────────────────
  async checkRobocallBalance(): Promise<any> {
    const url = `${ROBOCALL_BASE}/check_balance?api_key=${encodeURIComponent(this.robocallApiKey)}`;
    const response = await fetch(url);
    return response.json();
  }

  // ─── RoboSMS.pk: Check account balance ──────────────────────────────────
  async checkRobosmsBalance(): Promise<any> {
    const url = `${ROBOSMS_BASE}/check-balance?key=${encodeURIComponent(this.robosmsApiKey)}`;
    const response = await fetch(url);
    return response.json();
  }

  private async getRealContacts(userId: string) {
    const contacts = await this.prisma.emergencyContact.findMany({
      where: { userId },
      orderBy: { priorityOrder: 'asc' },
    });
    if (contacts.length === 0) {
      throw new BadRequestException('No emergency contacts found for this user.');
    }
    return contacts;
  }

  async trigger(userId: string, dto: TriggerNotificationDto) {
    const activeSession = await this.prisma.notificationSession.findFirst({
      where: { userId, status: NotificationSessionStatus.ACTIVE },
    });
    if (activeSession) {
      throw new BadRequestException('You already have an active emergency notification session. Cancel it first.');
    }

    const contacts = await this.getRealContacts(userId);
    if (contacts.length === 0) {
      throw new BadRequestException('No emergency contacts found.');
    }

    let incidentId = dto.incidentId;
    if (incidentId) {
      const incident = await this.prisma.incident.findFirst({
        where: { id: incidentId, userId, isDeleted: false },
      });
      if (!incident) throw new NotFoundException('Incident not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, phoneNumber: true, email: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const shareToken = generateShareToken();
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);
    const nextEscalationAt = new Date(Date.now() + ESCALATION_INTERVAL_MS);

    let locationSessionId: string | null = null;
    try {
      const locSession = await this.locationSharingService.startSession(userId, incidentId);
      locationSessionId = locSession.sessionId;
    } catch (err: any) {
      this.logger.warn(`Could not start location session: ${err.message}`);
    }

    const session = await this.prisma.notificationSession.create({
      data: {
        userId,
        incidentId: incidentId || null,
        locationSessionId,
        shareToken,
        status: NotificationSessionStatus.ACTIVE,
        triggeredAt: new Date(),
        currentPriority: 1,
        nextEscalationAt,
        expiresAt,
      },
      include: { attempts: true },
    });

    const firstContact = contacts.find((c) => c.priorityOrder === 1) || contacts[0];
    await this.dispatchToContact(session.id, firstContact, user, dto, session.shareToken);

    this.logger.log(`Emergency notification triggered for user ${userId}. Session ${session.id}. First contact: ${firstContact.name}`);

    return {
      sessionId: session.id,
      shareToken: session.shareToken,
      acknowledgeUrl: `/acknowledge.html?session=${session.shareToken}`,
      triggeredAt: session.triggeredAt,
      currentPriority: 1,
      totalContacts: contacts.length,
      contactName: firstContact.name,
      contactPhone: firstContact.phoneNumber,
      nextEscalationAt,
      locationSessionId,
    };
  }

  async cancel(userId: string, sessionId: string) {
    const session = await this.prisma.notificationSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== NotificationSessionStatus.ACTIVE) {
      throw new BadRequestException(`Session is already ${session.status}`);
    }

    const updated = await this.prisma.notificationSession.update({
      where: { id: sessionId },
      data: {
        status: NotificationSessionStatus.CANCELLED,
        cancelledAt: new Date(),
        nextEscalationAt: null,
      },
    });

    if (session.locationSessionId) {
      try {
        await this.locationSharingService.stopSession(userId, session.locationSessionId);
      } catch (err: any) {
        this.logger.warn(`Could not stop location session: ${err.message}`);
      }
    }

    this.logger.log(`Emergency notification ${sessionId} cancelled by user`);

    try {
      await this.notificationsService.send(
        userId,
        NotificationCategory.false_alarm_log,
        '⚠️ Alert Cancelled (False Alarm Logged)',
        'Emergency alert was cancelled by user. Emergency contacts notified of safety.',
        { sessionId }
      );
    } catch (err: any) {
      this.logger.warn(`Could not dispatch false alarm log notification: ${err.message}`);
    }

    return { sessionId: updated.id, status: updated.status, cancelledAt: updated.cancelledAt };
  }

  async acknowledge(shareToken: string, acknowledgerName: string) {
    const session = await this.prisma.notificationSession.findUnique({
      where: { shareToken },
      include: { attempts: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== NotificationSessionStatus.ACTIVE) {
      throw new BadRequestException(`Session is already ${session.status}`);
    }

    const now = new Date();
    if (now > session.expiresAt) {
      await this.prisma.notificationSession.update({
        where: { id: session.id },
        data: { status: NotificationSessionStatus.EXPIRED, nextEscalationAt: null },
      });
      throw new BadRequestException('Session has expired');
    }

    await this.prisma.$transaction([
      this.prisma.notificationSession.update({
        where: { id: session.id },
        data: {
          status: NotificationSessionStatus.ACKNOWLEDGED,
          acknowledgedAt: now,
          acknowledgedBy: acknowledgerName,
          nextEscalationAt: null,
        },
      }),
      this.prisma.notificationAttempt.updateMany({
        where: { sessionId: session.id, status: NotificationAttemptStatus.SENT },
        data: { status: NotificationAttemptStatus.ACKNOWLEDGED, acknowledgedAt: now },
      }),
    ]);

    this.logger.log(`Session ${session.id} acknowledged by ${acknowledgerName}`);

    try {
      await this.notificationsService.send(
        session.userId,
        NotificationCategory.alert_delivery_confirmation,
        '🛡️ Emergency Alert Acknowledged',
        `Your emergency alert was acknowledged by ${acknowledgerName}.`,
        { sessionId: session.id, acknowledgedBy: acknowledgerName }
      );
    } catch (err: any) {
      this.logger.warn(`Could not dispatch delivery confirmation notification: ${err.message}`);
    }

    return {
      sessionId: session.id,
      status: NotificationSessionStatus.ACKNOWLEDGED,
      acknowledgedAt: now,
      acknowledgedBy: acknowledgerName,
    };
  }

  async getStatus(userId: string) {
    const session = await this.prisma.notificationSession.findFirst({
      where: { userId, status: NotificationSessionStatus.ACTIVE },
      include: {
        attempts: {
          orderBy: { priorityOrder: 'asc' },
        },
      },
    });
    if (!session) return { active: false };

    return {
      active: true,
      sessionId: session.id,
      shareToken: session.shareToken,
      acknowledgeUrl: `/acknowledge.html?session=${session.shareToken}`,
      triggeredAt: session.triggeredAt,
      currentPriority: session.currentPriority,
      nextEscalationAt: session.nextEscalationAt,
      expiresAt: session.expiresAt,
      attempts: session.attempts.map((a) => ({
        contactName: a.contactName,
        contactPhone: a.contactPhone,
        priorityOrder: a.priorityOrder,
        channel: a.channel,
        status: a.status,
        dispatchedAt: a.dispatchedAt,
      })),
    };
  }

  async getPublicSession(shareToken: string) {
    const session = await this.prisma.notificationSession.findUnique({
      where: { shareToken },
      include: {
        user: {
          select: { id: true, fullName: true, phoneNumber: true },
        },
        incident: {
          select: { id: true, severity: true, occurredAt: true, address: true, description: true },
        },
        locationSession: {
          select: { id: true, shareToken: true, status: true, lastLat: true, lastLng: true },
        },
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    const now = new Date();
    let status = session.status;
    if (status === NotificationSessionStatus.ACTIVE && now > session.expiresAt) {
      await this.prisma.notificationSession.update({
        where: { id: session.id },
        data: { status: NotificationSessionStatus.EXPIRED, nextEscalationAt: null },
      });
      status = NotificationSessionStatus.EXPIRED;
    }

    return {
      sessionId: session.id,
      status,
      triggeredAt: session.triggeredAt,
      acknowledgedAt: session.acknowledgedAt,
      acknowledgedBy: session.acknowledgedBy,
      user: session.user,
      incident: session.incident,
      locationSession: session.locationSession
        ? {
            shareToken: session.locationSession.shareToken,
            trackUrl: `/track.html?session=${session.locationSession.shareToken}`,
            lastLat: session.locationSession.lastLat,
            lastLng: session.locationSession.lastLng,
          }
        : null,
    };
  }

  async processEscalations() {
    const now = new Date();
    const dueSessions = await this.prisma.notificationSession.findMany({
      where: {
        status: NotificationSessionStatus.ACTIVE,
        nextEscalationAt: { lte: now },
      },
      include: {
        user: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
        incident: { select: { latitude: true, longitude: true, address: true } },
        locationSession: { select: { lastLat: true, lastLng: true } },
      },
    });

    for (const session of dueSessions) {
      try {
        if (now > session.expiresAt) {
          await this.prisma.notificationSession.update({
            where: { id: session.id },
            data: { status: NotificationSessionStatus.EXPIRED, nextEscalationAt: null },
          });
          this.logger.log(`Session ${session.id} expired`);
          continue;
        }

        const contacts = await this.getRealContacts(session.userId);
        const nextPriority = session.currentPriority + 1;
        const nextContact = contacts.find((c) => c.priorityOrder === nextPriority);

        if (!nextContact) {
          await this.prisma.notificationSession.update({
            where: { id: session.id },
            data: { status: NotificationSessionStatus.EXHAUSTED, nextEscalationAt: null },
          });
          this.logger.log(`Session ${session.id} exhausted all contacts`);
          continue;
        }

        // Atomically lock session priority to prevent race conditions from concurrent ticks
        const lockResult = await this.prisma.notificationSession.updateMany({
          where: {
            id: session.id,
            status: NotificationSessionStatus.ACTIVE,
            currentPriority: session.currentPriority,
          },
          data: {
            currentPriority: nextPriority,
            nextEscalationAt: new Date(Date.now() + ESCALATION_INTERVAL_MS),
          },
        });

        if (lockResult.count === 0) {
          // Another tick already locked/escalated this session
          continue;
        }

        const lat = session.incident?.latitude ?? session.locationSession?.lastLat ?? 33.6844;
        const lng = session.incident?.longitude ?? session.locationSession?.lastLng ?? 73.0479;
        const address = session.incident?.address;

        await this.dispatchToContact(
          session.id,
          nextContact,
          session.user,
          { latitude: lat, longitude: lng, address } as TriggerNotificationDto,
          session.shareToken,
        );

        this.logger.log(`Session ${session.id} escalated to priority ${nextPriority} (${nextContact.name})`);
      } catch (err: any) {
        this.logger.error(`Escalation failed for session ${session.id}: ${err.message}`);
      }
    }
  }

  // ─── Core dispatch: RoboCall (voice) + RoboSMS (sms) + Email + Push ─────
  private async dispatchToContact(
    sessionId: string,
    contact: any,
    user: any,
    dto: TriggerNotificationDto,
    shareToken?: string,
  ) {
    const lat = dto.latitude || 33.6844;
    const lng = dto.longitude || 73.0479;
    const locationDescription = await this.reverseGeocodeLocation(lat, lng, dto.address);
    const backendBase = (process.env.BACKEND_URL || 'https://resqdrive.live').replace(/\/$/, '');
    const ackLink = shareToken ? `${backendBase}/acknowledge.html?session=${shareToken}` : `https://www.google.com/maps?q=${lat},${lng}`;
    const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;

    // ─── PHONE CALL via RoboCall.pk (priority 1 only) ─────────────────────
    if (contact.priorityOrder === 1) {
      try {
        const result = await this.placeRoboCall(
          contact.phoneNumber,
          user.fullName || 'Unknown Driver',
          locationDescription,
        );
        this.logger.log(`[PHONE_CALL] RoboCall placed to ${contact.name} (${contact.phoneNumber}). CallID: ${result.callId}`);

        await this.prisma.notificationAttempt.create({
          data: {
            sessionId,
            contactName: contact.name,
            contactPhone: contact.phoneNumber,
            contactEmail: contact.email || null,
            priorityOrder: contact.priorityOrder,
            channel: NotificationChannel.PHONE_CALL,
            status: NotificationAttemptStatus.SENT,
            dispatchedAt: new Date(),
          },
        });
      } catch (err: any) {
        this.logger.error(`[PHONE_CALL] RoboCall failed for ${contact.name}: ${err.message}`);
        await this.prisma.notificationAttempt.create({
          data: {
            sessionId,
            contactName: contact.name,
            contactPhone: contact.phoneNumber,
            contactEmail: contact.email || null,
            priorityOrder: contact.priorityOrder,
            channel: NotificationChannel.PHONE_CALL,
            status: NotificationAttemptStatus.FAILED,
            dispatchedAt: new Date(),
          },
        });
      }
    }

    // ─── SMS via RoboSMS.pk (Strictly capped at 160 chars / 1 SMS credit, pure GSM text) ─────
    try {
      // Deduplication: Avoid wasting credits if this exact phone number was already sent an SMS in this session
      const alreadySent = await this.prisma.notificationAttempt.findFirst({
        where: {
          sessionId,
          contactPhone: contact.phoneNumber,
          channel: NotificationChannel.SMS,
          status: NotificationAttemptStatus.SENT,
        },
      });

      if (alreadySent) {
        this.logger.log(
          `[SMS] Skipping redundant SMS for ${contact.name} (${contact.phoneNumber}): phone number already received an SMS in session ${sessionId}.`,
        );
      } else {
        const cleanName = (user.fullName || 'Driver').replace(/[^\x20-\x7E]/g, '').trim();
        const cleanLoc = (locationDescription || 'unknown area').replace(/[^\x20-\x7E]/g, '').trim();
        
        // Use clean Google Maps link for SMS to prevent telecom firewalls from blocking ngrok domains
        const smsMapLink = `https://maps.google.com/?q=${lat.toFixed(4)},${lng.toFixed(4)}`;
        const prefix = `ResQDrive ALERT: ${cleanName} crash near `;
        const suffix = ` Map: ${smsMapLink}`;
        const maxLocLen = Math.max(10, 160 - (prefix.length + suffix.length));
        const truncatedLoc = cleanLoc.length > maxLocLen ? cleanLoc.substring(0, maxLocLen - 3) + '...' : cleanLoc;
        
        let smsMessage = `${prefix}${truncatedLoc}.${suffix}`;
        if (smsMessage.length > 160) {
          smsMessage = smsMessage.substring(0, 160);
        }

        const smsResult = await this.sendRoboSms(contact.phoneNumber, smsMessage);
        this.logger.log(`[SMS] RoboSMS sent to ${contact.name} (${contact.phoneNumber}). Length: ${smsMessage.length}/160. ID: ${smsResult.messageId}`);

        await this.prisma.notificationAttempt.create({
          data: {
            sessionId,
            contactName: contact.name,
            contactPhone: contact.phoneNumber,
            contactEmail: contact.email || null,
            priorityOrder: contact.priorityOrder,
            channel: NotificationChannel.SMS,
            status: NotificationAttemptStatus.SENT,
            dispatchedAt: new Date(),
          },
        });
      }
    } catch (err: any) {
      this.logger.error(`[SMS] RoboSMS failed for ${contact.name}: ${err.message}`);
      await this.prisma.notificationAttempt.create({
        data: {
          sessionId,
          contactName: contact.name,
          contactPhone: contact.phoneNumber,
          contactEmail: contact.email || null,
          priorityOrder: contact.priorityOrder,
          channel: NotificationChannel.SMS,
          status: NotificationAttemptStatus.FAILED,
          dispatchedAt: new Date(),
        },
      });
    }

    // ─── EMAIL via existing EmailService ──────────────────────────────────
    if (contact.email) {
      try {
        await this.emailService.sendEmergencyAlertEmail(
          contact.email,
          contact.name,
          user.fullName || 'Unknown Driver',
          `${mapsLink} (Near: ${locationDescription})`,
        );
        this.logger.log(`[EMAIL] Sent to ${contact.name} (${contact.email})`);

        await this.prisma.notificationAttempt.create({
          data: {
            sessionId,
            contactName: contact.name,
            contactPhone: contact.phoneNumber,
            contactEmail: contact.email || null,
            priorityOrder: contact.priorityOrder,
            channel: NotificationChannel.EMAIL,
            status: NotificationAttemptStatus.SENT,
            dispatchedAt: new Date(),
          },
        });
      } catch (err: any) {
        this.logger.error(`[EMAIL] Failed for ${contact.name}: ${err.message}`);
      }
    }

    // ─── PUSH via existing NotificationsService ──────────────────────────
    try {
      await this.notificationsService.send(
        contact.userId || sessionId,
        NotificationCategory.general,
        '🚨 ResQDrive Emergency Alert',
        `${user.fullName || 'Unknown'} may have been in an accident near ${locationDescription}. Tap to view location.`,
        { mapsLink, lat, lng, locationDescription }
      );
      this.logger.log(`[PUSH] Push notification sent for session ${sessionId}`);

      await this.prisma.notificationAttempt.create({
        data: {
          sessionId,
          contactName: contact.name,
          contactPhone: contact.phoneNumber,
          contactEmail: contact.email || null,
          priorityOrder: contact.priorityOrder,
          channel: NotificationChannel.PUSH,
          status: NotificationAttemptStatus.SENT,
          dispatchedAt: new Date(),
        },
      });
    } catch (err: any) {
      this.logger.warn(`[PUSH] Push notification failed: ${err.message}`);
    }
  }
}