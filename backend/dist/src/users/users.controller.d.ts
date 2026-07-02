import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UploadService } from '../upload/upload.service';
export declare class UsersController {
    private usersService;
    private uploadService;
    constructor(usersService: UsersService, uploadService: UploadService);
    getProfile(user: {
        id: string;
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
    updateProfile(user: {
        id: string;
    }, updateProfileDto: UpdateProfileDto): Promise<{
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
    changePassword(user: {
        id: string;
    }, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    uploadProfilePicture(user: {
        id: string;
    }, file: Express.Multer.File): Promise<{
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
