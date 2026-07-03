import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { InsuranceDto } from './dto/insurance.dto';
export declare class VehiclesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: string, createVehicleDto: CreateVehicleDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        make: string;
        model: string;
        year: number;
        color: string | null;
        licensePlate: string;
        isPrimary: boolean;
    }>;
    findAll(userId: string): Promise<({
        insurance: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            providerName: string | null;
            policyNumber: string | null;
            coverageType: string | null;
            expiryDate: Date | null;
            emergencyHelpline: string | null;
            vehicleId: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        make: string;
        model: string;
        year: number;
        color: string | null;
        licensePlate: string;
        isPrimary: boolean;
    })[]>;
    findOne(userId: string, id: string): Promise<{
        insurance: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            providerName: string | null;
            policyNumber: string | null;
            coverageType: string | null;
            expiryDate: Date | null;
            emergencyHelpline: string | null;
            vehicleId: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        make: string;
        model: string;
        year: number;
        color: string | null;
        licensePlate: string;
        isPrimary: boolean;
    }>;
    update(userId: string, id: string, updateVehicleDto: UpdateVehicleDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        make: string;
        model: string;
        year: number;
        color: string | null;
        licensePlate: string;
        isPrimary: boolean;
    }>;
    setPrimary(userId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        make: string;
        model: string;
        year: number;
        color: string | null;
        licensePlate: string;
        isPrimary: boolean;
    }>;
    delete(userId: string, id: string): Promise<{
        message: string;
    }>;
    upsertInsurance(userId: string, vehicleId: string, insuranceDto: InsuranceDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        providerName: string | null;
        policyNumber: string | null;
        coverageType: string | null;
        expiryDate: Date | null;
        emergencyHelpline: string | null;
        vehicleId: string;
    }>;
    getInsurance(userId: string, vehicleId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        providerName: string | null;
        policyNumber: string | null;
        coverageType: string | null;
        expiryDate: Date | null;
        emergencyHelpline: string | null;
        vehicleId: string;
    }>;
    deleteInsurance(userId: string, vehicleId: string): Promise<{
        message: string;
    }>;
}
