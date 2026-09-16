import { Controller, Post, Body, Get } from '@nestjs/common';
import { AlertDispatchService, AlertPayload } from './alert-dispatch.service';
import { DispatchAlertDto } from './dto/dispatch-alert.dto';

@Controller('alert-dispatch')
export class AlertDispatchController {
  constructor(private readonly service: AlertDispatchService) {}

  @Post()
  async dispatch(@Body() dto: DispatchAlertDto) {
    const payload: AlertPayload = {
      userId: dto.userId,
      incidentId: dto.incidentId,
      userName: dto.userName,
      vehicleInfo: dto.vehicleInfo,
      latitude: dto.latitude,
      longitude: dto.longitude,
      severity: dto.severity,
      contacts: dto.contacts,
    };
    return this.service.dispatchAlert(payload);
  }

  @Get('health')
  async health() {
    const isTwilioConfigured = Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER &&
      !process.env.TWILIO_ACCOUNT_SID.startsWith('AC0000'),
    );
    const isFirebaseConfigured = Boolean(
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
    );
    const isSmtpConfigured = Boolean(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_HOST !== 'localhost',
    );
    const isGeminiConfigured = Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('paste'));
    const isGoogleMapsConfigured = Boolean(process.env.GOOGLE_MAPS_API_KEY);

    return {
      devMode: !isTwilioConfigured || !isFirebaseConfigured || !isSmtpConfigured,
      channels: {
        push: { configured: isFirebaseConfigured, label: 'Firebase Admin SDK' },
        sms: { configured: isTwilioConfigured, label: 'Twilio' },
        email: { configured: isSmtpConfigured, label: 'SMTP (Brevo/Maildev)' },
      },
      services: {
        gemini: { configured: isGeminiConfigured, label: 'Repair Cost Estimation' },
        googleMaps: { configured: isGoogleMapsConfigured, label: 'Region Detection' },
      },
    };
  }
}