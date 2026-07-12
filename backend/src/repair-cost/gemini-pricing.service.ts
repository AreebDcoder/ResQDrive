import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PartTag } from '@prisma/client';
import axios from 'axios';

interface PartsPriceEstimate {
  minPricePkr: number;
  maxPricePkr: number;
}

@Injectable()
export class GeminiPricingService {
  private readonly logger = new Logger(GeminiPricingService.name);
  private readonly geminiUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`; // Use a standard widely available flash model, falling back to flash-lite if needed
  }

  async estimatePartsPrice(
    make: string,
    model: string,
    year: number,
    partTag: PartTag,
    action: 'repair' | 'replace',
  ): Promise<PartsPriceEstimate | null> {
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY is not configured in environment.');
      return null;
    }

    // Try both the user's model preference and standard fallback models
    const modelsToTry = [
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent`
    ];

    const prompt = `You are a Pakistani auto parts pricing expert. Give a realistic 
current market price range in PKR (Pakistani Rupees) for a ${action === 'replace' ? 'replacement' : 'repair'} 
of the ${partTag.replace('_', ' ')} on a ${year} ${make} ${model}, available in Pakistan 
(consider both OEM and quality aftermarket options). 
Respond with ONLY valid JSON in this exact format, no other text: 
{"min_price_pkr": <integer>, "max_price_pkr": <integer>}`;

    for (const url of modelsToTry) {
      try {
        const response = await axios.post(
          `${url}?key=${this.apiKey}`,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 100,
            },
          },
          { timeout: 8000 }, // 8 seconds timeout
        );

        const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          continue;
        }

        const cleaned = rawText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        if (typeof parsed.min_price_pkr === 'number' && typeof parsed.max_price_pkr === 'number') {
          return {
            minPricePkr: Math.round(parsed.min_price_pkr),
            maxPricePkr: Math.round(parsed.max_price_pkr),
          };
        }
      } catch (err: any) {
        this.logger.warn(`Gemini pricing attempt failed with model URL ${url}: ${err.message}`);
      }
    }

    this.logger.error(`Gemini pricing service failed all model attempts. Falling back to default static prices.`);
    return null;
  }
}
