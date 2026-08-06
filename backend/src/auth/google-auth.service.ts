import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoogleAuthService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async verifyGoogleToken(idToken: string) {
    let googleUser: { sub: string; email: string; name: string; picture?: string; aud?: string };
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
      );
      if (!response.ok) {
        throw new UnauthorizedException('Invalid Google token');
      }
      googleUser = await response.json();

      const webClientId = this.configService.get<string>('GOOGLE_WEB_CLIENT_ID');
      if (webClientId && googleUser.aud !== webClientId) {
        throw new UnauthorizedException('Google token audience mismatch');
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Failed to verify Google token');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
      include: { driverDetails: true, mechanicDetails: true },
    });

    if (existingUser) {
      return {
        isNewUser: false,
        email: googleUser.email,
        user: existingUser,
      };
    }

    return {
      isNewUser: true,
      googleData: {
        fullName: googleUser.name,
        email: googleUser.email,
        profilePictureUrl: googleUser.picture || null,
      },
    };
  }
}