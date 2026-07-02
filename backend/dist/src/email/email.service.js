"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = require("nodemailer");
let EmailService = EmailService_1 = class EmailService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(EmailService_1.name);
        const host = this.configService.get('SMTP_HOST');
        const port = this.configService.get('SMTP_PORT');
        const user = this.configService.get('SMTP_USER');
        const pass = this.configService.get('SMTP_PASS');
        if (host && port) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: user && pass ? { user, pass } : undefined,
            });
        }
        else {
            this.logger.warn('SMTP settings are missing. Email service will run in log-only mode.');
        }
    }
    async sendVerificationEmail(email, fullName, token) {
        const verificationLink = `http://localhost:3000/auth/verify-email?token=${token}`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #d32f2f;">Welcome to ResQDrive, ${fullName}!</h2>
        <p>Thank you for registering. Please click the button below to verify your email address and activate your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #d32f2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p>If the button doesn't work, copy and paste the following link into your browser:</p>
        <p><a href="${verificationLink}">${verificationLink}</a></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777;">If you did not create this account, you can safely ignore this email.</p>
      </div>
    `;
        await this.sendMail(email, 'Verify Your ResQDrive Account', html);
    }
    async sendPasswordResetEmail(email, fullName, token) {
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
    async sendMail(to, subject, html) {
        const from = this.configService.get('SMTP_FROM') || 'noreply@resqdrive.com';
        if (this.transporter) {
            try {
                await this.transporter.sendMail({ from, to, subject, html });
                this.logger.log(`Email successfully sent to ${to} with subject: "${subject}"`);
            }
            catch (error) {
                this.logger.error(`Failed to send email to ${to}: ${error.message}`);
                this.logFallback(to, subject, html);
            }
        }
        else {
            this.logFallback(to, subject, html);
        }
    }
    logFallback(to, subject, html) {
        this.logger.log(`
=========================================
MOCK EMAIL SENT (LOG-ONLY MODE)
To: ${to}
Subject: ${subject}
Content: ${html.replace(/<[^>]*>/g, '').trim().substring(0, 300)}...
=========================================
`);
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map