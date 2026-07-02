import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class AdminService {
    private prisma;
    constructor(prisma: PrismaService);
    listUsers(page?: number, limit?: number, role?: UserRole, isActive?: boolean): Promise<{
        users: {
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
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    changeUserRole(userId: string, newRole: UserRole): Promise<{
        message: string;
    }>;
    changeUserStatus(userId: string, isActive: boolean): Promise<{
        message: string;
    }>;
    verifyWorkshop(userId: string, isWorkshopVerified: boolean): Promise<{
        message: string;
    }>;
    deleteUser(userId: string): Promise<{
        message: string;
    }>;
}
