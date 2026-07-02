import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
export declare class AdminController {
    private adminService;
    constructor(adminService: AdminService);
    listUsers(page?: string, limit?: string, role?: UserRole, isActive?: string): Promise<{
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
    changeRole(id: string, role: UserRole): Promise<{
        message: string;
    }>;
    changeStatus(id: string, isActive: boolean): Promise<{
        message: string;
    }>;
    verifyWorkshop(id: string, isWorkshopVerified: boolean): Promise<{
        message: string;
    }>;
    deleteUser(id: string): Promise<{
        message: string;
    }>;
}
