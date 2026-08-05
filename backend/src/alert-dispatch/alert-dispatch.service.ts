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

@Injectable()
export class AlertDispatchService {
  private readonly logger = new Logger(AlertDispatchService.name);
  private readonly expo = new Expo();
  private readonly MAX_ATTEMPTS = 3;
  private twilioClient: any;
  private firebaseAdmin: any;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {
    // Initialize Twilio Client using require to avoid TS/CommonJS interop issues
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (accountSid && authToken) {
      const Twilio = require('twilio');
      this.twilioClient = Twilio(accountSid, authToken);
      this.logger.log('Twilio SMS client initialized successfully.');
    } else {
      this.logger.warn('Twilio credentials missing. SMS will fail.');
    }

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
   * Sends real SMS via Twilio silently from the backend server.
   */
  private async sendSmsChannel(payload: AlertPayload, mapsLink: string): Promise<void> {
    if (!this.twilioClient) {
      throw new Error('Twilio client is not initialized.');
    }

    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!twilioPhoneNumber) throw new Error('TWILIO_PHONE_NUMBER is missing in .env');

    const messageBody =
      `ResQDrive ALERT: ${payload.userName} may have been in a ${payload.severity} accident. ` +
      `Location: ${mapsLink}`;

    // Send SMS to all contacts in parallel
    const results = await Promise.allSettled(
      payload.contacts.map((c) =>
        this.twilioClient.messages.create({
          body: messageBody,
          from: twilioPhoneNumber,
          to: c.phoneNumber, // Must be E.164 format (e.g. +923001234567)
        }),
      ),
    );

    // If all SMS fail, throw an error so the system logs it as FAILED
    const anySuccess = results.some((r) => r.status === 'fulfilled');
    if (!anySuccess) {
      const failedReason = results[0].status === 'rejected' 
        ? (results[0] as any).reason?.message 
        : 'Unknown error';
      this.logger.error(`Twilio SMS delivery failed: ${failedReason}`);
      throw new Error(`Twilio SMS delivery failed: ${failedReason}`);
    }
    
    this.logger.log('✅ SMS successfully sent via Twilio!');
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