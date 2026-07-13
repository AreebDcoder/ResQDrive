import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiPricingService } from './gemini-pricing.service';
import { PartTag, RepairAction, DamageSeverity } from '@prisma/client';

@Injectable()
export class RepairCostService {
  private readonly logger = new Logger(RepairCostService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiPricing: GeminiPricingService,
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
      const action = assessment.derivedSeverity === DamageSeverity.minor 
        ? RepairAction.repair 
        : RepairAction.replace;

      // a. Get labor cost rate
      let laborRate = await this.prisma.laborCostRate.findUnique({
        where: {
          partTag_action: {
            partTag: assessment.partTag,
            action,
          },
        },
      });

      if (!laborRate) {
        // Fallback to 'other' labor tag
        laborRate = await this.prisma.laborCostRate.findUnique({
          where: {
            partTag_action: {
              partTag: PartTag.other,
              action,
            },
          },
        }) || {
          id: '',
          partTag: PartTag.other,
          action,
          minCostPkr: 1000,
          maxCostPkr: 2000,
        };
      }

      // b. Get parts cost (3-tier engine: Cache -> Gemini -> Default Fallback)
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

      const cached = await this.prisma.partsPriceCache.findUnique({
        where: {
          vehicleMake_vehicleModel_vehicleYear_partTag_action: cacheKey,
        },
      });

      if (cached) {
        partsMin = cached.minPricePkr;
        partsMax = cached.maxPricePkr;
        partsSource = 'gemini_ai'; // sourced originally from Gemini
      } else {
        // Cache Miss: Query Gemini API
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
          partsSource = 'gemini_ai';

          // Cache the response
          await this.prisma.partsPriceCache.create({
            data: {
              ...cacheKey,
              minPricePkr: partsMin,
              maxPricePkr: partsMax,
              source: 'gemini_ai',
            },
          }).catch((err) => {
            this.logger.warn(`Failed to write to parts price cache: ${err.message}`);
          });
        } else {
          // Gemini Call Failed: Retrieve Generic Static Fallback Price
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
            // Hard fallback if seed data is missing
            partsMin = 2000;
            partsMax = 5000;
          }
          partsSource = 'fallback_default';
        }
      }

      const minLineTotal = laborRate.minCostPkr + partsMin;
      const maxLineTotal = laborRate.maxCostPkr + partsMax;

      totalMinCostPkr += minLineTotal;
      totalMaxCostPkr += maxLineTotal;

      lineItems.push({
        partTag: assessment.partTag,
        damageType: assessment.predictedDamageType,
        action,
        laborCost: { min: laborRate.minCostPkr, max: laborRate.maxCostPkr },
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
