import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface WhatsAppMessageResult {
  status: 'SENT' | 'FAILED';
  messageId?: string;
  error?: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string;
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('WHATSAPP_API_URL') || 'https://graph.facebook.com/v18.0';
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '';
    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') || '';
    this.isConfigured = Boolean(this.phoneNumberId && this.accessToken);

    if (this.isConfigured) {
      this.logger.log('WhatsApp Cloud API configured successfully.');
    } else {
      this.logger.warn('WhatsApp Cloud API not configured. WhatsApp messages will fail.');
    }
  }

  isReady(): boolean {
    return this.isConfigured;
  }

  async sendEmergencyAlert(
    toPhoneNumber: string,
    userName: string,
    severity: string,
    latitude: number,
    longitude: number,
    acknowledgeUrl?: string,
  ): Promise<WhatsAppMessageResult> {
        // Convert relative acknowledge URL to full URL for WhatsApp clickability
    let fullAcknowledgeUrl = acknowledgeUrl;
    if (acknowledgeUrl && acknowledgeUrl.startsWith('/')) {
      const baseUrl = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
      fullAcknowledgeUrl = `${baseUrl}${acknowledgeUrl}`;
    }
    if (!this.isConfigured) {
      return { status: 'FAILED', error: 'WhatsApp not configured' };
    }

    const normalizedPhone = this.normalizePhoneNumber(toPhoneNumber);
    if (!normalizedPhone) {
      return { status: 'FAILED', error: `Invalid phone: ${toPhoneNumber}` };
    }

    const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const messageBody = `🚨 ResQDrive EMERGENCY ALERT\n\n${userName} may have been in a ${severity} accident.\n\nLocation:\n${mapsLink}\n\n${fullAcknowledgeUrl ? `Track live location:\n${fullAcknowledgeUrl}\n\n` : ''}Please respond immediately.`;

    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'text',
          text: { body: messageBody },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      const messageId = response.data?.messages?.[0]?.id;
      this.logger.log(`WhatsApp message sent to ${normalizedPhone}. Message ID: ${messageId}`);
      return { status: 'SENT', messageId };
    } catch (err: any) {
      const errorDetail = err?.response?.data?.error?.message || err.message;
      this.logger.error(`WhatsApp message failed for ${normalizedPhone}: ${errorDetail}`);
      return { status: 'FAILED', error: errorDetail };
    }
  }

  async sendLocationPin(
    toPhoneNumber: string,
    latitude: number,
    longitude: number,
    locationName?: string,
  ): Promise<WhatsAppMessageResult> {
    if (!this.isConfigured) {
      return { status: 'FAILED', error: 'WhatsApp not configured' };
    }

    const normalizedPhone = this.normalizePhoneNumber(toPhoneNumber);
    if (!normalizedPhone) {
      return { status: 'FAILED', error: `Invalid phone: ${toPhoneNumber}` };
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'location',
          location: {
            latitude,
            longitude,
            name: locationName || 'Accident Location',
            address: 'ResQDrive Emergency',
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      const messageId = response.data?.messages?.[0]?.id;
      this.logger.log(`WhatsApp location pin sent to ${normalizedPhone}. Message ID: ${messageId}`);
      return { status: 'SENT', messageId };
    } catch (err: any) {
      const errorDetail = err?.response?.data?.error?.message || err.message;
      this.logger.error(`WhatsApp location pin failed for ${normalizedPhone}: ${errorDetail}`);
      return { status: 'FAILED', error: errorDetail };
    }
  }

  private normalizePhoneNumber(phone: string): string | null {
    let cleaned = phone.replace(/[^0-9+]/g, '');
    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('00')) {
        cleaned = '+' + cleaned.slice(2);
      } else if (cleaned.startsWith('03')) {
        cleaned = '+92' + cleaned.slice(1);
      } else if (cleaned.startsWith('3')) {
        cleaned = '+92' + cleaned;
      } else if (cleaned.length === 10) {
        cleaned = '+92' + cleaned;
      } else {
        cleaned = '+' + cleaned;
      }
    }
    if (!/^\+\d{10,15}$/.test(cleaned)) {
      return null;
    }
    return cleaned;
  }
}