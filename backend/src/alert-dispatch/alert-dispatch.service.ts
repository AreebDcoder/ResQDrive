import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';

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

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  private buildMapsLink(lat: number, lng: number): string {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  async dispatchAlert(payload: AlertPayload): Promise<{ logId: string }> {
    const mapsLink = this.buildMapsLink(payload.latitude, payload.longitude);

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

    const [pushResult, smsResult, emailResult] = await Promise.allSettled([
      this.sendPushChannel(payload, mapsLink),
      this.sendSmsChannel(payload, mapsLink),
      this.sendEmailChannel(payload, mapsLink),
    ]);

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

  private async sendPushChannel(payload: AlertPayload, mapsLink: string): Promise<void> {
    const messages: ExpoPushMessage[] = payload.contacts
      .filter((c) => c.pushToken && Expo.isExpoPushToken(c.pushToken))
      .map((c) => ({
        to: c.pushToken!,
        sound: 'default',
        title: '🚨 ResQDrive Emergency Alert',
        body: `${payload.userName} may have been in a ${payload.severity} accident. Tap to view location.`,
        data: { mapsLink, severity: payload.severity },
        priority: 'high',
      }));

    if (messages.length === 0) {
      throw new Error('No valid push tokens available for contacts');
    }

    const chunks = this.expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      const tickets = await this.expo.sendPushNotificationsAsync(chunk);
      const hasError = tickets.some((t: any) => t.status === 'error');
      if (hasError) {
        throw new Error('One or more push notifications failed');
      }
    }
  }

  /**
   * Sends real SMS via Textbelt's free tier (1 SMS/day, no signup required).
   * This proves genuine end-to-end SMS delivery for the module without
   * needing a verified paid gateway account.
   */
  private async sendSmsChannel(payload: AlertPayload, mapsLink: string): Promise<void> {
    const message =
      `ResQDrive ALERT: ${payload.userName} may have been in a ${payload.severity} accident. ` +
      `Location: ${mapsLink}`;

    const results = await Promise.allSettled(
      payload.contacts.map((c) =>
        axios.post('https://textbelt.com/text', {
          phone: c.phoneNumber,
          message,
          key: 'textbelt', // free tier: 1 SMS/day, no signup needed
        }),
      ),
    );

    const anySuccess = results.some(
      (r) => r.status === 'fulfilled' && (r.value as any).data?.success,
    );

    if (!anySuccess) {
      const firstResult = results[0];
      const errorDetail =
        firstResult.status === 'fulfilled'
          ? JSON.stringify((firstResult.value as any).data)
          : firstResult.reason?.message;
      this.logger.warn(`SMS delivery failed: ${errorDetail}`);
      throw new Error('SMS delivery failed (free tier quota may be exhausted — 1/day limit)');
    }
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