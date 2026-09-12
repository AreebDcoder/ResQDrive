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

    // Use active Google Gemini models with fallback ordering
    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-3.6-flash',
      'gemini-flash-latest',
    ];

    const prompt = `You are a Pakistani auto parts pricing expert. Give a realistic current market price range in PKR (Pakistani Rupees) for a ${action === 'replace' ? 'replacement' : 'repair'} of the ${partTag.replace('_', ' ')} on a ${year} ${make} ${model}, available in Pakistan (consider both OEM and quality aftermarket options). Respond with ONLY valid JSON in this exact format: {"min_price_pkr": <integer>, "max_price_pkr": <integer>}`;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        const response = await axios.post(
          url,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 500,
              responseMimeType: 'application/json',
            },
          },
          { timeout: 8000 },
        );

        const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          continue;
        }

        // Extract JSON object safely even if wrapped in markdown
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          if (typeof parsed.min_price_pkr === 'number' && typeof parsed.max_price_pkr === 'number') {
            this.logger.log(`✅ [Gemini AI Tier SUCCESS] (${model}) estimated ${partTag} price range PKR ${parsed.min_price_pkr} - ${parsed.max_price_pkr}`);
            return {
              minPricePkr: Math.round(parsed.min_price_pkr),
              maxPricePkr: Math.round(parsed.max_price_pkr),
            };
          }
        }
      } catch (err: any) {
        this.logger.warn(`Gemini pricing attempt failed with model ${model}: ${err.message}`);
      }
    }

    this.logger.error(`Gemini pricing service failed all model attempts. Falling back to default static prices.`);
    return null;
  }
}
