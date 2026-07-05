"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VehiclesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let VehiclesService = class VehiclesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, createVehicleDto) {
        const { make, model, year, color, licensePlate } = createVehicleDto;
        const existing = await this.prisma.vehicle.findUnique({
            where: { licensePlate },
        });
        if (existing) {
            throw new common_1.ConflictException('A vehicle with this license plate is already registered.');
        }
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
    async findAll(userId) {
        return this.prisma.vehicle.findMany({
            where: { userId },
            include: { insurance: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(userId, id) {
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id },
            include: { insurance: true },
        });
        if (!vehicle) {
            throw new common_1.NotFoundException('Vehicle not found.');
        }
        if (vehicle.userId !== userId) {
            throw new common_1.ForbiddenException('Access denied. You do not own this vehicle.');
        }
        return vehicle;
    }
    async update(userId, id, updateVehicleDto) {
        const vehicle = await this.findOne(userId, id);
        if (updateVehicleDto.licensePlate && updateVehicleDto.licensePlate !== vehicle.licensePlate) {
            const existing = await this.prisma.vehicle.findUnique({
                where: { licensePlate: updateVehicleDto.licensePlate },
            });
            if (existing) {
                throw new common_1.ConflictException('A vehicle with this license plate is already registered.');
            }
        }
        return this.prisma.vehicle.update({
            where: { id },
            data: updateVehicleDto,
        });
    }
    async setPrimary(userId, id) {
        await this.findOne(userId, id);
        return this.prisma.$transaction(async (tx) => {
            await tx.vehicle.updateMany({
                where: { userId, isPrimary: true },
                data: { isPrimary: false },
            });
            return tx.vehicle.update({
                where: { id },
                data: { isPrimary: true },
            });
        });
    }
    async delete(userId, id) {
        await this.findOne(userId, id);
        await this.prisma.vehicle.delete({
            where: { id },
        });
        return { message: 'Vehicle successfully removed.' };
    }
    async upsertInsurance(userId, vehicleId, insuranceDto) {
        await this.findOne(userId, vehicleId);
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
    async getInsurance(userId, vehicleId) {
        const vehicle = await this.findOne(userId, vehicleId);
        if (!vehicle.insurance) {
            throw new common_1.NotFoundException('No insurance details stored for this vehicle.');
        }
        return vehicle.insurance;
    }
    async deleteInsurance(userId, vehicleId) {
        await this.findOne(userId, vehicleId);
        try {
            await this.prisma.vehicleInsurance.delete({
                where: { vehicleId },
            });
        }
        catch (e) {
            throw new common_1.NotFoundException('No insurance details stored to delete.');
        }
        return { message: 'Insurance details successfully removed.' };
    }
};
exports.VehiclesService = VehiclesService;
exports.VehiclesService = VehiclesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VehiclesService);
//# sourceMappingURL=vehicles.service.js.map