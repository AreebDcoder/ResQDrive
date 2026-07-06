import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationChannel, NotificationSessionStatus, NotificationAttemptStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LocationSharingService } from '../location-sharing/location-sharing.service';
import { TriggerNotificationDto } from './dto/trigger-notification.dto';
import { generateShareToken } from './acknowledge-token.util';

const ESCALATION_INTERVAL_MS = 30 * 1000;
const SESSION_EXPIRY_MS = 30 * 60 * 1000;

interface TestContact {
  id: string;
  name: string;
  phoneNumber: string;
  email: string | null;
  priorityOrder: number;
}

@Injectable()
export class EmergencyNotificationService {
  private readonly logger = new Logger(EmergencyNotificationService.name);

  constructor(
    private prisma: PrismaService,
    private locationSharingService: LocationSharingService,
  ) {}

  private getTestContacts(): TestContact[] {
    this.logger.warn('Using hardcoded test contacts — EmergencyContact model not on this branch. Will use real contacts after team merge.');
    return [
      {
        id: 'test-contact-1',
        name: 'Test Contact (Primary)',
        phoneNumber: '+923000000001',
        email: 'test1@example.com',
        priorityOrder: 1,
      },
      {
        id: 'test-contact-2',
        name: 'Test Contact (Secondary)',
        phoneNumber: '+923000000002',
        email: 'test2@example.com',
        priorityOrder: 2,
      },
      {
        id: 'test-contact-3',
        name: 'Test Contact (Tertiary)',
        phoneNumber: '+923000000003',
        email: null,
        priorityOrder: 3,
      },
    ];
  }

  async trigger(userId: string, dto: TriggerNotificationDto) {
    const activeSession = await this.prisma.notificationSession.findFirst({
      where: { userId, status: NotificationSessionStatus.ACTIVE },
    });
    if (activeSession) {
      throw new BadRequestException('You already have an active emergency notification session. Cancel it first.');
    }

    const contacts = this.getTestContacts();
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
    await this.dispatchToContact(session.id, firstContact, user, dto);

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

        const contacts = this.getTestContacts();
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

        await this.dispatchToContact(session.id, nextContact, session.user, {} as TriggerNotificationDto);

        await this.prisma.notificationSession.update({
          where: { id: session.id },
          data: {
            currentPriority: nextPriority,
            nextEscalationAt: new Date(Date.now() + ESCALATION_INTERVAL_MS),
          },
        });

        this.logger.log(`Session ${session.id} escalated to priority ${nextPriority} (${nextContact.name})`);
      } catch (err: any) {
        this.logger.error(`Escalation failed for session ${session.id}: ${err.message}`);
      }
    }
  }

  private async dispatchToContact(
    sessionId: string,
    contact: TestContact,
    user: any,
    dto: TriggerNotificationDto,
  ) {
    const channels: NotificationChannel[] = [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.PUSH];
    if (contact.priorityOrder === 1) {
      channels.push(NotificationChannel.PHONE_CALL);
    }

    for (const channel of channels) {
      try {
        await this.prisma.notificationAttempt.create({
          data: {
            sessionId,
            contactName: contact.name,
            contactPhone: contact.phoneNumber,
            contactEmail: contact.email || null,
            priorityOrder: contact.priorityOrder,
            channel,
            status: NotificationAttemptStatus.SENT,
            dispatchedAt: new Date(),
          },
        });
        this.logger.log(`[${channel}] Alert dispatched to ${contact.name} (${contact.phoneNumber}) for session ${sessionId}`);
      } catch (err: any) {
        this.logger.error(`Failed to log ${channel} attempt: ${err.message}`);
      }
    }
  }
}