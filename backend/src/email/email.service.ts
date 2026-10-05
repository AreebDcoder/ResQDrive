import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly MAX_ATTEMPTS = 5;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && port) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
      });
    } else {
      this.logger.warn('SMTP settings are missing. Email service will run in log-only mode.');
    }
  }

  async sendVerificationEmail(email: string, fullName: string, tokenOrOtp: string): Promise<void> {
    this.logger.log(`Verification code for ${email}: ${tokenOrOtp}`);
    const verificationLink = `http://localhost:3000/auth/verify-email?token=${tokenOrOtp}`;
    this.logger.log(`Verification URL: ${verificationLink}`);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff; color: #1a1a2e;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #d32f2f; margin: 0; font-size: 26px;">ResQDrive</h1>
          <p style="color: #666; font-size: 14px; margin-top: 4px;">Emergency Assistance & Safety Platform</p>
        </div>
        
        <h2 style="color: #1a1a2e; font-size: 20px;">Welcome to ResQDrive, ${fullName}!</h2>
        <p style="color: #444; font-size: 15px; line-height: 1.5;">Thank you for creating an account. Enter the 6-digit verification code below in your mobile app to activate your account:</p>
        
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background-color: #f8f9fa; border: 2px dashed #d32f2f; padding: 16px 36px; border-radius: 10px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #d32f2f;">
            ${tokenOrOtp}
          </div>
        </div>

        <p style="color: #555; font-size: 14px; text-align: center;">Or click the button below to verify directly in your browser:</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${verificationLink}" style="background-color: #d32f2f; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">Verify Email Address</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">This code will expire in 24 hours. If you did not create this account, you can safely ignore this email.</p>
      </div>
    `;

    await this.sendMail(email, 'ResQDrive - Your 6-Digit Verification Code', html);
  }

  async sendPasswordResetEmail(email: string, fullName: string, token: string): Promise<void> {
    const resetLink = `http://localhost:3000/auth/reset-password?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #d32f2f;">ResQDrive Password Reset Request</h2>
        <p>Hello ${fullName},</p>
        <p>We received a request to reset your ResQDrive account password. Click the button below to proceed:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #d32f2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>Use the following token directly in the app if requested:</p>
        <div style="text-align: center; background-color: #f5f5f5; padding: 10px; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; border-radius: 4px;">
          ${token}
        </div>
        <p>If you did not request this, you can ignore this email. Your password will remain secure.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777;">This code will expire in 1 hour.</p>
      </div>
    `;

    await this.sendMail(email, 'Reset Your ResQDrive Password', html);
  }

  /**
   * Sends an emergency alert email immediately, or queues it for retry
   * if SMTP is unavailable. Throws if the email was only queued (not
   * actually delivered), so callers like AlertDispatchService correctly
   * treat this channel as failed rather than falsely succeeded.
   */
  /**
   * Sends an emergency alert email immediately, or queues it for retry
   * if SMTP is unavailable. Throws if the email was only queued (not
   * actually delivered), so callers like AlertDispatchService correctly
   * treat this channel as failed rather than falsely succeeded.
   */
  async sendEmergencyAlertEmail(
    email: string,
    userName: string,
    severity: string,
    mapsLink: string,
    acknowledgeUrl?: string,
  ): Promise<void> {
    const backendBase = (process.env.BACKEND_URL || 'https://resqdrive.live').replace(/\/$/, '');
    const fullAckLink = acknowledgeUrl
      ? (acknowledgeUrl.startsWith('http') ? acknowledgeUrl : `${backendBase}${acknowledgeUrl}`)
      : null;

    const acknowledgeButtonHtml = fullAckLink
      ? `<div style="margin: 12px 0;">
          <a href="${fullAckLink}" style="background-color: #d32f2f; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 15px; box-shadow: 0 2px 4px rgba(211,47,47,0.3);">🛡️ Track & Acknowledge Alert</a>
        </div>`
      : '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 2px solid #d32f2f; border-radius: 10px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #d32f2f; margin: 0 0 8px 0;">🚨 ResQDrive Emergency Alert</h2>
          <p style="color: #666666; font-size: 14px; margin: 0;">Automated Crash Detection & Dispatch</p>
        </div>

        <div style="background-color: #fff5f5; border-left: 4px solid #d32f2f; padding: 14px; margin-bottom: 20px; border-radius: 4px;">
          <p style="margin: 0; font-size: 16px; color: #111111;">
            <strong>${userName}</strong> may have been involved in a <strong style="color: #d32f2f; text-transform: uppercase;">${severity}</strong> accident.
          </p>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          ${acknowledgeButtonHtml}
          <div style="margin: 10px 0;">
            <a href="${mapsLink}" style="background-color: #333333; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">📍 View Google Maps Location</a>
          </div>
        </div>

        <hr style="border: none; border-top: 1px solid #eeeeee; margin: 24px 0;" />
        <p style="font-size: 13px; color: #777777; text-align: center; margin: 0;">
          Please respond immediately or contact emergency rescue services (Rescue 1122).
        </p>
      </div>
    `;

    const sent = await this.sendMail(email, `🚨 ResQDrive Emergency Alert - ${userName}`, html);
    if (!sent) {
      throw new Error('Email was queued, not delivered immediately');
    }
  }

  // ─── BATCH 5 — Workshop approval/rejection notifications ──────────────────

  /**
   * Sends "Your workshop has been approved" email to the mechanic.
   * Fired by AdminService.verifyWorkshop when isWorkshopVerified=true.
   */
  async sendWorkshopApprovedEmail(
    email: string,
    fullName: string,
    workshopName: string | null,
  ): Promise<void> {
    const workshopDisplay = workshopName ? `<strong>${workshopName}</strong>` : 'your workshop';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #10b981; border-radius: 8px;">
        <h2 style="color: #10b981;">ResQDrive Workshop Approved</h2>
        <p>Hello ${fullName},</p>
        <p>Great news! The admin team has approved ${workshopDisplay}. You are now a verified mechanic on the ResQDrive platform.</p>
        <p>Verified mechanics appear in the "Find Nearest Workshop" results shown to drivers after an incident, and can receive repair-cost assessment jobs.</p>
        <div style="background-color: #ecfdf5; padding: 12px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;">Status: <strong style="color: #10b981;">VERIFIED</strong></p>
        </div>
        <p>You can now log in to the mobile app and start receiving job assignments.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777;">If you have any questions, please contact the admin team at admin@resqdrive.com.</p>
      </div>
    `;

    // Workshop approval emails are non-critical — don't throw on queue-only
    await this.sendMail(email, 'ResQDrive Workshop Approved', html);
  }

  /**
   * Sends "Your workshop was rejected" email to the mechanic, including
   * the admin-provided reason and instructions on what to fix.
   * Fired by AdminService.rejectWorkshop.
   */
  async sendWorkshopRejectedEmail(
    email: string,
    fullName: string,
    workshopName: string | null,
    reason: string,
  ): Promise<void> {
    const workshopDisplay = workshopName ? `<strong>${workshopName}</strong>` : 'your workshop';
    // HTML-escape the reason to prevent XSS in email preview (nodemailer is safe but defense in depth)
    const safeReason = reason
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ef4444; border-radius: 8px;">
        <h2 style="color: #ef4444;">ResQDrive Workshop Verification — Action Needed</h2>
        <p>Hello ${fullName},</p>
        <p>The admin team reviewed ${workshopDisplay} and was unable to approve it at this time.</p>
        <div style="background-color: #fef2f2; padding: 12px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #ef4444;">Reason:</p>
          <p style="margin: 0; font-size: 14px; color: #374151; white-space: pre-wrap;">${safeReason}</p>
        </div>
        <p><strong>What to do next:</strong></p>
        <ol style="padding-left: 20px; line-height: 1.6;">
          <li>Address the issue described above.</li>
          <li>Log in to the ResQDrive mobile app.</li>
          <li>Update your workshop profile (name, address, specialization).</li>
          <li>Re-submit for verification — the admin team will review your updated profile.</li>
        </ol>
        <p>Your account is still active — you simply cannot receive workshop jobs until verification is complete.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777;">If you believe this is an error, please contact the admin team at admin@resqdrive.com.</p>
      </div>
    `;

    await this.sendMail(email, 'Action Needed: ResQDrive Workshop Verification', html);
  }

  /**
   * Attempts to send an email. Returns true if actually delivered via
   * SMTP, false if it was queued for retry instead (SMTP unavailable
   * or the send failed).
   */
  private async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    const from = this.configService.get<string>('SMTP_FROM') || 'noreply@resqdrive.com';

    if (this.transporter) {
      try {
        await this.transporter.sendMail({ from, to, subject, html });
        this.logger.log(`Email successfully sent to ${to} with subject: "${subject}"`);
        return true;
      } catch (error: any) {
        this.logger.error(`Failed to send email to ${to}: ${error.message}. Queuing for retry.`);
        await this.queueEmail(to, subject, html);
        this.logFallback(to, subject, html);
        return false;
      }
    } else {
      this.logger.warn(`No SMTP transporter configured. Queuing email to ${to} for retry.`);
      await this.queueEmail(to, subject, html);
      this.logFallback(to, subject, html);
      return false;
    }
  }

  private async queueEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.prisma.emailQueue.create({
        data: {
          to,
          subject,
          html,
          attempts: 0,
          status: 'PENDING',
        },
      });
    } catch (dbError: any) {
      this.logger.error(`Failed to queue email in database: ${dbError.message}`);
    }
  }

  @Cron('*/2 * * * *')
  async retryQueuedEmails(): Promise<void> {
    if (!this.transporter) {
      return;
    }

    const pending = await this.prisma.emailQueue.findMany({
      where: {
        status: 'PENDING',
        attempts: { lt: this.MAX_ATTEMPTS },
      },
      take: 20,
    });

    if (pending.length === 0) return;

    this.logger.log(`Retrying ${pending.length} queued email(s)...`);

    const from = this.configService.get<string>('SMTP_FROM') || 'noreply@resqdrive.com';

    for (const item of pending) {
      try {
        await this.transporter.sendMail({
          from,
          to: item.to,
          subject: item.subject,
          html: item.html,
        });
        await this.prisma.emailQueue.update({
          where: { id: item.id },
          data: { status: 'SENT', lastTriedAt: new Date() },
        });
        this.logger.log(`Queued email to ${item.to} sent successfully on retry.`);
      } catch (error: any) {
        const newAttempts = item.attempts + 1;
        await this.prisma.emailQueue.update({
          where: { id: item.id },
          data: {
            attempts: newAttempts,
            lastTriedAt: new Date(),
            status: newAttempts >= this.MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
          },
        });
        this.logger.warn(
          `Retry failed for queued email to ${item.to} (attempt ${newAttempts}/${this.MAX_ATTEMPTS}): ${error.message}`,
        );
      }
    }
  }

  private logFallback(to: string, subject: string, html: string): void {
    this.logger.log(`
=========================================
MOCK EMAIL SENT (LOG-ONLY MODE)
To: ${to}
Subject: ${subject}
Content: ${html.replace(/<[^>]*>/g, '').trim().substring(0, 300)}...
=========================================
`);
  }
}