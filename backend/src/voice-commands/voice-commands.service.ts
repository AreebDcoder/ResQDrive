import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVoiceLogDto } from './dto/create-voice-log.dto';

@Injectable()
export class VoiceCommandsService {
  constructor(private prisma: PrismaService) {}

  async logCommand(userId: string, dto: CreateVoiceLogDto) {
    return this.prisma.voiceCommandLog.create({
      data: {
        userId,
        incidentId: dto.incidentId,
        rawTranscript: dto.rawTranscript,
        classifiedIntent: dto.classifiedIntent,
        recognitionEngine: dto.recognitionEngine,
        actionTaken: dto.actionTaken,
      },
    });
  }

  async getHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.voiceCommandLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.voiceCommandLog.count({ where: { userId } }),
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
