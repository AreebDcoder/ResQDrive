// ════════════════════════════════════════════════════════════════════════════════
// ResQDrive Module 6.15 — Parts Price Scraper Service (PakWheels & OLX Pakistan)
// ════════════════════════════════════════════════════════════════════════════════
//
// DESIGN & ARCHITECTURE NOTE:
// 1. Live Marketplace Grounding:
//    General-purpose LLMs lack live Pakistani auto-parts marketplace data. This scraper
//    queries actual current seller listings on PakWheels AutoStore (Tier 1) and OLX Pakistan
//    (Tier 2) to provide genuine local market pricing.
//
// 2. HTML Inspection Finding:
//    Inspection of live search pages revealed that both PakWheels AutoStore and OLX Pakistan
//    return server-rendered HTML containing listing titles, prices, and links in the HTTP response.
//    Therefore, lightweight server-side parsing via `cheerio` suffices completely; browser-rendered
//    headless tools like `playwright` are not required.
//
// 3. 25th/75th Percentile Calculation:
//    To eliminate extreme outliers (e.g. mispriced accessories or bulk wholesale lots),
//    we compute the 25th percentile (minPricePkr) and 75th percentile (maxPricePkr) across
//    filtered search results instead of raw min/max bounds.
//
// 4. Respectful Scraping & Audit Trail:
//    Implements a delay-based rate limiter (2000ms minimum spacing between requests) to avoid
//    overloading target services or triggering anti-bot measures. Every scrape attempt is logged
//    to the `parts_scrape_logs` PostgreSQL table with listing URLs for auditability.
// ════════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedPartsPriceResult {
  minPricePkr: number;
  maxPricePkr: number;
  source: 'pakwheels_scrape' | 'olx_scrape';
  listingUrls: string[];
}

@Injectable()
export class PartsPriceScraperService {
  private readonly logger = new Logger(PartsPriceScraperService.name);
  private lastScrapeTimestamp = 0;
  private readonly MIN_SCRAPE_INTERVAL_MS = 2000; // Respectful 2-second rate limit

