import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { Cron } from '@nestjs/schedule';

export interface EmergencyContactTarget {
  name: string;
  phoneNumber: string;
  email?: string;
  pushToken?: string;
}

export interface AlertPayload {
  userId: string;
  incidentId?: string;
  userName: string;
  vehicleInfo?: string;
  latitude: number;
  longitude: number;
  severity: string;
  contacts: EmergencyContactTarget[];
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

  async dispatchAlert(payload: AlertPayload): Promise<{ logId: string }> {
    const mapsLink = this.buildMapsLink(payload.latitude, payload.longitude);

    // 1. Create the initial log
    const log = await this.prisma.alertDispatchLog.create({
      data: {
        incidentId: payload.incidentId,
        userId: payload.userId,
        payload: payload as any,
        pushStatus: 'PENDING',
        smsStatus: 'PENDING',
        emailStatus: 'PENDING',
      },
    });

    // PARALLEL EXECUTION: Fire Push, SMS, and Email at the exact same time
    const [pushResult, smsResult, emailResult] = await Promise.allSettled([
      this.sendPushChannel(payload, mapsLink),
      this.sendSmsChannel(payload, mapsLink),
      this.sendEmailChannel(payload, mapsLink),
    ]);

    // 5. Update the database log with final statuses
    await this.prisma.alertDispatchLog.update({
      where: { id: log.id },
      data: {
        pushStatus: pushResult.status === 'fulfilled' ? 'SENT' : 'FAILED',
        smsStatus: smsResult.status === 'fulfilled' ? 'SENT' : 'FAILED',
        emailStatus: emailResult.status === 'fulfilled' ? 'SENT' : 'FAILED',
      },
    });

    this.logger.log(
      `Alert dispatched for user ${payload.userId} — push:${pushResult.status}, sms:${smsResult.status}, email:${emailResult.status}`,
    );

    return { logId: log.id };
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
   * Sends real SMS via RoboSMS silently from the backend server.
   */
  private async sendSmsChannel(payload: AlertPayload, mapsLink: string): Promise<void> {
    if (!this.robosmsApiKey || !this.robosmsEmail) {
      throw new Error('RoboSMS credentials missing (ROBOSMS_API_KEY / ROBOSMS_EMAIL).');
    }

    const cleanName = (payload.userName || 'Driver').replace(/[^\x20-\x7E]/g, '').trim();
    const messageBody = `ResQDrive ALERT: ${cleanName} crash near Map: ${mapsLink}`.slice(0, 160);

    // Send SMS to all contacts in parallel
    const results = await Promise.allSettled(
      payload.contacts.map(async (c) => {
        const to = normalizePkPhone(c.phoneNumber);
        const url =
          `https://portal.robosms.pk/api/send-message?email=${encodeURIComponent(this.robosmsEmail)}` +
          `&key=${encodeURIComponent(this.robosmsApiKey)}` +
          `&mask=${encodeURIComponent(this.robosmsMask)}` +
          `&to=${to}` +
          `&message=${encodeURIComponent(messageBody)}` +
          `&unicode=0`;

        const res = await fetch(url);
        const data = (await res.json()) as any;
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
          throw new Error(`RoboSMS error: ${JSON.stringify(data)}`);
        }
        return data;
      }),
    );

    // If all SMS fail, throw an error so the system logs it as FAILED
    const anySuccess = results.some((r) => r.status === 'fulfilled');
    if (!anySuccess) {
      const failedReason =
        results[0].status === 'rejected'
          ? (results[0] as any).reason?.message
          : 'Unknown error';
      this.logger.error(`RoboSMS SMS delivery failed: ${failedReason}`);
      throw new Error(`RoboSMS SMS delivery failed: ${failedReason}`);
    }

    this.logger.log('✅ SMS successfully sent via RoboSMS!');
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