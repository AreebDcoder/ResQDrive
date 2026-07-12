import { Injectable, Logger, HttpException, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { ConfigService } from '@nestjs/config';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class DamageAssessmentService {
  private readonly logger = new Logger(DamageAssessmentService.name);
  private readonly fastApiUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {
    this.fastApiUrl = this.configService.get<string>('FASTAPI_API_URL') || 'http://localhost:8000';
  }

  async createAssessment(
    userId: string,
    file: Express.Multer.File,
    dto: CreateAssessmentDto,
  ) {
    // 1. Upload photo to local storage (or Cloudinary if configured)
    const photoUrl = await this.uploadService.uploadDamagePhoto(file);

    // 2. Prepare FormData to send to the FastAPI microservice
    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    let predictData;
    try {
      // 3. Request classification from FastAPI
      const response = await axios.post(`${this.fastApiUrl}/predict`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 10000, // 10 seconds timeout
      });
      predictData = response.data;
    } catch (err: any) {
      this.logger.error(`Failed to connect to FastAPI microservice at ${this.fastApiUrl}/predict: ${err.message}`);
      throw new ServiceUnavailableException('Damage assessment inference service is temporarily unavailable.');
    }

    // 4. Save metadata in PostgreSQL database using Prisma
    try {
      const assessment = await this.prisma.damageAssessment.create({
        data: {
          userId,
          vehicleId: dto.vehicleId || null,
          incidentId: dto.incidentId || null,
          photoUrl,
          predictedDamageType: predictData.damage_type,
          confidenceScore: predictData.confidence,
          derivedSeverity: predictData.severity,
          inferenceTimeMs: predictData.inference_time_ms || null,
          modelVersion: 'cardd_v1',
          partTag: dto.partTag || 'other',
        },
      });

      return {
        ...assessment,
        allScores: predictData.all_scores,
      };
    } catch (err: any) {
      this.logger.error(`Database save failed for damage assessment: ${err.message}`);
      throw new HttpException('Failed to save damage assessment record.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getHistory(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [assessments, total] = await Promise.all([
      this.prisma.damageAssessment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.damageAssessment.count({
        where: { userId },
      }),
    ]);

    return {
      data: assessments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAssessmentDetail(userId: string, id: string) {
    const assessment = await this.prisma.damageAssessment.findUnique({
      where: { id },
    });

    if (!assessment) {
      throw new HttpException('Damage assessment not found.', HttpStatus.NOT_FOUND);
    }

    if (assessment.userId !== userId) {
      throw new HttpException('Forbidden access to this damage assessment.', HttpStatus.FORBIDDEN);
    }

    return assessment;
  }

  async deleteAssessment(userId: string, id: string) {
    const assessment = await this.prisma.damageAssessment.findUnique({
      where: { id },
    });

    if (!assessment) {
      throw new HttpException('Damage assessment not found.', HttpStatus.NOT_FOUND);
    }

    if (assessment.userId !== userId) {
      throw new HttpException('Forbidden access to this damage assessment.', HttpStatus.FORBIDDEN);
    }

    await this.prisma.damageAssessment.delete({
      where: { id },
    });

    return { success: true };
  }
}
