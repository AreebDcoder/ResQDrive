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
    if (!this.isConfigured) {
      return { status: 'FAILED', error: 'WhatsApp not configured' };
    }

    const normalizedPhone = this.normalizePhoneNumber(toPhoneNumber);
    if (!normalizedPhone) {
      return { status: 'FAILED', error: `Invalid phone: ${toPhoneNumber}` };
    }

    // Convert relative acknowledge URL to full URL
    let fullAcknowledgeUrl = acknowledgeUrl;
    if (acknowledgeUrl && acknowledgeUrl.startsWith('/')) {
      const baseUrl = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
      fullAcknowledgeUrl = `${baseUrl}${acknowledgeUrl}`;
    }

    // Shorten the URL via is.gd (free, no API key) so WhatsApp linkifies it
    let shortUrl = fullAcknowledgeUrl;
    if (fullAcknowledgeUrl) {
      try {
        const shortenRes = await axios.get(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(fullAcknowledgeUrl)}`);
        if (shortenRes.status === 200 && shortenRes.data && shortenRes.data.startsWith('http')) {
          shortUrl = shortenRes.data.trim();
          this.logger.log(`URL shortened: ${fullAcknowledgeUrl} → ${shortUrl}`);
        }
      } catch (err: any) {
        this.logger.warn(`URL shortening failed, using original URL: ${err.message}`);
      }
    }

    const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

    // Send plain text message with URLs on their own lines (WhatsApp linkifies short URLs)
    const messageBody = `🚨 ResQDrive EMERGENCY ALERT

 ${userName} may have been in a ${severity} accident.

📍 Location:
 ${mapsLink}

🔗 Track Live Location:
 ${shortUrl}

Please respond immediately.`;

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
  async sendVoiceAlert(
    toPhoneNumber: string,
    userName: string,
    severity: string,
  ): Promise<WhatsAppMessageResult> {
    if (!this.isConfigured) {
      return { status: 'FAILED', error: 'WhatsApp not configured' };
    }

    const normalizedPhone = this.normalizePhoneNumber(toPhoneNumber);
    if (!normalizedPhone) {
      return { status: 'FAILED', error: `Invalid phone: ${toPhoneNumber}` };
    }

    // Translate severity to Urdu
    const severityUrdu: Record<string, string> = {
      severe: 'شدید',
      moderate: 'درمیانی',
      minor: 'معمولی',
      none: 'معمولی',
    };
    const urduSeverity = severityUrdu[severity.toLowerCase()] || 'شدید';

    // Build Urdu TTS text — dynamic user name + severity + location reference
    const urduText = `یہ ریسکیو ڈرائیو ایمرجنسی الرٹ ہے۔ ${userName} ${urduSeverity} حادثے کا شکار ہو سکتے ہیں۔ براہ کرم اس پیغام میں بھیجے گئے نقشے پر کلک کریں اور ان کی موجودہ لوکیشن دیکھیں۔ فوراً تصدیق کے لیے تصدیق بٹن دبائیں۔`;

    this.logger.log(`[Voice Alert] Generating Urdu TTS for: "${urduText.substring(0, 80)}..."`);

    try {
      // Step 1: Generate TTS audio via Google Translate (Urdu language: tl=ur)
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(urduText)}&tl=ur&client=tw-ob`;

      const audioResponse = await axios.get(ttsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        responseType: 'arraybuffer',
        timeout: 15000,
      });

      if (!audioResponse.data || audioResponse.data.length === 0) {
        throw new Error('TTS returned empty audio');
      }

      const audioBuffer = Buffer.from(audioResponse.data);
      this.logger.log(`[Voice Alert] Urdu TTS audio generated: ${audioBuffer.length} bytes`);

      // Step 2: Upload to Cloudinary (free tier — already configured)
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      const uploadResult = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'video',
            folder: 'emergency-voice-alerts',
            format: 'mp3',
          },
          (error: any, result: any) => {
            if (error) reject(error);
            else resolve(result);
          },
        );
        stream.end(audioBuffer);
      });

      const audioUrl = uploadResult.secure_url;
      this.logger.log(`[Voice Alert] Audio uploaded to Cloudinary: ${audioUrl}`);

      // Step 3: Send WhatsApp audio message
      const waResponse = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'audio',
          audio: { link: audioUrl },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      const messageId = waResponse.data?.messages?.[0]?.id;
      this.logger.log(`[Voice Alert] Urdu WhatsApp voice note sent to ${normalizedPhone}. Message ID: ${messageId}`);
      return { status: 'SENT', messageId };
    } catch (err: any) {
      const errorDetail = err?.response?.data?.error?.message || err.message;
      this.logger.error(`[Voice Alert] Failed for ${normalizedPhone}: ${errorDetail}`);
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