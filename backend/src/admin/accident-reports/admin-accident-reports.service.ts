import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * AdminAccidentReportsService — admin-scoped accident report management.
 *
 * AccidentReport records are created by the mobile app (post-SOS) when the
 * user reports an accident that auto-dialed a regional emergency service.
 * Admins can view all reports and delete them (e.g. fake/spam reports).
 *
 * Methods:
 *   - listAll(query) — paginated list with filters (search by user/service/region,
 *     filter by severity/userId/autoDialed)
 *   - findOne(id) — single report with user + vehicle
 *   - remove(id) — hard delete report (also deletes PDF from filesystem if
 *     present — deferred to Batch 8 file cleanup)
 */
@Injectable()
export class AdminAccidentReportsService {
  constructor(private prisma: PrismaService) {}

  async listAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    severity?: string;
    userId?: string;
    autoDialed?: boolean;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.severity) where.severity = query.severity;
    if (query.userId) where.userId = query.userId;
    if (query.autoDialed !== undefined) where.autoDialed = query.autoDialed;

    if (query.search) {
      where.OR = [
        { detectedRegion: { contains: query.search, mode: 'insensitive' } },
        { calledServiceName: { contains: query.search, mode: 'insensitive' } },
        { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
        { user: { phoneNumber: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.accidentReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
          vehicle: { select: { id: true, make: true, model: true, year: true, licensePlate: true } },
        },
      }),
      this.prisma.accidentReport.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const report = await this.prisma.accidentReport.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true, phoneNumber: true, role: true } },
        vehicle: { select: { id: true, make: true, model: true, year: true, licensePlate: true, color: true } },
      },
    });
    if (!report) {
      throw new NotFoundException('Accident report not found.');
    }
    return report;
  }

  async remove(id: string) {
    const report = await this.prisma.accidentReport.findUnique({ where: { id } });
    if (!report) {
      throw new NotFoundException('Accident report not found.');
    }
    await this.prisma.accidentReport.delete({ where: { id } });
    return { message: 'Accident report permanently deleted.' };
  }
}
