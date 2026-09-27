import axios from 'axios';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { IncidentStatus, NotificationCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { QueryIncidentsDto } from './dto/query-incidents.dto';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  private cleanLocationAddress(text?: string): string {
    if (!text) return '';
    return text
      .replace(/[A-Z0-9]{2,8}\+[A-Z0-9]{2,8}[,\s]*/gi, '') // Remove Google Plus Codes (e.g. JV59+82V)
      .replace(/,\s*,+/g, ', ')
      .replace(/^[\s,]+|[\s,]+$/g, '')
      .trim();
  }

  private isPlusCode(text?: string): boolean {
    if (!text) return false;
    return /^[A-Z0-9]{2,8}\+[A-Z0-9]{2,8}/i.test(text.trim());
  }

  private async reverseGeocodeLocation(lat: number, lng: number): Promise<string> {
    try {
      const geoapifyKey = process.env.GEOAPIFY_API_KEY;
      if (geoapifyKey) {
        const res = await axios.get('https://api.geoapify.com/v1/geocode/reverse', {
          params: { lat, lon: lng, apiKey: geoapifyKey },
          timeout: 2500,
        });
        const props = res.data.features?.[0]?.properties;
        if (props) {
          const parts: string[] = [];
          const street = props.street || props.address_line1;
          if (street && !this.isPlusCode(street)) parts.push(street);
          if (props.suburb || props.district) parts.push(props.suburb || props.district);
          if (props.city && !parts.includes(props.city)) parts.push(props.city);
          if (parts.length > 0) return this.cleanLocationAddress(parts.join(', '));
          if (props.formatted) {
            const cleaned = this.cleanLocationAddress(props.formatted.split(',').slice(0, 3).join(', '));
            if (cleaned) return cleaned;
          }
        }
      }
    } catch (e) {}

    try {
      const osmRes = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: { lat, lon: lng, format: 'json' },
        headers: { 'User-Agent': 'ResQDrive-Incident-Service/1.0' },
        timeout: 2000,
      });
      if (osmRes.data?.address) {
        const addr = osmRes.data.address;
        const parts: string[] = [];
        const road = addr.road || addr.street;
        if (road && !this.isPlusCode(road)) parts.push(road);
        if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
        if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
        if (parts.length > 0) return this.cleanLocationAddress(parts.join(', '));
      }
      if (osmRes.data?.display_name) {
        const cleaned = this.cleanLocationAddress(osmRes.data.display_name.split(',').slice(0, 3).join(', '));
        if (cleaned) return cleaned;
      }
    } catch (e) {}

    return `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  async create(userId: string, dto: CreateIncidentDto) {
    const occurredAt = new Date(dto.occurredAt);
    if (isNaN(occurredAt.getTime())) {
      throw new BadRequestException('occurredAt must be a valid ISO date string');
    }

    let resolvedAddress = dto.address;
    if ((!resolvedAddress || resolvedAddress === 'Unknown' || resolvedAddress.trim() === '') && dto.latitude && dto.longitude) {
      try {
        resolvedAddress = await this.reverseGeocodeLocation(dto.latitude, dto.longitude);
      } catch (err: any) {
        resolvedAddress = `Near ${dto.latitude.toFixed(4)}, ${dto.longitude.toFixed(4)}`;
      }
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
        address: resolvedAddress || dto.address,
        description: dto.description,
        sensorSnapshot: dto.sensorSnapshot as any,
        alertDispatchStatus: dto.alertDispatchStatus as any,
        damageAssessmentResult: dto.damageAssessmentResult as any,
      },
    });

    this.logger.log(`Incident created: ${incident.id} for user ${userId} (Address: ${incident.address})`);

    // Dispatch push notification to user's registered devices when an active or severe incident is created
    if (dto.status === IncidentStatus.ACTIVE || dto.severity === 'SEVERE' || dto.severity === 'MODERATE') {
      await this.notificationsService
        .send(
          userId,
          NotificationCategory.alert_delivery_confirmation,
          `🚨 ResQDrive Alert: ${dto.severity} Incident Created`,
          `An active ${dto.severity.toLowerCase()} incident has been recorded. Emergency contacts & location tracking activated.`,
          { incidentId: incident.id, severity: dto.severity },
        )
        .catch((err) =>
          this.logger.warn(`Failed to dispatch push notification for incident: ${err.message}`),
        );
    }

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