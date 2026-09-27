import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { UserRole } from '@prisma/client';

/**
 * AdminAuditService — read-side for the audit log + broadcast + force-end operations.
 *
 * Methods:
 *   - listAuditLogs(query) — paginated list with filters (adminUserId,
 *     action, resourceType, resourceId, dateFrom, dateTo)
 *   - broadcastNotification(dto) — send a push notification to a segment
 *     of users (ALL / DRIVERS / MECHANICS). Uses NotificationsService.send()
 *     per user in a loop — non-transactional (partial failures don't roll
 *     back the entire broadcast).
 *   - forceEndLocationSession(id) — set status=ENDED + endedAt=now() on a
 *     LocationSession. Useful for ops/security when a session is stuck.
 *   - forceEndEmergencySession(id) — set status=EXHAUSTED + cancelledAt=now()
 *     on a NotificationSession. Stops further escalation attempts.
 *   - purgeStaleDeviceTokens() — deletes DeviceToken rows where isActive=false
 *     OR updatedAt is older than 90 days. Keeps the table clean.
 */
@Injectable()
export class AdminAuditService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async listAuditLogs(query: {
    page?: number;
    limit?: number;
    adminUserId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.adminUserId) where.adminUserId = query.adminUserId;
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.resourceType) where.resourceType = query.resourceType;
    if (query.resourceId) where.resourceId = query.resourceId;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          adminUser: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Broadcast a notification to a segment of users.
   * Returns { sentCount, failedCount, totalUsers }.
   */
  async broadcastNotification(dto: {
    title: string;
    body: string;
    category?: string;
    segment: 'ALL' | 'DRIVERS' | 'MECHANICS';
  }) {
    const where: any = { isActive: true };
    if (dto.segment === 'DRIVERS') where.role = UserRole.DRIVER;
    else if (dto.segment === 'MECHANICS') where.role = UserRole.MECHANIC;
    // ALL → no role filter

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });

    let sent = 0;
    let failed = 0;

    // Fire-and-forget per-user — partial failures don't fail the whole broadcast
    for (const user of users) {
      try {
        await this.notificationsService.send(
          user.id,
          (dto.category as any) || 'general',
          dto.title,
          dto.body,
        );
        sent++;
      } catch (err) {
        failed++;
      }
    }

    return {
      sentCount: sent,
      failedCount: failed,
      totalUsers: users.length,
      segment: dto.segment,
    };
  }

  async forceEndLocationSession(id: string) {
    const session = await this.prisma.locationSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Location session not found');
    if (session.status === 'ENDED') return session; // idempotent
    return this.prisma.locationSession.update({
      where: { id },
      data: { status: 'ENDED' as any, endedAt: new Date() },
    });
  }

  async forceEndEmergencySession(id: string) {
    const session = await this.prisma.notificationSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Emergency session not found');
    if (session.status === 'EXHAUSTED' || session.status === 'CANCELLED') return session; // idempotent
    return this.prisma.notificationSession.update({
      where: { id },
      data: {
        status: 'EXHAUSTED' as any,
        cancelledAt: new Date(),
        nextEscalationAt: null, // stop scheduler from picking this up
      },
    });
  }

  async purgeStaleDeviceTokens() {
    // Delete tokens that are inactive OR haven't been refreshed in 90 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const result = await this.prisma.deviceToken.deleteMany({
      where: {
        OR: [
          { isActive: false },
          { updatedAt: { lt: cutoff } },
        ],
      },
    });

    return {
      deletedCount: result.count,
      message: `Purged ${result.count} stale device token${result.count === 1 ? '' : 's'}.`,
    };
  }
}
