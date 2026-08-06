import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
   constructor(
    private authService: AuthService,
    private googleAuthService: GoogleAuthService,
    private prisma: PrismaService,
  ) {}
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or pre-register via Google Sign-In' })
  async googleLogin(@Body('idToken') idToken: string) {
    if (!idToken) {
      throw new (await import('@nestjs/common')).BadRequestException('idToken is required');
    }
    const result = await this.googleAuthService.verifyGoogleToken(idToken);

    if (result.isNewUser) {
      return { isNewUser: true, googleData: result.googleData };
    }

    // Fetch user fresh from DB (guaranteed to exist)
    const user = await this.prisma.user.findUnique({
      where: { email: (result as any).email },
      include: { driverDetails: true, mechanicDetails: true },
    });

    if (!user) {
      throw new (await import('@nestjs/common')).UnauthorizedException('User not found');
    }

    return this.authService.loginWithGoogle(user);
  }
  @Post('google/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Complete registration after Google Sign-In (no password needed)' })
  async googleRegister(@Body() body: any) {
    return this.authService.registerWithGoogle(body);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new Driver or Mechanic account' })
  @ApiResponse({ status: 201, description: 'User successfully created.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 409, description: 'Email or phone already exists.' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login using email or phone number' })
  @ApiResponse({ status: 200, description: 'Login successful.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access and rotate refresh token' })
  async refresh(@CurrentUser() sessionUser: { userId: string; email: string; refreshToken: string }) {
    return this.authService.refreshTokens(sessionUser.userId, sessionUser.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate current refresh token' })
  async logout(
    @CurrentUser() user: { id: string },
    @Body('refreshToken') refreshToken: string,
  ) {
    return this.authService.logout(user.id, refreshToken);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email using token' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email by link (browser)' })
  async verifyEmailByLink(@Query('token') token: string, @Res() res: Response) {
    try {
      await this.authService.verifyEmail(token);
      return res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #121212; color: white;">
            <h1 style="color: #4caf50;">✅ Email Verified!</h1>
            <p>Your ResQDrive account is now active. You can close this page and log in from the app.</p>
          </body>
        </html>
      `);
    } catch (err) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #121212; color: white;">
            <h1 style="color: #d32f2f;">❌ Verification Failed</h1>
            <p>This link may have expired or already been used.</p>
          </body>
        </html>
      `);
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}