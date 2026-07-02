"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("../email/email.service");
let AuthService = class AuthService {
    constructor(prisma, jwtService, configService, emailService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        this.emailService = emailService;
    }
    async register(registerDto) {
        const { fullName, email, phoneNumber, password, role } = registerDto;
        if (role === client_1.UserRole.ADMIN) {
            throw new common_1.BadRequestException('Admin accounts cannot self-register.');
        }
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [{ email }, { phoneNumber }],
            },
        });
        if (existingUser) {
            if (existingUser.email === email) {
                throw new common_1.ConflictException('Email address is already registered.');
            }
            throw new common_1.ConflictException('Phone number is already registered.');
        }
        if (role === client_1.UserRole.DRIVER) {
            if (!registerDto.cnicNumber || !registerDto.drivingLicenseNumber) {
                throw new common_1.BadRequestException('Drivers must provide CNIC and driving license numbers.');
            }
        }
        else if (role === client_1.UserRole.MECHANIC) {
            if (!registerDto.workshopName || !registerDto.workshopAddress || !registerDto.specialization) {
                throw new common_1.BadRequestException('Mechanics must provide workshop name, address, and specialization.');
            }
        }
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const result = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    fullName,
                    email,
                    phoneNumber,
                    passwordHash,
                    role,
                },
            });
            if (role === client_1.UserRole.DRIVER) {
                await tx.driverDetails.create({
                    data: {
                        userId: user.id,
                        cnicNumber: registerDto.cnicNumber,
                        drivingLicenseNumber: registerDto.drivingLicenseNumber,
                    },
                });
            }
            else if (role === client_1.UserRole.MECHANIC) {
                await tx.mechanicDetails.create({
                    data: {
                        userId: user.id,
                        workshopName: registerDto.workshopName,
                        workshopAddress: registerDto.workshopAddress,
                        specialization: registerDto.specialization,
                    },
                });
            }
            return user;
        });
        const verificationToken = this.jwtService.sign({ sub: result.id, email: result.email }, {
            secret: this.configService.get('JWT_ACCESS_SECRET'),
            expiresIn: '24h',
        });
        await this.emailService.sendVerificationEmail(result.email, result.fullName, verificationToken);
        return {
            message: 'Registration successful. Please check your email to verify your account.',
            userId: result.id,
        };
    }
    async login(loginDto) {
        const { emailOrPhone, password } = loginDto;
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [{ email: emailOrPhone }, { phoneNumber: emailOrPhone }],
            },
            include: {
                driverDetails: true,
                mechanicDetails: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials.');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Your account has been deactivated. Please contact support.');
        }
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials.');
        }
        const tokens = await this.generateTokens(user.id, user.email);
        await this.saveRefreshToken(user.id, tokens.refreshToken);
        const { passwordHash, ...userWithoutPassword } = user;
        return {
            ...tokens,
            user: userWithoutPassword,
        };
    }
    async refreshTokens(userId, refreshToken) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Access Denied. Invalid session.');
        }
        const dbTokens = await this.prisma.refreshToken.findMany({
            where: { userId },
        });
        let matchingToken = null;
        for (const dbToken of dbTokens) {
            const isMatch = await bcrypt.compare(refreshToken, dbToken.tokenHash);
            if (isMatch) {
                matchingToken = dbToken;
                break;
            }
        }
        if (!matchingToken || matchingToken.expiresAt < new Date()) {
            await this.prisma.refreshToken.deleteMany({ where: { userId } });
            throw new common_1.UnauthorizedException('Session expired or token reused. Please login again.');
        }
        await this.prisma.refreshToken.delete({
            where: { id: matchingToken.id },
        });
        const tokens = await this.generateTokens(user.id, user.email);
        await this.saveRefreshToken(user.id, tokens.refreshToken);
        return tokens;
    }
    async logout(userId, refreshToken) {
        const dbTokens = await this.prisma.refreshToken.findMany({
            where: { userId },
        });
        for (const dbToken of dbTokens) {
            const isMatch = await bcrypt.compare(refreshToken, dbToken.tokenHash);
            if (isMatch) {
                await this.prisma.refreshToken.delete({
                    where: { id: dbToken.id },
                });
                break;
            }
        }
        return { message: 'Logged out successfully.' };
    }
    async verifyEmail(token) {
        try {
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get('JWT_ACCESS_SECRET'),
            });
            await this.prisma.user.update({
                where: { id: payload.sub },
                data: { isVerified: true },
            });
            return { message: 'Email address successfully verified.' };
        }
        catch (error) {
            throw new common_1.BadRequestException('Invalid or expired verification link.');
        }
    }
    async forgotPassword(email) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return { message: 'If the email matches an active account, a reset code has been sent.' };
        }
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        await this.prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                token,
                expiresAt,
            },
        });
        await this.emailService.sendPasswordResetEmail(user.email, user.fullName, token);
        return { message: 'If the email matches an active account, a reset code has been sent.' };
    }
    async resetPassword(resetPasswordDto) {
        const { token, password } = resetPasswordDto;
        const resetToken = await this.prisma.passwordResetToken.findFirst({
            where: {
                token,
                used: false,
                expiresAt: { gt: new Date() },
            },
        });
        if (!resetToken) {
            throw new common_1.BadRequestException('Invalid or expired reset token.');
        }
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: resetToken.userId },
                data: { passwordHash },
            });
            await tx.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { used: true },
            });
            await tx.refreshToken.deleteMany({
                where: { userId: resetToken.userId },
            });
        });
        return { message: 'Password reset successful. You can now login with your new password.' };
    }
    async generateTokens(userId, email) {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync({ sub: userId, email }, {
                secret: this.configService.get('JWT_ACCESS_SECRET'),
                expiresIn: '15m',
            }),
            this.jwtService.signAsync({ sub: userId, email }, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: '7d',
            }),
        ]);
        return {
            accessToken,
            refreshToken,
        };
    }
    async saveRefreshToken(userId, token) {
        const saltRounds = 10;
        const tokenHash = await bcrypt.hash(token, saltRounds);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await this.prisma.refreshToken.create({
            data: {
                userId,
                tokenHash,
                expiresAt,
            },
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map