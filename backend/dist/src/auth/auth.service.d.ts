import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    private configService;
    private emailService;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService, emailService: EmailService);
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
    refreshTokens(userId: string, refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string, refreshToken: string): Promise<{
        message: string;
    }>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    private generateTokens;
    private saveRefreshToken;
}