  private readonly USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  private readonly PART_TAG_TO_SEARCH_NAME: Record<string, string> = {
    front_bumper: 'front bumper',
    rear_bumper: 'rear bumper',
    bonnet: 'bonnet hood',
    left_mirror: 'side mirror',
    right_mirror: 'side mirror',
    headlight: 'headlight',
    taillight: 'back light taillight',
    door: 'door panel',
    windshield: 'windshield glass',
    roof: 'roof panel',
    tire: 'tire rim wheel',
    other: 'spare part',
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Respectful scraping rate limiter delay
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastScrapeTimestamp;
    if (elapsed < this.MIN_SCRAPE_INTERVAL_MS) {
      const waitTime = this.MIN_SCRAPE_INTERVAL_MS - elapsed;
      this.logger.debug(`[Scraper Rate Limiter] Waiting ${waitTime}ms before next scrape request...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.lastScrapeTimestamp = Date.now();
  }

  /**
   * Converts partTag enum/string to human-readable search terms
   */
  private getSearchKeyword(partTag: string): string {
    return this.PART_TAG_TO_SEARCH_NAME[partTag] || partTag.replace('_', ' ');
  }

  /**
   * Main entry point for scraping marketplace prices (Tier 1: PakWheels -> Tier 2: OLX)
   */
  async scrapeMarketplacePrice(
    make: string,
    model: string,
    partTag: string,
    action: string,
  ): Promise<ScrapedPartsPriceResult | null> {
    const partKeyword = this.getSearchKeyword(partTag);
    const searchQuery = `${make} ${model} ${partKeyword}`.trim();
    const startTime = Date.now();

    this.logger.log(`Initiating marketplace parts price scrape for query: "${searchQuery}"`);

    // ── TIER 1: PakWheels AutoStore Scrape ──
    try {
      const pakwheelsResult = await this.scrapePakWheels(searchQuery, make, model, partKeyword);
      const durationMs = Date.now() - startTime;

      if (pakwheelsResult && pakwheelsResult.filteredPrices.length >= 2) {
        const { minPricePkr, maxPricePkr } = this.calculatePercentiles(pakwheelsResult.filteredPrices);

        await this.logScrapeAudit({
          searchQuery,
          source: 'pakwheels',
          resultsFound: pakwheelsResult.totalFound,
          resultsAfterFiltering: pakwheelsResult.filteredPrices.length,
          computedMinPricePkr: minPricePkr,
          computedMaxPricePkr: maxPricePkr,
          rawListingUrls: pakwheelsResult.urls,
          scrapeDurationMs: durationMs,
          success: true,
        });

        this.logger.log(
          `[Tier 1 SUCCESS] PakWheels scrape produced price range PKR ${minPricePkr} - ${maxPricePkr} from ${pakwheelsResult.filteredPrices.length} listings.`,
        );

        return {
          minPricePkr,
          maxPricePkr,
          source: 'pakwheels_scrape',
          listingUrls: pakwheelsResult.urls,
        };
      }
    } catch (err: any) {
      this.logger.warn(`PakWheels scrape attempt failed: ${err.message}`);
    }

    // ── TIER 2: OLX Pakistan Scrape ──
    try {
      const olxResult = await this.scrapeOLX(searchQuery, make, model, partKeyword);
      const durationMs = Date.now() - startTime;

      if (olxResult && olxResult.filteredPrices.length >= 2) {
        const { minPricePkr, maxPricePkr } = this.calculatePercentiles(olxResult.filteredPrices);

        await this.logScrapeAudit({
          searchQuery,
          source: 'olx',
          resultsFound: olxResult.totalFound,
          resultsAfterFiltering: olxResult.filteredPrices.length,
          computedMinPricePkr: minPricePkr,
          computedMaxPricePkr: maxPricePkr,
          rawListingUrls: olxResult.urls,
          scrapeDurationMs: durationMs,
          success: true,
        });

        this.logger.log(
          `[Tier 2 SUCCESS] OLX Pakistan scrape produced price range PKR ${minPricePkr} - ${maxPricePkr} from ${olxResult.filteredPrices.length} listings.`,
        );

        return {
          minPricePkr,
          maxPricePkr,
          source: 'olx_scrape',
          listingUrls: olxResult.urls,
        };
      }
    } catch (err: any) {
      this.logger.warn(`OLX Pakistan scrape attempt failed: ${err.message}`);
    }

    // If both scrape tiers fail to yield 2+ relevant results, log audit failure and return null
    const durationMs = Date.now() - startTime;
    await this.logScrapeAudit({
      searchQuery,
      source: 'pakwheels_olx',
      resultsFound: 0,
      resultsAfterFiltering: 0,
      computedMinPricePkr: null,
      computedMaxPricePkr: null,
      rawListingUrls: [],
      scrapeDurationMs: durationMs,
      success: false,
      errorMessage: 'Fewer than 2 relevant listings found across both PakWheels and OLX.',
    });

    this.logger.warn(`Marketplace scrape yielded insufficient live listings for query: "${searchQuery}". Falling through to Gemini AI tier.`);
    return null;
  }

  /**
   * Scrapes PakWheels AutoStore for spare parts listings
   */
  private async scrapePakWheels(
    searchQuery: string,
    make: string,
    model: string,
    partKeyword: string,
  ) {
    await this.enforceRateLimit();
    const url = `https://www.pakwheels.com/accessories-spare-parts/search/-/?q=${encodeURIComponent(searchQuery)}`;

    const response = await axios.get(url, {
      headers: { 'User-Agent': this.USER_AGENT },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const rawListings: { title: string; price: number; url: string }[] = [];

    // Parse product cards from PakWheels HTML
    $('ul.search-results > li, .well, .search-card, li.ad-tile, .single-product-item').each((_, el) => {
      const title = $(el).find('a.product-title, .title, h3, h4').text().trim() || $(el).find('a').attr('title') || '';
      const priceText = $(el).find('.price-details, .price, .generic-price, .currency').text().trim();
      const href = $(el).find('a').attr('href') || '';

      const numericPrice = this.parsePriceInteger(priceText);
      if (title && numericPrice > 0) {
        const fullUrl = href.startsWith('http') ? href : `https://www.pakwheels.com${href}`;
        rawListings.push({ title, price: numericPrice, url: fullUrl });
      }
    });

    // Fallback parsing for PakWheels anchor elements if container selectors differ
    if (rawListings.length === 0) {
      $('a[href*="/accessories-spare-parts/"]').each((_, el) => {
        const title = $(el).attr('title') || $(el).text().trim();
        const href = $(el).attr('href') || '';
        const parentText = $(el).parent().text().trim();
        const numericPrice = this.parsePriceInteger(parentText);

        if (title && numericPrice > 0 && title.length > 5) {
          const fullUrl = href.startsWith('http') ? href : `https://www.pakwheels.com${href}`;
          rawListings.push({ title, price: numericPrice, url: fullUrl });
        }
      });
    }

    // Relevant filtering: title must contain main part keyword AND at least make or model
    const filtered = rawListings.filter((item) => {
      const lowerTitle = item.title.toLowerCase();
      const lowerMake = make.toLowerCase();
      const lowerModel = model.toLowerCase();
      const mainPartToken = partKeyword.split(' ')[0].toLowerCase();

      const hasPartMatch = lowerTitle.includes(mainPartToken);
      const hasVehicleMatch = lowerTitle.includes(lowerMake) || lowerTitle.includes(lowerModel);

      return hasPartMatch && hasVehicleMatch && item.price >= 300 && item.price <= 300000;
    });

    return {
      totalFound: rawListings.length,
      filteredPrices: filtered.map((f) => f.price),
      urls: filtered.map((f) => f.url).slice(0, 10),
    };
  }

  /**
   * Scrapes OLX Pakistan for spare parts listings
   */
  private async scrapeOLX(
    searchQuery: string,
    make: string,
    model: string,
    partKeyword: string,
  ) {
    await this.enforceRateLimit();
    const url = `https://www.olx.com.pk/items/q-${encodeURIComponent(searchQuery)}`;

    const response = await axios.get(url, {
      headers: { 'User-Agent': this.USER_AGENT },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const rawListings: { title: string; price: number; url: string }[] = [];

    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const title = $(el).attr('title') || $(el).text().trim();
      const parentText = $(el).closest('li, article, div').text().trim();

      if (href && (href.includes('/item/') || href.includes('/d/')) && title && title.length > 5) {
        const numericPrice = this.parsePriceInteger(parentText);
        if (numericPrice > 0) {
          const fullUrl = href.startsWith('http') ? href : `https://www.olx.com.pk${href}`;
          rawListings.push({ title, price: numericPrice, url: fullUrl });
        }
      }
    });

    const filtered = rawListings.filter((item) => {
      const lowerTitle = item.title.toLowerCase();
      const lowerMake = make.toLowerCase();
      const lowerModel = model.toLowerCase();
      const mainPartToken = partKeyword.split(' ')[0].toLowerCase();

      const hasPartMatch = lowerTitle.includes(mainPartToken);
      const hasVehicleMatch = lowerTitle.includes(lowerMake) || lowerTitle.includes(lowerModel);

      return hasPartMatch && hasVehicleMatch && item.price >= 300 && item.price <= 300000;
    });

    return {
      totalFound: rawListings.length,
      filteredPrices: filtered.map((f) => f.price),
      urls: filtered.map((f) => f.url).slice(0, 10),
    };
  }

  /**
   * Computes 25th percentile (min) and 75th percentile (max) from filtered price array
   */
  private calculatePercentiles(prices: number[]): { minPricePkr: number; maxPricePkr: number } {
    const sorted = [...prices].sort((a, b) => a - b);
    const getPercentile = (p: number) => {
      const index = (p / 100) * (sorted.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index - lower;
      return Math.round(sorted[lower] * (1 - weight) + sorted[upper] * weight);
    };

    const p25 = getPercentile(25);
    const p75 = getPercentile(75);

    // If p25 equals p75, apply a reasonable ±15% spread
    if (p25 === p75) {
      return {
        minPricePkr: Math.round(p25 * 0.85),
        maxPricePkr: Math.round(p75 * 1.15),
      };
    }

    return {
      minPricePkr: p25,
      maxPricePkr: p75,
    };
  }

  /**
   * Helper to extract numeric integer price from text like "PKR 12,500" or "Rs. 1,650"
   */
  private parsePriceInteger(text: string): number {
    const match = text.match(/(?:PKR|Rs\.?)\s*([\d,]+)/i) || text.match(/([\d,]{4,})/);
    if (match && match[1]) {
      const clean = match[1].replace(/,/g, '');
      const parsed = parseInt(clean, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Saves audit trail log to `parts_scrape_logs` table
   */
  private async logScrapeAudit(params: {
    searchQuery: string;
    source: string;
    resultsFound: number;
    resultsAfterFiltering: number;
    computedMinPricePkr: number | null;
    computedMaxPricePkr: number | null;
    rawListingUrls: string[];
    scrapeDurationMs: number;
    success: boolean;
    errorMessage?: string;
  }) {
    try {
      await this.prisma.partsScrapeLog.create({
        data: {
          searchQuery: params.searchQuery,
          source: params.source,
          resultsFound: params.resultsFound,
          resultsAfterFiltering: params.resultsAfterFiltering,
          computedMinPricePkr: params.computedMinPricePkr,
          computedMaxPricePkr: params.computedMaxPricePkr,
          rawListingUrls: params.rawListingUrls,
          scrapeDurationMs: params.scrapeDurationMs,
          success: params.success,
          errorMessage: params.errorMessage || null,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to write to parts_scrape_logs audit table: ${err.message}`);
    }
  }
}
