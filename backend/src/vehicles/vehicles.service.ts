import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { InsuranceDto } from './dto/insurance.dto';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createVehicleDto: CreateVehicleDto) {
    const { make, model, year, color, licensePlate } = createVehicleDto;

    // 1. Check license plate uniqueness system-wide
    const existing = await this.prisma.vehicle.findUnique({
      where: { licensePlate },
    });
    if (existing) {
      throw new ConflictException('A vehicle with this license plate is already registered.');
    }

    // 2. Check if this is the user's first vehicle
    const vehicleCount = await this.prisma.vehicle.count({
      where: { userId },
    });

    const isPrimary = vehicleCount === 0;

    return this.prisma.vehicle.create({
      data: {
        userId,
        make,
        model,
        year,
        color,
        licensePlate,
        isPrimary,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.vehicle.findMany({
      where: { userId },
      include: { insurance: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: { insurance: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    // Security: Validate ownership at query/logic layer
    if (vehicle.userId !== userId) {
      throw new ForbiddenException('Access denied. You do not own this vehicle.');
    }

    return vehicle;
  }

  async update(userId: string, id: string, updateVehicleDto: UpdateVehicleDto) {
    const vehicle = await this.findOne(userId, id); // validates ownership and existence

    if (updateVehicleDto.licensePlate && updateVehicleDto.licensePlate !== vehicle.licensePlate) {
      const existing = await this.prisma.vehicle.findUnique({
        where: { licensePlate: updateVehicleDto.licensePlate },
      });
      if (existing) {
        throw new ConflictException('A vehicle with this license plate is already registered.');
      }
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: updateVehicleDto,
    });
  }

  async setPrimary(userId: string, id: string) {
    await this.findOne(userId, id); // validates ownership and existence

    // Transaction-safe primary vehicle switch
    return this.prisma.$transaction(async (tx) => {
      // Unset primary flag on all other vehicles owned by the user
      await tx.vehicle.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });

      // Set primary flag on selected vehicle
      return tx.vehicle.update({
        where: { id },
        data: { isPrimary: true },
      });
    });
  }

  async delete(userId: string, id: string) {
    await this.findOne(userId, id); // validates ownership and existence

    await this.prisma.vehicle.delete({
      where: { id },
    });

    return { message: 'Vehicle successfully removed.' };
  }

  // --- Insurance ---

  async upsertInsurance(userId: string, vehicleId: string, insuranceDto: InsuranceDto) {
    await this.findOne(userId, vehicleId); // validates ownership and existence

    const { providerName, policyNumber, coverageType, expiryDate, emergencyHelpline } = insuranceDto;
    const parsedExpiry = expiryDate ? new Date(expiryDate) : null;

    return this.prisma.vehicleInsurance.upsert({
      where: { vehicleId },
      update: {
        providerName,
        policyNumber,
        coverageType,
        expiryDate: parsedExpiry,
        emergencyHelpline,
      },
      create: {
        vehicleId,
        providerName,
        policyNumber,
        coverageType,
        expiryDate: parsedExpiry,
        emergencyHelpline,
      },
    });
  }

  async getInsurance(userId: string, vehicleId: string) {
    const vehicle = await this.findOne(userId, vehicleId); // validates ownership and existence

    if (!vehicle.insurance) {
      throw new NotFoundException('No insurance details stored for this vehicle.');
    }

    return vehicle.insurance;
  }

  async deleteInsurance(userId: string, vehicleId: string) {
    await this.findOne(userId, vehicleId); // validates ownership and existence

    try {
      await this.prisma.vehicleInsurance.delete({
        where: { vehicleId },
      });
    } catch (e) {
      throw new NotFoundException('No insurance details stored to delete.');
    }

    return { message: 'Insurance details successfully removed.' };
  }
}
