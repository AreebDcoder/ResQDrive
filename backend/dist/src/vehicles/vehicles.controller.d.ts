import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { InsuranceDto } from './dto/insurance.dto';
export declare class VehiclesController {
    private vehiclesService;
    constructor(vehiclesService: VehiclesService);
    create(user: {
        id: string;
    }, createVehicleDto: CreateVehicleDto): Promise<{
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
    findAll(user: {
        id: string;
    }): Promise<({
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
    findOne(user: {
        id: string;
    }, id: string): Promise<{
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
    update(user: {
        id: string;
    }, id: string, updateVehicleDto: UpdateVehicleDto): Promise<{
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
    setPrimary(user: {
        id: string;
    }, id: string): Promise<{
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
    delete(user: {
        id: string;
    }, id: string): Promise<{
        message: string;
    }>;
    upsertInsurance(user: {
        id: string;
    }, id: string, insuranceDto: InsuranceDto): Promise<{
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
    getInsurance(user: {
        id: string;
    }, id: string): Promise<{
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
    deleteInsurance(user: {
        id: string;
    }, id: string): Promise<{
        message: string;
    }>;
}
