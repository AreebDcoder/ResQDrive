import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    getProfile(userId: string): Promise<{
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
    updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<{
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
    changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
}
