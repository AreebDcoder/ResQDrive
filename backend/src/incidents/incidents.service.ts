import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { IncidentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { QueryIncidentsDto } from './dto/query-incidents.dto';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateIncidentDto) {
    const occurredAt = new Date(dto.occurredAt);
    if (isNaN(occurredAt.getTime())) {
      throw new BadRequestException('occurredAt must be a valid ISO date string');
    }

    const incident = await this.prisma.incident.create({
      data: {
        userId,
        type: dto.type,
        severity: dto.severity,
        status: dto.status,
        occurredAt,
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address,
        description: dto.description,
        sensorSnapshot: dto.sensorSnapshot as any,
        alertDispatchStatus: dto.alertDispatchStatus as any,
        damageAssessmentResult: dto.damageAssessmentResult as any,
      },
    });

    this.logger.log(`Incident created: ${incident.id} for user ${userId}`);
    return incident;
  }

  async findAll(userId: string, query: QueryIncidentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      isDeleted: false,
    };

    if (query.type) where.type = query.type;
    if (query.severity) where.severity = query.severity;
    if (query.status) where.status = query.status;

    if (query.dateFrom || query.dateTo) {
      where.occurredAt = {};
      if (query.dateFrom) where.occurredAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.occurredAt.lte = new Date(query.dateTo);
    }

    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.incident.findMany({
        where,
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.incident.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { id, userId, isDeleted: false },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    return incident;
  }

  async update(userId: string, id: string, dto: UpdateIncidentDto) {
    const existing = await this.findOne(userId, id);

    const data: any = { ...dto };

    if (dto.occurredAt) {
      const occurredAt = new Date(dto.occurredAt);
      if (isNaN(occurredAt.getTime())) {
        throw new BadRequestException('occurredAt must be a valid ISO date string');
      }
      data.occurredAt = occurredAt;
    }

    const updated = await this.prisma.incident.update({
      where: { id: existing.id },
      data,
    });

    this.logger.log(`Incident updated: ${updated.id} for user ${userId}`);
    return updated;
  }

  async remove(userId: string, id: string) {
    const existing = await this.findOne(userId, id);

    await this.prisma.incident.update({
      where: { id: existing.id },
      data: { isDeleted: true, status: IncidentStatus.ARCHIVED },
    });

    this.logger.log(`Incident soft-deleted: ${existing.id} for user ${userId}`);
    return { message: 'Incident deleted successfully' };
  }
}