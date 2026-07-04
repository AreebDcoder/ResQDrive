import { Injectable, Logger } from '@nestjs/common';
import { IncidentSeverity, IncidentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@Injectable()
export class AdminAnalyticsService {
  private readonly logger = new Logger(AdminAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  private buildDateFilter(query: AnalyticsQueryDto) {
    const where: any = { isDeleted: false };
    if (query.dateFrom || query.dateTo) {
      where.occurredAt = {};
      if (query.dateFrom) where.occurredAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.occurredAt.lte = new Date(query.dateTo);
    }
    return where;
  }

  async getSummary(query: AnalyticsQueryDto) {
    const where = this.buildDateFilter(query);

    const [
      totalIncidents,
      activeIncidents,
      resolvedIncidents,
      falseAlarms,
      severityGroups,
      recentIncidents,
    ] = await Promise.all([
      this.prisma.incident.count({ where }),
      this.prisma.incident.count({ where: { ...where, status: IncidentStatus.ACTIVE } }),
      this.prisma.incident.count({ where: { ...where, status: IncidentStatus.RESOLVED } }),
      this.prisma.incident.count({ where: { ...where, status: IncidentStatus.FALSE_ALARM } }),
      this.prisma.incident.groupBy({
        by: ['severity'],
        where,
        _count: { severity: true },
      }),
      this.prisma.incident.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        take: 5,
        select: {
          id: true,
          occurredAt: true,
          severity: true,
          status: true,
          address: true,
        },
      }),
    ]);

    const severityBreakdown = {
      NONE: 0, MINOR: 0, MODERATE: 0, SEVERE: 0,
    };
    for (const g of severityGroups) {
      severityBreakdown[g.severity] = g._count.severity;
    }

    const severityPercentages = {
      NONE: totalIncidents ? Math.round((severityBreakdown.NONE / totalIncidents) * 100) : 0,
      MINOR: totalIncidents ? Math.round((severityBreakdown.MINOR / totalIncidents) * 100) : 0,
      MODERATE: totalIncidents ? Math.round((severityBreakdown.MODERATE / totalIncidents) * 100) : 0,
      SEVERE: totalIncidents ? Math.round((severityBreakdown.SEVERE / totalIncidents) * 100) : 0,
    };

    return {
      totalIncidents,
      activeIncidents,
      resolvedIncidents,
      falseAlarms,
      severityBreakdown,
      severityPercentages,
      recentIncidents,
    };
  }

  async getTrends(query: AnalyticsQueryDto) {
    const where = this.buildDateFilter(query);

    const days = 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const effectiveWhere = {
      ...where,
      occurredAt: { ...(where.occurredAt || {}), gte: startDate },
    };

    const incidents = await this.prisma.incident.findMany({
      where: effectiveWhere,
      select: { occurredAt: true },
    });

    const dayMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dayMap.set(d.toISOString().slice(0, 10), 0);
    }

    for (const inc of incidents) {
      const key = inc.occurredAt.toISOString().slice(0, 10);
      dayMap.set(key, (dayMap.get(key) || 0) + 1);
    }

    return Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));
  }

  async getHotspots(query: AnalyticsQueryDto) {
    const where = {
      ...this.buildDateFilter(query),
      latitude: { not: null },
      longitude: { not: null },
    };

    const limit = query.limit ?? 10;

    const incidents = await this.prisma.incident.findMany({
      where,
      select: { latitude: true, longitude: true, address: true },
    });

    const clusters = new Map<string, { lat: number; lng: number; count: number; addresses: Set<string> }>();

    for (const inc of incidents) {
      const lat = inc.latitude!;
      const lng = inc.longitude!;
      const clusterLat = Math.round(lat * 100) / 100;
      const clusterLng = Math.round(lng * 100) / 100;
      const key = `${clusterLat},${clusterLng}`;

      if (!clusters.has(key)) {
        clusters.set(key, { lat: clusterLat, lng: clusterLng, count: 0, addresses: new Set() });
      }
      const cluster = clusters.get(key)!;
      cluster.count += 1;
      if (inc.address) cluster.addresses.add(inc.address);
    }

    return Array.from(clusters.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((c) => ({
        latitude: c.lat,
        longitude: c.lng,
        incidentCount: c.count,
        sampleAddresses: Array.from(c.addresses).slice(0, 3),
      }));
  }
}