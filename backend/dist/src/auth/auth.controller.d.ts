import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto): Promise<{
        message: string;
        userId: string;
    }>;
    login(loginDto: LoginDto): Promise<{
        user: {
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
        };
        accessToken: string;
        refreshToken: string;
    }>;
    refresh(sessionUser: {
        userId: string;
        email: string;
        refreshToken: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(user: {
        id: string;
    }, refreshToken: string): Promise<{
        message: string;
    }>;
    verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{
        message: string;
    }>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
        message: string;
    }>;
}
