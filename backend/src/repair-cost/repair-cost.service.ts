import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiPricingService } from './gemini-pricing.service';
import { PartsPriceScraperService } from './parts-price-scraper.service';
import { PartTag, RepairAction, DamageSeverity } from '@prisma/client';

@Injectable()
export class RepairCostService {
  private readonly logger = new Logger(RepairCostService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiPricing: GeminiPricingService,
    private readonly partsPriceScraper: PartsPriceScraperService,
  ) {}

  async generateReport(userId: string, incidentId?: string) {
    const whereClause: any = { userId };
    if (typeof incidentId === 'string' && incidentId.trim() !== '') {
      whereClause.incidentId = incidentId;
    } else {
      whereClause.incidentId = null;
      // Only fetch assessments from the last 2 hours to represent the current session
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      whereClause.createdAt = { gte: twoHoursAgo };
    }

    // 1. Fetch damage assessments matching search criteria
    const assessments = await this.prisma.damageAssessment.findMany({
      where: whereClause,
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' },
    });

    if (assessments.length === 0) {
      throw new BadRequestException('No damage assessments found for this session. Please perform a damage assessment first.');
    }

    // 2. Fetch associated vehicle or resolve a registered one
    let vehicle = assessments.find((a) => a.vehicle)?.vehicle;
    if (!vehicle) {
      vehicle = await this.prisma.vehicle.findFirst({
        where: { userId, isPrimary: true },
      });
      if (!vehicle) {
        vehicle = await this.prisma.vehicle.findFirst({
          where: { userId },
        });
      }
    }

    // Dynamic fallback defaults if no vehicle is registered
    const make = vehicle?.make || 'Toyota';
    const model = vehicle?.model || 'Corolla';
    const year = vehicle?.year || 2018;

    const lineItems: any[] = [];
    let totalMinCostPkr = 0;
    let totalMaxCostPkr = 0;

    for (const assessment of assessments) {
      // Repair vs Replace decision rules
      let action: RepairAction = RepairAction.repair;

      if (assessment.predictedDamageType === 'glass_shatter' || assessment.predictedDamageType === 'tire_flat') {
        action = RepairAction.replace;
      } else if (assessment.derivedSeverity === DamageSeverity.severe) {
        action = RepairAction.replace;
      } else {
        action = RepairAction.repair;
      }

      // a. Get labor cost from static DB table (LaborCostRate)
      const laborRate = await this.prisma.laborCostRate.findUnique({
        where: {
          partTag_action: {
            partTag: assessment.partTag,
            action,
          },
        },
      });

      if (!laborRate) {
        this.logger.warn(`Missing labor rate for ${assessment.partTag} - ${action}. Using fallback labor rate.`);
      }

      const effectiveLaborRate = laborRate || {
        minCostPkr: 1500,
        maxCostPkr: 3500,
      };

      // b. Get parts cost (4-TIER ENGINE: Cache -> Scraper [PakWheels/OLX] -> Gemini AI Fallback -> Static Fallback)
      let partsMin = 0;
      let partsMax = 0;
      let partsSource = 'cache';

      const cacheKey = {
        vehicleMake: make,
        vehicleModel: model,
        vehicleYear: year,
        partTag: assessment.partTag,
        action,
      };

      // TIER 1: Check parts_price_cache table
      const cached = await this.prisma.partsPriceCache.findUnique({
        where: {
          vehicleMake_vehicleModel_vehicleYear_partTag_action: cacheKey,
        },
      });

      if (cached) {
        partsMin = cached.minPricePkr;
        partsMax = cached.maxPricePkr;
        partsSource = cached.source; // 'pakwheels_scrape' | 'olx_scrape' | 'gemini_ai_fallback'
      } else {
        // TIER 2: Live Marketplace Scraper (PakWheels AutoStore -> OLX Pakistan)
        const scrapeResult = await this.partsPriceScraper.scrapeMarketplacePrice(
          make,
          model,
          assessment.partTag,
          action,
        );

        if (scrapeResult) {
          partsMin = scrapeResult.minPricePkr;
          partsMax = scrapeResult.maxPricePkr;
          partsSource = scrapeResult.source; // 'pakwheels_scrape' or 'olx_scrape'

          // Cache successful scrape result
          await this.prisma.partsPriceCache
            .create({
              data: {
                ...cacheKey,
                minPricePkr: partsMin,
                maxPricePkr: partsMax,
                source: partsSource,
              },
            })
            .catch((err) => {
              this.logger.warn(`Failed to write scrape result to parts price cache: ${err.message}`);
            });
        } else {
          // TIER 3: Gemini AI Fallback (demoted from primary, retained as 3rd-tier fallback)
          this.logger.warn(
            `Live marketplace scraper yielded no listings for ${make} ${model} ${assessment.partTag}. Attempting Tier 3 Gemini AI fallback...`,
          );

          const geminiEstimate = await this.geminiPricing.estimatePartsPrice(
            make,
            model,
            year,
            assessment.partTag,
            action,
          );

          if (geminiEstimate) {
            partsMin = geminiEstimate.minPricePkr;
            partsMax = geminiEstimate.maxPricePkr;
            partsSource = 'gemini_ai_fallback';

            // Cache Gemini AI fallback response with updated source tag
            await this.prisma.partsPriceCache
              .create({
                data: {
                  ...cacheKey,
                  minPricePkr: partsMin,
                  maxPricePkr: partsMax,
                  source: 'gemini_ai_fallback',
                },
              })
              .catch((err) => {
                this.logger.warn(`Failed to write Gemini fallback to parts price cache: ${err.message}`);
              });
          } else {
            // TIER 4: Hardcoded Static Safety Net (FallbackPartsPrice)
            this.logger.warn(
              `Gemini AI fallback also failed/unreachable. Using Tier 4 hardcoded static fallback table for ${assessment.partTag}.`,
            );

            const fallback = await this.prisma.fallbackPartsPrice.findUnique({
              where: {
                partTag_action: {
                  partTag: assessment.partTag,
                  action,
                },
              },
            });

            if (fallback) {
              partsMin = fallback.minPricePkr;
              partsMax = fallback.maxPricePkr;
            } else {
              // Emergency default if database table is missing seed rows
              partsMin = 2000;
              partsMax = 5000;
            }
            partsSource = 'fallback_default';
            // Note: Tier 4 fallback results are NOT cached, so future queries retry higher tiers.
          }
        }
      }

      const minLineTotal = effectiveLaborRate.minCostPkr + partsMin;
      const maxLineTotal = effectiveLaborRate.maxCostPkr + partsMax;

      totalMinCostPkr += minLineTotal;
      totalMaxCostPkr += maxLineTotal;

      lineItems.push({
        partTag: assessment.partTag,
        damageType: assessment.predictedDamageType,
        action,
        laborCost: { min: effectiveLaborRate.minCostPkr, max: effectiveLaborRate.maxCostPkr },
        partsCost: { min: partsMin, max: partsMax },
        partsSource,
        lineTotal: { min: minLineTotal, max: maxLineTotal },
      });
    }

    // 3. Persist the final report
    const report = await this.prisma.repairCostReport.create({
      data: {
        userId,
        incidentId,
        vehicleId: vehicle?.id || null,
        totalMinCostPkr,
        totalMaxCostPkr,
        lineItems,
      },
    });

    return report;
  }

  async getReport(userId: string, id: string) {
    const report = await this.prisma.repairCostReport.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!report) {
      throw new NotFoundException('Repair cost report not found.');
    }

    if (report.userId !== userId) {
      throw new ForbiddenException('Forbidden access to this repair cost report.');
    }

    return report;
  }

  async getUserReports(userId: string) {
    return this.prisma.repairCostReport.findMany({
      where: { userId },
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteReport(userId: string, id: string) {
    const report = await this.prisma.repairCostReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Repair cost report not found.');
    }

    if (report.userId !== userId) {
      throw new ForbiddenException('Forbidden access to this repair cost report.');
    }

    await this.prisma.repairCostReport.delete({
      where: { id },
    });

    return { success: true };
  }
}
