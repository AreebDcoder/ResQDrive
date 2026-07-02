import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
declare const JwtAccessStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtAccessStrategy extends JwtAccessStrategy_base {
    private configService;
    private prisma;
    constructor(configService: ConfigService, prisma: PrismaService);
    validate(payload: {
        sub: string;
        email: string;
    }): Promise<{
        driverDetails: {
            cnicNumber: string | null;
            drivingLicenseNumber: string | null;
            userId: string;
        };
        mechanicDetails: {
            workshopName: string | null;
            workshopAddress: string | null;
            specialization: string | null;
            userId: string;
            isWorkshopVerified: boolean;
        };
        id: string;
        email: string;
        phoneNumber: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        profilePictureUrl: string | null;
        isVerified: boolean;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
