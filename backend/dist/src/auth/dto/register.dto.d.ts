import { UserRole } from '@prisma/client';
export declare class RegisterDto {
    fullName: string;
    email: string;
    phoneNumber: string;
    password: string;
    role: UserRole;
    cnicNumber?: string;
    drivingLicenseNumber?: string;
    workshopName?: string;
    workshopAddress?: string;
    specialization?: string;
}
