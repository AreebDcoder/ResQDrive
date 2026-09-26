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

  async generateReport(userId: string, incidentId?: string, assessmentIds?: string[]) {
    const whereClause: any = { userId };

    if (Array.isArray(assessmentIds) && assessmentIds.length > 0) {
      whereClause.id = { in: assessmentIds };
    } else if (typeof incidentId === 'string' && incidentId.trim() !== '') {
      whereClause.incidentId = incidentId;
    } else {
      whereClause.incidentId = null;
      // Fetch only recent assessments from current active session (last 10 minutes)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      whereClause.createdAt = { gte: tenMinutesAgo };
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

    // Deduplicate assessments by partTag (keeping the latest scan per partTag if duplicate scans occurred)
    const uniqueAssessmentsMap = new Map<string, typeof assessments[0]>();
    for (const assessment of assessments) {
      const key = `${assessment.partTag}`;
      if (!uniqueAssessmentsMap.has(key)) {
        uniqueAssessmentsMap.set(key, assessment);
      }
    }
    const targetAssessments = Array.from(uniqueAssessmentsMap.values());

    const lineItems: any[] = [];
    let totalMinCostPkr = 0;
    let totalMaxCostPkr = 0;

    for (const assessment of targetAssessments) {
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

      // Repair labor requires intensive denting/painting work (higher labor), whereas replace labor is fitting installation (lower labor)
      const effectiveLaborRate = laborRate || {
        id: 'default',
        partTag: assessment.partTag,
        action,
        minCostPkr: action === RepairAction.repair ? 3500 : 1500,
        maxCostPkr: action === RepairAction.repair ? 8500 : 3500,
      };

      // b. Get parts cost (Only replacement action requires purchasing a new spare part)
      let partsMin = 0;
      let partsMax = 0;
      let partsSource = 'none_repaired';

      if (action === RepairAction.replace) {
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
          partsSource = cached.source;
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
            partsSource = scrapeResult.source;

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
            // TIER 3: Gemini AI Fallback
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
              // TIER 4: Hardcoded Static Safety Net
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
                partsMin = 3000;
                partsMax = 8000;
              }
              partsSource = 'fallback_default';
            }
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
