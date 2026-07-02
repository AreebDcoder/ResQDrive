import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { fullName, email, phoneNumber, password, role } = registerDto;

    if (role === UserRole.ADMIN) {
      throw new BadRequestException('Admin accounts cannot self-register.');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { phoneNumber }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('Email address is already registered.');
      }
      throw new ConflictException('Phone number is already registered.');
    }

    if (role === UserRole.DRIVER) {
      if (!registerDto.cnicNumber || !registerDto.drivingLicenseNumber) {
        throw new BadRequestException('Drivers must provide CNIC and driving license numbers.');
      }
    } else if (role === UserRole.MECHANIC) {
      if (!registerDto.workshopName || !registerDto.workshopAddress || !registerDto.specialization) {
        throw new BadRequestException('Mechanics must provide workshop name, address, and specialization.');
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

      if (role === UserRole.DRIVER) {
        await tx.driverDetails.create({
          data: {
            userId: user.id,
            cnicNumber: registerDto.cnicNumber,
            drivingLicenseNumber: registerDto.drivingLicenseNumber,
          },
        });
      } else if (role === UserRole.MECHANIC) {
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

    const verificationToken = this.jwtService.sign(
      { sub: result.id, email: result.email },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '24h',
      },
    );

    await this.emailService.sendVerificationEmail(result.email, result.fullName, verificationToken);

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      userId: result.id,
    };
  }

  async login(loginDto: LoginDto) {
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
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated. Please contact support.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    const { passwordHash, ...userWithoutPassword } = user;

    return {
      ...tokens,
      user: userWithoutPassword,
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Access Denied. Invalid session.');
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
      throw new UnauthorizedException('Session expired or token reused. Please login again.');
    }

    await this.prisma.refreshToken.delete({
      where: { id: matchingToken.id },
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string, refreshToken: string) {
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

  async verifyEmail(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { isVerified: true },
      });

      return { message: 'Email address successfully verified.' };
    } catch (error) {
      throw new BadRequestException('Invalid or expired verification link.');
    }
  }

  async forgotPassword(email: string) {
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

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        token,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token.');
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

  private async generateTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: '15m',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async saveRefreshToken(userId: string, token: string) {
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
}
