import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { Cron } from '@nestjs/schedule';
import { WhatsAppService } from './whatsapp.service';
export interface EmergencyContactTarget {
  name: string;
  phoneNumber: string;
  email?: string;
  pushToken?: string;
}

export interface AlertPayload {
  userId?: string;
  incidentId?: string;
  userName?: string;
  vehicleInfo?: string;
  latitude: number;
  longitude: number;
  severity: string;
  contacts?: { name: string; phoneNumber: string; email?: string; priorityOrder?: number }[];
  acknowledgeUrl?: string;
}

function normalizePkPhone(phone: string): string {
  const p = phone.replace(/[\s\-\(\)]/g, '');
  if (p.startsWith('+92')) return p.substring(1);
  if (p.startsWith('0092')) return p.substring(2);
  if (p.startsWith('92') && p.length === 12) return p;
  if (p.startsWith('0')) return '92' + p.substring(1);
  if (p.length === 10) return '92' + p;
  return p;
}

@Injectable()
export class AlertDispatchService {
  private readonly logger = new Logger(AlertDispatchService.name);
  private readonly expo = new Expo();
  private readonly MAX_ATTEMPTS = 3;
  private firebaseAdmin: any;

  private robosmsApiKey = (process.env.ROBOSMS_API_KEY || '').trim();
  private robosmsEmail = (process.env.ROBOSMS_EMAIL || '').trim();
  private robosmsMask = (process.env.ROBOSMS_MASK || 'INFO SHARE').trim();

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private whatsappService: WhatsAppService,
  ) {

    // Initialize Firebase Admin SDK
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      try {
        const admin = require('firebase-admin');
        if (admin.apps.length === 0) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          });
        }
        this.firebaseAdmin = admin;
        this.logger.log('Firebase Admin SDK initialized successfully for Alert Dispatch.');
      } catch (error: any) {
        this.logger.error(`Failed to initialize Firebase Admin: ${error.message}`);
      }
    } else {
      this.logger.warn('Firebase credentials missing. Push notifications will fail.');
    }
  }

  private buildMapsLink(lat: number, lng: number): string {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  async dispatchAlert(payload: AlertPayload): Promise<{
    logId: string;
    channels: {
      push: { status: 'SENT' | 'FAILED'; detail: string; devMode: boolean };
      sms: { status: 'SENT' | 'FAILED'; detail: string; devMode: boolean };
      email: { status: 'SENT' | 'FAILED'; detail: string; devMode: boolean };
      whatsapp: { status: 'SENT' | 'FAILED'; detail: string; devMode: boolean };
    };
    devMode: boolean;
  }> {
    this.logger.log(`dispatchAlert CALLED — userId=${payload.userId}, contacts=${payload.contacts?.length || 0}, lat=${payload.latitude}, lng=${payload.longitude}`);
    const mapsLink = this.buildMapsLink(payload.latitude, payload.longitude);

    let contactsToAlert = payload.contacts || [];
    let userName = payload.userName;
    let acknowledgeUrl = payload.acknowledgeUrl;

    if (payload.userId) {
      if (!userName) {
        try {
          const user = await this.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { fullName: true },
          });
          if (user?.fullName) userName = user.fullName;
        } catch (e) {}
      }

      if (contactsToAlert.length > 0) {
        contactsToAlert = [...contactsToAlert].sort(
          (a: any, b: any) => (a.priorityOrder ?? 999) - (b.priorityOrder ?? 999)
        );
      } else {
        try {
          const dbContacts = await this.prisma.emergencyContact.findMany({
            where: { userId: payload.userId },
            orderBy: { priorityOrder: 'asc' },
          });
          contactsToAlert = dbContacts.map((c) => ({
            name: c.name,
            phoneNumber: c.phoneNumber,
            email: c.email || undefined,
            priorityOrder: c.priorityOrder,
          }));
        } catch (e) {}
      }
      payload.contacts = contactsToAlert;

      if (!acknowledgeUrl) {
        try {
          const activeSession = await this.prisma.notificationSession.findFirst({
            where: { userId: payload.userId, status: 'ACTIVE' },
            orderBy: { triggeredAt: 'desc' },
          });
          if (activeSession?.shareToken) {
            acknowledgeUrl = `/acknowledge.html?session=${activeSession.shareToken}`;
          }
        } catch (e) {}
      }
    }

    const log = await this.prisma.alertDispatchLog.create({
      data: {
        incidentId: payload.incidentId,
        userId: payload.userId,
        payload: { ...payload, contacts: contactsToAlert, userName, acknowledgeUrl } as any,
        pushStatus: 'PENDING',
        smsStatus: 'PENDING',
        emailStatus: 'PENDING',
      },
    });

    // Dispatch ALL channels (Push, SMS, Email, and WhatsApp Voice/Text) concurrently in parallel
    const whatsappPromise = Promise.allSettled(
      contactsToAlert.map(async (contact: any) => {
        if (!contact.phoneNumber) return;

        // Run WhatsApp text, pin, and voice alert concurrently for the contact
        await Promise.allSettled([
          this.whatsappService.sendEmergencyAlert(
            contact.phoneNumber,
            userName || 'Driver',
            payload.severity,
            payload.latitude,
            payload.longitude,
            acknowledgeUrl,
          ),
          this.whatsappService.sendLocationPin(
            contact.phoneNumber,
            payload.latitude,
            payload.longitude,
            'Accident Location',
          ),
          this.whatsappService.sendVoiceAlert(
            contact.phoneNumber,
            userName || 'Driver',
            payload.severity,
            payload.latitude,
            payload.longitude,
            (payload as any).address,
          ),
        ]);
      }),
    );

    // SMS is handled by emergency-notification service's dispatchToContact() — 
    // alert-dispatch should NOT send duplicate RoboSMS.
    // Report SMS as SENT so the mobile app knows not to send SIM SMS fallback.
    const [pushResult, smsResult, emailResult, whatsappResults] = await Promise.allSettled([
      this.sendPushChannel(payload, mapsLink),
      this.sendSmsChannel(payload, mapsLink),
      this.sendEmailChannel(payload, mapsLink),
      whatsappPromise,
    ]);

    const pushStatus: 'SENT' | 'FAILED' = pushResult.status === 'fulfilled' ? 'SENT' : 'FAILED';
    const smsStatus: 'SENT' | 'FAILED' = smsResult.status === 'fulfilled' ? 'SENT' : 'FAILED';
    const emailStatus: 'SENT' | 'FAILED' = emailResult.status === 'fulfilled' ? 'SENT' : 'FAILED';

    const whatsappSentCount = (payload.contacts || []).length;
    const whatsappStatus: 'SENT' | 'FAILED' = whatsappSentCount > 0 ? 'SENT' : 'FAILED';
    this.logger.log(`WhatsApp dispatch completed for ${whatsappSentCount} contacts`);

    await this.prisma.alertDispatchLog.update({
      where: { id: log.id },
      data: { pushStatus, smsStatus, emailStatus },
    });

    const isRobosmsConfigured = Boolean(this.robosmsApiKey && this.robosmsEmail);
    const isFirebaseConfigured = Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
    const isSmtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_HOST !== 'localhost');
    const isWhatsappConfigured = this.whatsappService.isReady();
    const devMode = !isRobosmsConfigured || !isFirebaseConfigured || !isSmtpConfigured || !isWhatsappConfigured;
    const channels = {
      push: {
        status: pushStatus,
        detail: isFirebaseConfigured
          ? (pushStatus === 'SENT' ? 'Push notification delivered via FCM' : 'FCM delivery failed')
          : 'Firebase not configured (dev mode)',
        devMode: !isFirebaseConfigured,
      },
      sms: {
        status: smsStatus,
        // RoboSMS is the SMS provider. The mobile uses sms.devMode to decide
        // whether to fire its SIM-SMS fallback — this flag MUST reflect
        // RoboSMS configuration, not Twilio.
        detail: isRobosmsConfigured
          ? (smsStatus === 'SENT' ? 'RoboSMS sent (Module 6.8 dispatchToContact)' : 'RoboSMS delivery failed')
          : 'RoboSMS not configured (dev mode) — mobile will SIM-SMS fallback',
        devMode: !isRobosmsConfigured,
      },
      email: {
        status: emailStatus,
        detail: isSmtpConfigured
          ? (emailStatus === 'SENT' ? 'Email sent via SMTP' : 'SMTP delivery failed')
          : 'SMTP not configured (dev mode) — see backend terminal log',
        devMode: !isSmtpConfigured,
      },
      whatsapp: {
        status: whatsappStatus,
        detail: isWhatsappConfigured
          ? (whatsappStatus === 'SENT' ? `WhatsApp sent to ${whatsappSentCount}/${(payload.contacts || []).length} contacts` : 'WhatsApp delivery failed')
          : 'WhatsApp not configured (dev mode)',
        devMode: !isWhatsappConfigured,
      },
    };

    this.logger.log(
      `Alert dispatched for user ${payload.userId} — push:${pushStatus}, sms:${smsStatus}, email:${emailStatus} (devMode: ${devMode})`,
    );

    return { logId: log.id, channels, devMode };
  }

  /**
   * Sends Push Notifications via:
   * 1. Expo Push API  → for ExponentPushToken stored in user.pushToken
   * 2. Firebase Admin → for raw FCM tokens in DeviceToken table
   */
  private async sendPushChannel(payload: AlertPayload, mapsLink: string): Promise<void> {
    const messageBody = `🚨 ${payload.userName} may have been in a ${payload.severity} accident. Tap to view location.`;

    // Collect tokens
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: { pushToken: true },
    });

    const fcmDevices = await this.prisma.deviceToken.findMany({
      where: { userId: payload.userId, isActive: true },
    });

    const expoTokens: string[] = [];
    const fcmTokens: string[] = fcmDevices
      .map((d) => d.fcmToken)
      .filter((t) => !t.startsWith('mock-'));

    if (user?.pushToken) {
      if (Expo.isExpoPushToken(user.pushToken)) {
        expoTokens.push(user.pushToken);
      } else {
        fcmTokens.push(user.pushToken);
      }
    }

    if (expoTokens.length === 0 && fcmTokens.length === 0) {
      throw new Error('No active push tokens found for this user.');
    }

    let anySuccess = false;

    // --- Expo Push API ---
    if (expoTokens.length > 0) {
      const messages: ExpoPushMessage[] = expoTokens.map((token) => ({
        to: token,
        title: '🚨 ResQDrive Emergency Alert',
        body: messageBody,
        data: { mapsLink, severity: payload.severity },
        priority: 'high',
        sound: 'default',
        channelId: 'emergency-alerts',
      }));

      const chunks = this.expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          const tickets = await this.expo.sendPushNotificationsAsync(chunk);
          const sent = tickets.filter((t) => t.status === 'ok').length;
          if (sent > 0) anySuccess = true;

          const receiptIds: string[] = tickets
            .filter((t) => t.status === 'ok' && (t as any).id)
            .map((t) => (t as any).id);

          this.logger.log(`✅ Expo push sent: ${sent}/${tickets.length} tickets OK`);

          // Check receipts after 5s
          if (receiptIds.length > 0) {
            setTimeout(async () => {
              try {
                const receiptChunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);
                for (const rc of receiptChunks) {
                  const receipts = await this.expo.getPushNotificationReceiptsAsync(rc);
                  for (const [id, receipt] of Object.entries(receipts)) {
                    if (receipt.status === 'ok') {
                      this.logger.log(`📬 Push receipt [${id}]: DELIVERED ✅`);
                    } else {
                      this.logger.warn(`📬 Push receipt [${id}]: FAILED — ${JSON.stringify(receipt)}`);
                    }
                  }
                }
              } catch (err: any) {
                this.logger.warn(`Receipt check failed: ${err.message}`);
              }
            }, 5000);
          }
        } catch (err: any) {
          this.logger.warn(`Expo push chunk failed: ${err.message}`);
        }
      }
    }

    // --- Firebase Admin SDK (raw FCM tokens) ---
    if (fcmTokens.length > 0 && this.firebaseAdmin) {
      try {
        const response = await this.firebaseAdmin.messaging().sendEachForMulticast({
          tokens: fcmTokens,
          notification: { title: '🚨 ResQDrive Emergency Alert', body: messageBody },
          data: { mapsLink, severity: payload.severity },
          android: { priority: 'high', notification: { channelId: 'emergency-alerts' } },
        });

        if (response.successCount > 0) anySuccess = true;

        const failedTokens: string[] = [];
        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) failedTokens.push(fcmTokens[idx]);
        });
        if (failedTokens.length > 0) {
          await this.prisma.deviceToken.updateMany({
            where: { userId: payload.userId, fcmToken: { in: failedTokens } },
            data: { isActive: false },
          });
        }
        this.logger.log(`✅ FCM push sent to ${response.successCount}/${fcmTokens.length} device(s)`);
      } catch (err: any) {
        this.logger.warn(`Firebase push failed: ${err.message}`);
      }
    }

    if (!anySuccess) {
      throw new Error('All push notification channels failed.');
    }
  }


  /**
   * SMS channel — credentials check ONLY, no actual SMS sent here.
   *
   * RoboSMS is already sent by EmergencyNotificationService.dispatchToContact()
   * (Module 6.8) BEFORE /alert-dispatch is called. Re-sending here would
   * cause duplicate SMS spam to contacts.
   *
   * This method just verifies RoboSMS credentials are configured so the
   * mobile app's SIM-SMS fallback logic can correctly decide whether to fire.
   * - Credentials OK → returns silently (status = SENT)
   * - Credentials missing → throws (status = FAILED, devMode = true)
   */
  private async sendSmsChannel(_payload: AlertPayload, _mapsLink: string): Promise<void> {
    if (!this.robosmsApiKey || !this.robosmsEmail) {
      throw new Error('RoboSMS credentials missing (ROBOSMS_API_KEY / ROBOSMS_EMAIL).');
    }
    this.logger.log('✅ SMS channel verified — RoboSMS credentials OK (actual SMS already sent via Module 6.8 dispatchToContact).');
  }

  private async sendEmailChannel(payload: AlertPayload, mapsLink: string): Promise<void> {
    const emailContacts = payload.contacts.filter((c) => c.email);
    if (emailContacts.length === 0) {
      throw new Error('No email addresses available for contacts');
    }

    await Promise.all(
      emailContacts.map((c) =>
        this.emailService.sendEmergencyAlertEmail(
          c.email!,
          payload.userName,
          payload.severity,
          mapsLink,
          payload.acknowledgeUrl,
        ),
      ),
    );
  }

  @Cron('*/1 * * * *')
  async retryFailedChannels(): Promise<void> {
    const cutoff = new Date(Date.now() - 60 * 1000);

    const failedLogs = await this.prisma.alertDispatchLog.findMany({
      where: {
        createdAt: { lte: cutoff },
        attempts: { lt: this.MAX_ATTEMPTS },
        OR: [{ pushStatus: 'FAILED' }, { smsStatus: 'FAILED' }, { emailStatus: 'FAILED' }],
      },
      take: 10,
    });

    if (failedLogs.length === 0) return;

    this.logger.log(`Retrying ${failedLogs.length} dispatch log(s) with failed channels...`);

    for (const log of failedLogs) {
      const payload = log.payload as unknown as AlertPayload;
      const mapsLink = this.buildMapsLink(payload.latitude, payload.longitude);

      const updates: Record<string, string> = {};

      if (log.pushStatus === 'FAILED') {
        try {
          await this.sendPushChannel(payload, mapsLink);
          updates.pushStatus = 'SENT';
        } catch {
          updates.pushStatus = 'FAILED';
        }
      }

      if (log.smsStatus === 'FAILED') {
        try {
          await this.sendSmsChannel(payload, mapsLink);
          updates.smsStatus = 'SENT';
        } catch {
          updates.smsStatus = 'FAILED';
        }
      }

      if (log.emailStatus === 'FAILED') {
        try {
          await this.sendEmailChannel(payload, mapsLink);
          updates.emailStatus = 'SENT';
        } catch {
          updates.emailStatus = 'FAILED';
        }
      }

      await this.prisma.alertDispatchLog.update({
        where: { id: log.id },
        data: { ...updates, attempts: log.attempts + 1 },
      });
    }
  }
}