import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminUpdateVehicleDto } from './dto/admin-update-vehicle.dto';
import { AdminInsuranceDto } from './dto/admin-insurance.dto';

/**
 * AdminVehiclesService — admin-scoped vehicle management.
 *
 * Bypasses user-scoped ownership checks (admin can manage any user's vehicles).
 *
 * Methods:
 *   - listAll(query) — paginated list with filters (search by make/model/plate/
 *     owner name/email, filter by make/year/isPrimary)
 *   - findOne(id) — single vehicle with insurance + owner + linked damage
 *     assessments + repair reports + incidents
 *   - update(id, dto) — admin edit of vehicle fields
 *   - setPrimary(id) — set vehicle as primary (unsets others for same owner)
 *   - remove(id) — hard delete vehicle + cascade insurance (Prisma cascade)
 *   - upsertInsurance(vehicleId, dto) — admin override of insurance
 *   - deleteInsurance(vehicleId) — remove insurance record
 */
@Injectable()
export class AdminVehiclesService {
  constructor(private prisma: PrismaService) {}

  async listAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    make?: string;
    year?: number;
    isPrimary?: boolean;
    userId?: string;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.make) where.make = { contains: query.make, mode: 'insensitive' };
    if (query.year) where.year = query.year;
    if (query.isPrimary !== undefined) where.isPrimary = query.isPrimary;
    if (query.userId) where.userId = query.userId;

    if (query.search) {
      where.OR = [
        { make: { contains: query.search, mode: 'insensitive' } },
        { model: { contains: query.search, mode: 'insensitive' } },
        { licensePlate: { contains: query.search, mode: 'insensitive' } },
        { color: { contains: query.search, mode: 'insensitive' } },
        { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
          insurance: true,
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true, phoneNumber: true, role: true } },
        insurance: true,
        damageAssessments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { id: true, predictedDamageType: true, derivedSeverity: true, confidenceScore: true, partTag: true, createdAt: true, photoUrl: true },
        },
        repairCostReports: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { id: true, totalMinCostPkr: true, totalMaxCostPkr: true, createdAt: true, pdfUrl: true },
        },
        accidentReports: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { id: true, severity: true, calledServiceName: true, calledAt: true, autoDialed: true, createdAt: true },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    // Linked incidents — get incidents where this vehicle was referenced
    // (vehicleId is on incident? actually no — vehicleId is on DamageAssessment + RepairCostReport + AccidentReport.
    // The link to incidents is via the userId of those assessments/reports/accidents.
    // Let's fetch recent incidents for the same userId.)
    const incidents = await this.prisma.incident.findMany({
      where: { userId: vehicle.userId, isDeleted: false },
      take: 5,
      orderBy: { occurredAt: 'desc' },
      select: { id: true, severity: true, status: true, occurredAt: true, address: true, type: true },
    });

    return { ...vehicle, recentIncidents: incidents };
  }

  async update(id: string, dto: AdminUpdateVehicleDto) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    // If licensePlate is being changed, validate uniqueness
    if (dto.licensePlate && dto.licensePlate !== vehicle.licensePlate) {
      const existing = await this.prisma.vehicle.findUnique({
        where: { licensePlate: dto.licensePlate },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('A vehicle with this license plate is already registered.');
      }
    }

    // Validate year if provided
    const currentYear = new Date().getFullYear();
    if (dto.year !== undefined && (dto.year < 1980 || dto.year > currentYear + 1)) {
      throw new BadRequestException(`Vehicle year must be between 1980 and ${currentYear + 1}.`);
    }

    const updateData: any = {};
    if (dto.make !== undefined) updateData.make = dto.make;
    if (dto.model !== undefined) updateData.model = dto.model;
    if (dto.year !== undefined) updateData.year = dto.year;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.licensePlate !== undefined) updateData.licensePlate = dto.licensePlate;
    if (dto.isPrimary !== undefined) updateData.isPrimary = dto.isPrimary;

    return this.prisma.vehicle.update({ where: { id }, data: updateData });
  }

  async setPrimary(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Unset primary flag on all other vehicles owned by the same user
      await tx.vehicle.updateMany({
        where: { userId: vehicle.userId, isPrimary: true },
        data: { isPrimary: false },
      });
      // Set primary flag on selected vehicle
      return tx.vehicle.update({
        where: { id },
        data: { isPrimary: true },
      });
    });
  }

  async remove(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }
    await this.prisma.vehicle.delete({ where: { id } });
    return { message: 'Vehicle successfully removed. Insurance record auto-deleted (cascade).' };
  }

  async upsertInsurance(vehicleId: string, dto: AdminInsuranceDto) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    const parsedExpiry = dto.expiryDate ? new Date(dto.expiryDate) : null;

    return this.prisma.vehicleInsurance.upsert({
      where: { vehicleId },
      update: {
        providerName: dto.providerName,
        policyNumber: dto.policyNumber,
        coverageType: dto.coverageType,
        expiryDate: parsedExpiry,
        emergencyHelpline: dto.emergencyHelpline,
      },
      create: {
        vehicleId,
        providerName: dto.providerName,
        policyNumber: dto.policyNumber,
        coverageType: dto.coverageType,
        expiryDate: parsedExpiry,
        emergencyHelpline: dto.emergencyHelpline,
      },
    });
  }

  async deleteInsurance(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { insurance: true },
    });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }
    if (!vehicle.insurance) {
      throw new NotFoundException('No insurance details stored for this vehicle.');
    }

    await this.prisma.vehicleInsurance.delete({ where: { vehicleId } });
    return { message: 'Insurance details successfully removed.' };
  }
}
