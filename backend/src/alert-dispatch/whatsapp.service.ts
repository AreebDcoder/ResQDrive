import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as os from 'os';

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

  private cleanLocationAddress(text?: string): string {
    if (!text) return '';
    return text
      .replace(/[A-Z0-9]{2,8}\+[A-Z0-9]{2,8}[,\s]*/gi, '') // Remove Google Plus Codes (e.g. JV59+82V)
      .replace(/,\s*,+/g, ', ')
      .replace(/^[\s,]+|[\s,]+$/g, '')
      .trim();
  }

  private isPlusCode(text?: string): boolean {
    if (!text) return false;
    return /^[A-Z0-9]{2,8}\+[A-Z0-9]{2,8}/i.test(text.trim());
  }

  private async getReverseGeocodedLocation(lat: number, lng: number): Promise<string> {
    try {
      const geoapifyKey = this.configService.get<string>('GEOAPIFY_API_KEY');
      if (geoapifyKey) {
        const res = await axios.get('https://api.geoapify.com/v1/geocode/reverse', {
          params: { lat, lon: lng, apiKey: geoapifyKey },
          timeout: 2500,
        });
        const props = res.data.features?.[0]?.properties;
        if (props) {
          const parts: string[] = [];
          const street = props.street || props.address_line1;
          if (street && !this.isPlusCode(street)) parts.push(street);
          if (props.suburb || props.district) parts.push(props.suburb || props.district);
          if (props.city && !parts.includes(props.city)) parts.push(props.city);

          if (parts.length > 0) {
            return this.cleanLocationAddress(parts.join(', '));
          }
          if (props.formatted) {
            const cleaned = this.cleanLocationAddress(props.formatted.split(',').slice(0, 3).join(', '));
            if (cleaned) return cleaned;
          }
        }
      }
    } catch (e) {}

    try {
      const osmRes = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: { lat, lon: lng, format: 'json' },
        headers: { 'User-Agent': 'ResQDrive-Emergency-Platform/1.0' },
        timeout: 2000,
      });
      if (osmRes.data?.address) {
        const addr = osmRes.data.address;
        const parts: string[] = [];
        const road = addr.road || addr.street;
        if (road && !this.isPlusCode(road)) parts.push(road);
        if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
        if (addr.village || addr.town || addr.city) parts.push(addr.village || addr.town || addr.city);
        if (parts.length > 0) {
          return this.cleanLocationAddress(parts.join(', '));
        }
      }
      if (osmRes.data?.display_name) {
        const cleaned = this.cleanLocationAddress(osmRes.data.display_name.split(',').slice(0, 3).join(', '));
        if (cleaned) return cleaned;
      }
    } catch (e) {}

    return `کوآرڈینیٹس ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  private async shortenUrl(targetUrl: string): Promise<string> {
    if (!targetUrl) return targetUrl;

    // 1. Try TinyURL (Supports local network IPs + ports and linkifies in WhatsApp)
    try {
      const res = await axios.get(
        `https://tinyurl.com/api-create.php?url=${encodeURIComponent(targetUrl)}`,
        { timeout: 3500 },
      );
      if (res.status === 200 && typeof res.data === 'string' && res.data.startsWith('http')) {
        const short = res.data.trim();
        this.logger.log(`URL shortened via TinyURL: ${targetUrl} → ${short}`);
        return short;
      }
    } catch (e) {}

    // 2. Try clck.ru
    try {
      const res = await axios.get(
        `https://clck.ru/--?url=${encodeURIComponent(targetUrl)}`,
        { timeout: 3000 },
      );
      if (res.status === 200 && typeof res.data === 'string' && res.data.startsWith('http')) {
        const short = res.data.trim();
        this.logger.log(`URL shortened via clck.ru: ${targetUrl} → ${short}`);
        return short;
      }
    } catch (e) {}

    // 3. Try da.gd
    try {
      const res = await axios.get(
        `https://da.gd/s?url=${encodeURIComponent(targetUrl)}`,
        { timeout: 3000 },
      );
      if (res.status === 200 && typeof res.data === 'string' && res.data.startsWith('http')) {
        const short = res.data.trim();
        this.logger.log(`URL shortened via da.gd: ${targetUrl} → ${short}`);
        return short;
      }
    } catch (e) {}

    return targetUrl;
  }

  private getActiveLocalIp(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (
          iface.family === 'IPv4' &&
          !iface.internal &&
          !iface.address.startsWith('169.254') &&
          !iface.address.startsWith('172.18')
        ) {
          return iface.address;
        }
      }
    }
    return 'localhost';
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

    // Determine backend base URL (dynamically resolves active Wi-Fi IP so links never point to old/dead subnets)
    let publicBase = this.configService.get<string>('BACKEND_URL');
    if (!publicBase || publicBase.includes('localhost') || publicBase.includes('10.120.170.88') || publicBase.includes('ngrok-free.app')) {
      const activeIp = this.getActiveLocalIp();
      const port = process.env.PORT || 3000;
      publicBase = `http://${activeIp}:${port}`;
    }

    const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

    // Convert relative or private acknowledge URL to full URL
    let fullAcknowledgeUrl = mapsLink;
    if (acknowledgeUrl && typeof acknowledgeUrl === 'string' && acknowledgeUrl.trim() !== '' && acknowledgeUrl !== 'undefined') {
      if (acknowledgeUrl.startsWith('/')) {
        fullAcknowledgeUrl = `${publicBase.replace(/\/$/, '')}${acknowledgeUrl}`;
      } else {
        // If acknowledgeUrl contains an old IP, swap with current publicBase
        const pathPart = acknowledgeUrl.replace(/^https?:\/\/[^\/]+/, '');
        fullAcknowledgeUrl = `${publicBase.replace(/\/$/, '')}${pathPart}`;
      }
    }

    // Shorten the URL via TinyURL/fallback so WhatsApp renders it as a clickable blue hyperlink
    let shortUrl = mapsLink;
    if (fullAcknowledgeUrl) {
      try {
        shortUrl = await this.shortenUrl(fullAcknowledgeUrl);
      } catch (e) {
        shortUrl = fullAcknowledgeUrl;
      }
    }
    if (!shortUrl || shortUrl === 'undefined') {
      shortUrl = mapsLink;
    }

    // Format prominent message with working navigation & live tracking links
    const messageBody = `🚨 *ResQDrive EMERGENCY ALERT*

⚠️ *${userName}* may have been involved in a *${severity}* accident.

📍 *Google Maps Location:*
${mapsLink}

🔗 *Live Tracking & Acknowledge:*
${shortUrl}

⏱️ *Please open the links above or respond immediately.*`;

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
    latitude?: number,
    longitude?: number,
    locationAddress?: string,
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

    // Verbal Location Resolution
    let spokenLocation = locationAddress;
    if (!spokenLocation && latitude && longitude) {
      try {
        spokenLocation = await this.getReverseGeocodedLocation(latitude, longitude);
      } catch (e) {}
    }

    // Split into natural sentences under Google TTS character limits (<100 chars each)
    const sentences = [
      `یہ ریسکیو ڈرائیو ایمرجنسی الرٹ ہے۔ ${userName} کا ${urduSeverity} حادثہ ہوا ہے۔`,
      spokenLocation ? `حادثے کا مقام ${spokenLocation} ہے۔` : '',
      `براہ کرم واٹس ایپ پر لوکیشن دیکھ کر فوری مدد فراہم کریں۔`,
    ].filter(Boolean);

    this.logger.log(`[Voice Alert] Generating chunked Urdu TTS with location: "${spokenLocation || 'N/A'}"`);

    try {
      // Step 1: Generate TTS audio chunks in parallel via Google Translate (Urdu language: tl=ur)
      const chunkBuffers = await Promise.all(
        sentences.map(async (sentence) => {
          const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(sentence)}&tl=ur&client=tw-ob`;
          const audioRes = await axios.get(ttsUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            responseType: 'arraybuffer',
            timeout: 8000,
          });
          return Buffer.from(audioRes.data);
        }),
      );

      const audioBuffer = Buffer.concat(chunkBuffers);
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