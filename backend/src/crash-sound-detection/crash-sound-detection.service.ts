import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDetectionLogDto } from './dto/create-detection-log.dto';

@Injectable()
export class CrashSoundDetectionService {
  constructor(private prisma: PrismaService) {}

  async logWindow(userId: string, dto: CreateDetectionLogDto) {
    return this.prisma.crashSoundDetectionLog.create({
      data: {
        userId,
        incidentId: dto.incidentId,
        windowTimestamp: new Date(dto.windowTimestamp),
        topMatchedClass: dto.topMatchedClass,
        crashConfidence: dto.crashConfidence,
        thresholdUsed: dto.thresholdUsed,
        flaggedAsCrash: dto.flaggedAsCrash,
        combinedWithSensorSignal: dto.combinedWithSensorSignal ?? false,
        triggeredByTransient: dto.triggeredByTransient ?? true,
      },
    });
  }

  async getHistory(userId: string, flaggedAsCrash?: boolean, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (flaggedAsCrash !== undefined) {
      where.flaggedAsCrash = flaggedAsCrash;
    }

    const [logs, total] = await Promise.all([
      this.prisma.crashSoundDetectionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.crashSoundDetectionLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
