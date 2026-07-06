import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LocationSessionStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const SESSION_AUTO_EXPIRY_MS = 2 * 60 * 60 * 1000;

@Injectable()
export class LocationSharingService {
  constructor(private prisma: PrismaService) {}

  async startSession(userId: string, incidentId?: string) {
    const activeSession = await this.prisma.locationSession.findFirst({
      where: { userId, status: LocationSessionStatus.ACTIVE },
    });
    if (activeSession) {
      throw new BadRequestException(
        'You already have an active location sharing session. Stop it first.',
      );
    }

    if (incidentId) {
      const incident = await this.prisma.incident.findFirst({
        where: { id: incidentId, userId, isDeleted: false },
      });
      if (!incident) {
        throw new NotFoundException('Incident not found');
      }
    }

    const shareToken = randomBytes(24).toString('hex');

    const session = await this.prisma.locationSession.create({
      data: {
        userId,
        incidentId: incidentId || null,
        shareToken,
        status: LocationSessionStatus.ACTIVE,
        startedAt: new Date(),
      },
    });

    return {
      sessionId: session.id,
      shareToken: session.shareToken,
      shareUrl: `/track.html?session=${session.shareToken}`,
      startedAt: session.startedAt,
    };
  }

  async stopSession(userId: string, sessionId: string) {
    const session = await this.prisma.locationSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.status !== LocationSessionStatus.ACTIVE) {
      throw new BadRequestException(`Session is already ${session.status}`);
    }

    const updated = await this.prisma.locationSession.update({
      where: { id: sessionId },
      data: {
        status: LocationSessionStatus.ENDED,
        endedAt: new Date(),
      },
    });

    return { sessionId: updated.id, status: updated.status, endedAt: updated.endedAt };
  }

  async getSessionByShareToken(shareToken: string) {
    const session = await this.prisma.locationSession.findUnique({
      where: { shareToken },
      include: {
        user: {
          select: { id: true, fullName: true, phoneNumber: true },
        },
      },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const now = Date.now();
    const lastUpdate = session.lastUpdateAt ? session.lastUpdateAt.getTime() : session.startedAt.getTime();
    const isExpired = session.status === LocationSessionStatus.ACTIVE && now - lastUpdate > SESSION_AUTO_EXPIRY_MS;

    if (isExpired) {
      await this.prisma.locationSession.update({
        where: { id: session.id },
        data: { status: LocationSessionStatus.EXPIRED, endedAt: new Date() },
      });
      return { ...session, status: LocationSessionStatus.EXPIRED };
    }

    return session;
  }

  async updateLocation(sessionId: string, lat: number, lng: number) {
    const session = await this.prisma.locationSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.status !== LocationSessionStatus.ACTIVE) {
      return null;
    }

    return this.prisma.locationSession.update({
      where: { id: sessionId },
      data: {
        lastLat: lat,
        lastLng: lng,
        lastUpdateAt: new Date(),
      },
    });
  }

  async getStatus(userId: string) {
    const activeSession = await this.prisma.locationSession.findFirst({
      where: { userId, status: LocationSessionStatus.ACTIVE },
      select: {
        id: true,
        shareToken: true,
        startedAt: true,
        lastLat: true,
        lastLng: true,
        lastUpdateAt: true,
      },
    });

    if (!activeSession) return { active: false };

    return {
      active: true,
      sessionId: activeSession.id,
      shareUrl: `/track.html?session=${activeSession.shareToken}`,
      startedAt: activeSession.startedAt,
      lastLat: activeSession.lastLat,
      lastLng: activeSession.lastLng,
      lastUpdateAt: activeSession.lastUpdateAt,
    };
  }
    async getShareTokenBySessionId(sessionId: string): Promise<string | null> {
    const session = await this.prisma.locationSession.findUnique({
      where: { id: sessionId },
      select: { shareToken: true },
    });
    return session?.shareToken || null;
  }
}