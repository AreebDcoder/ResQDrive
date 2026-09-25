import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IncidentSeverity, IncidentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AdminIncidentsQueryDto } from './dto/admin-incidents-query.dto';

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

  async listAllIncidents(query: AdminIncidentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };
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
        { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.incident.findMany({
        where,
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, phoneNumber: true, role: true },
          },
        },
      }),
      this.prisma.incident.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getIncidentById(id: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phoneNumber: true, role: true },
        },
      },
    });

    if (!incident || incident.isDeleted) {
      throw new NotFoundException('Incident not found');
    }

    return incident;
  }

    async getActiveEmergencySessions() {
    const sessions = await this.prisma.notificationSession.findMany({
      where: { status: 'ACTIVE' as any },
      include: {
        user: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
        incident: { select: { id: true, severity: true, occurredAt: true, address: true } },
      },
      orderBy: { triggeredAt: 'desc' },
    });
    return sessions;
  }

  async getActiveLocationSessions() {
    const sessions = await this.prisma.locationSession.findMany({
      where: { status: 'ACTIVE' as any },
      include: {
        user: { select: { id: true, fullName: true, phoneNumber: true } },
      },
      orderBy: { startedAt: 'desc' },
    });
    return sessions;
  }

async getRecentDispatchLogs(limit = 20) {
    const logs = await this.prisma.alertDispatchLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // Populate user info manually if userId is present
    const userIds = [...new Set(logs.map((l: any) => l.userId).filter(Boolean))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return logs.map((log: any) => ({
      ...log,
      user: log.userId ? userMap.get(log.userId) : null,
    }));
  }

  async getCrashDetectionLogs(limit = 50, skip = 0) {
    const [data, total] = await Promise.all([
      this.prisma.crashSoundDetectionLog.findMany({
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullName: true } } },
      }),
      this.prisma.crashSoundDetectionLog.count(),
    ]);
    return { data, total };
  }

  async getVoiceCommandLogs(limit = 50, skip = 0) {
    const [data, total] = await Promise.all([
      this.prisma.voiceCommandLog.findMany({
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullName: true } } },
      }),
      this.prisma.voiceCommandLog.count(),
    ]);
    return { data, total };
  }

  async getDamageAssessments(limit = 50) {
    return this.prisma.damageAssessment.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true } },
        vehicle: { select: { id: true, make: true, model: true } },
      },
    });
  }

  async getRepairCostReports(limit = 50, skip = 0) {
    const reports = await this.prisma.repairCostReport.findMany({
      take: limit,
      skip,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true } },
        vehicle: { select: { id: true, make: true, model: true } },
      },
    });

    const incidentIds = [...new Set(reports.map(r => r.incidentId).filter(Boolean))];
    const damageAssessments = incidentIds.length > 0 ? await this.prisma.damageAssessment.findMany({
      where: { incidentId: { in: incidentIds } },
      select: { incidentId: true, predictedDamageType: true, derivedSeverity: true, confidenceScore: true, photoUrl: true },
    }) : [];
    const damageMap = new Map(damageAssessments.map(d => [d.incidentId, d]));

    const data = reports.map(r => ({
      ...r,
      damageAssessment: r.incidentId ? damageMap.get(r.incidentId) : null,
    }));

    const total = await this.prisma.repairCostReport.count();
    return { data, total };
  }
    async resolveIncident(id: string) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');
    return this.prisma.incident.update({
      where: { id },
      data: { status: 'RESOLVED' as any },
    });
  }
    async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, fullName: true, email: true, phoneNumber: true,
        role: true, isVerified: true, isActive: true, createdAt: true,
        driverDetails: true, mechanicDetails: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const [incidents, vehicles, contacts] = await Promise.all([
      this.prisma.incident.findMany({
        where: { userId, isDeleted: false },
        orderBy: { occurredAt: 'desc' },
        take: 10,
        select: { id: true, severity: true, status: true, occurredAt: true, address: true },
      }),
      this.prisma.vehicle.findMany({
        where: { userId },
        select: { id: true, make: true, model: true, year: true, licensePlate: true, isPrimary: true },
      }),
      this.prisma.emergencyContact.findMany({
        where: { userId },
        orderBy: { priorityOrder: 'asc' },
        select: { id: true, name: true, phoneNumber: true, email: true, relationship: true, priorityOrder: true },
      }),
    ]);

    return { ...user, incidents, vehicles, contacts };
  }

  async getWorkshopQueue() {
    return this.prisma.user.findMany({
      where: {
        role: 'MECHANIC' as any,
        mechanicDetails: { isWorkshopVerified: false },
      },
      include: { mechanicDetails: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getNotificationHistory(limit = 50, skip = 0) {
    const [data, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullName: true } } },
      }),
      this.prisma.notificationLog.count(),
    ]);
    return { data, total };
  }

  // ───────────────────────────────────────────────────────────────────────
  // BATCH 5 — Extended dashboard summary + CSV export helpers
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Extended dashboard summary — gives the admin a single API call to fetch
   * all KPIs needed for the enhanced dashboard: user/vehicle counts,
   * notification success rate, severity trend over last 7 days,
   * incident type breakdown (AUTO vs MANUAL), dispatch success rate,
   * and recent activity feed.
   */
  async getExtendedDashboardSummary() {
    const [
      totalUsers,
      totalDrivers,
      totalMechanics,
      totalVehicles,
      totalIncidents,
      activeIncidents,
      resolvedIncidents,
      falseAlarms,
      autoDetected,
      manuallyLogged,
      totalNotifications,
      readNotifications,
      totalDispatchLogs,
      pushSent,
      smsSent,
      emailSent,
      totalRepairCostReports,
      totalDamageAssessments,
      totalCrashLogs,
      totalVoiceLogs,
      recentDispatchLogsRaw,
      recentIncidents,
      last7DaySeverity,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { role: 'DRIVER' as any, isActive: true } }),
      this.prisma.user.count({ where: { role: 'MECHANIC' as any, isActive: true } }),
      this.prisma.vehicle.count(),
      this.prisma.incident.count({ where: { isDeleted: false } }),
      this.prisma.incident.count({ where: { isDeleted: false, status: 'ACTIVE' as any } }),
      this.prisma.incident.count({ where: { isDeleted: false, status: 'RESOLVED' as any } }),
      this.prisma.incident.count({ where: { isDeleted: false, status: 'FALSE_ALARM' as any } }),
      this.prisma.incident.count({ where: { isDeleted: false, type: 'AUTO' as any } }),
      this.prisma.incident.count({ where: { isDeleted: false, type: 'MANUAL' as any } }),
      this.prisma.notificationLog.count(),
      this.prisma.notificationLog.count({ where: { isRead: true } }),
      this.prisma.alertDispatchLog.count(),
      this.prisma.alertDispatchLog.count({ where: { pushStatus: 'SENT' } }),
      this.prisma.alertDispatchLog.count({ where: { smsStatus: 'SENT' } }),
      this.prisma.alertDispatchLog.count({ where: { emailStatus: 'SENT' } }),
      this.prisma.repairCostReport.count(),
      this.prisma.damageAssessment.count(),
      this.prisma.crashSoundDetectionLog.count(),
      this.prisma.voiceCommandLog.count(),
      this.prisma.alertDispatchLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.incident.findMany({
        where: { isDeleted: false },
        take: 8,
        orderBy: { occurredAt: 'desc' },
        include: { user: { select: { fullName: true } } },
      }),
      this.buildLast7DaySeverityBreakdown(),
    ]);

    // Manual user lookup for dispatch logs (no direct relation in Prisma schema)
    const dispatchUserIds = [...new Set(recentDispatchLogsRaw.map((d: any) => d.userId).filter(Boolean))];
    const dispatchUsers = dispatchUserIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: dispatchUserIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const dispatchUserMap = new Map(dispatchUsers.map((u: any) => [u.id, u]));
    const recentDispatchLogs = recentDispatchLogsRaw.map((d: any) => ({
      ...d,
      user: d.userId ? dispatchUserMap.get(d.userId) : null,
    }));

    const resolveRate = totalIncidents
      ? Math.round((resolvedIncidents / totalIncidents) * 100)
      : 0;
    const notificationReadRate = totalNotifications
      ? Math.round((readNotifications / totalNotifications) * 100)
      : 0;
    const pushSuccessRate = totalDispatchLogs
      ? Math.round((pushSent / totalDispatchLogs) * 100)
      : 0;
    const smsSuccessRate = totalDispatchLogs
      ? Math.round((smsSent / totalDispatchLogs) * 100)
      : 0;
    const emailSuccessRate = totalDispatchLogs
      ? Math.round((emailSent / totalDispatchLogs) * 100)
      : 0;

    return {
      users: {
        total: totalUsers,
        drivers: totalDrivers,
        mechanics: totalMechanics,
        vehicles: totalVehicles,
      },
      incidents: {
        total: totalIncidents,
        active: activeIncidents,
        resolved: resolvedIncidents,
        falseAlarms,
        autoDetected,
        manuallyLogged,
        resolveRate,
      },
      notifications: {
        total: totalNotifications,
        read: readNotifications,
        readRate: notificationReadRate,
      },
      dispatch: {
        total: totalDispatchLogs,
        pushSent,
        smsSent,
        emailSent,
        pushSuccessRate,
        smsSuccessRate,
        emailSuccessRate,
      },
      ai: {
        repairReports: totalRepairCostReports,
        damageAssessments: totalDamageAssessments,
        crashLogs: totalCrashLogs,
        voiceLogs: totalVoiceLogs,
      },
      severityTrend7Days: last7DaySeverity,
      recentActivity: {
        incidents: recentIncidents.map((i: any) => ({
          id: i.id,
          severity: i.severity,
          status: i.status,
          occurredAt: i.occurredAt,
          userName: i.user?.fullName || 'Unknown',
          address: i.address,
        })),
        dispatchLogs: recentDispatchLogs.map((d: any) => ({
          id: d.id,
          user: d.user?.fullName || 'Unknown',
          pushStatus: d.pushStatus,
          smsStatus: d.smsStatus,
          emailStatus: d.emailStatus,
          createdAt: d.createdAt,
        })),
      },
    };
  }

  /**
   * Helper for extended dashboard — produces per-day severity breakdown
   * over the last 7 days (used to draw stacked bar/area chart).
   */
  private async buildLast7DaySeverityBreakdown() {
    const days = 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const incidents = await this.prisma.incident.findMany({
      where: { isDeleted: false, occurredAt: { gte: startDate } },
      select: { occurredAt: true, severity: true },
    });

    const dayMap = new Map<string, { NONE: number; MINOR: number; MODERATE: number; SEVERE: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dayMap.set(d.toISOString().slice(0, 10), { NONE: 0, MINOR: 0, MODERATE: 0, SEVERE: 0 });
    }

    for (const inc of incidents) {
      const key = inc.occurredAt.toISOString().slice(0, 10);
      const entry = dayMap.get(key);
      if (entry) {
        const sev = inc.severity as keyof typeof entry;
        if (sev in entry) entry[sev] += 1;
      }
    }

    return Array.from(dayMap.entries()).map(([date, counts]) => ({ date, ...counts }));
  }

  // ───────────────────────────────────────────────────────────────────────
  // CSV EXPORT HELPERS — used by /admin/export/:type endpoint
  // Each function returns a UTF-8 CSV string with header row.
  // ───────────────────────────────────────────────────────────────────────

  private csvEscape(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = typeof value === 'string' ? value : String(value);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private toCsv(rows: Record<string, any>[], headers: string[]): string {
    const headerLine = headers.join(',');
    const dataLines = rows.map((r) => headers.map((h) => this.csvEscape(r[h])).join(','));
    return [headerLine, ...dataLines].join('\n');
  }

  async exportIncidentsCsv(): Promise<string> {
    const incidents = await this.prisma.incident.findMany({
      where: { isDeleted: false },
      include: { user: { select: { fullName: true, email: true, phoneNumber: true } } },
      orderBy: { occurredAt: 'desc' },
    });

    const rows = incidents.map((i: any) => ({
      id: i.id,
      occurredAt: new Date(i.occurredAt).toISOString(),
      type: i.type,
      severity: i.severity,
      status: i.status,
      userName: i.user?.fullName || '',
      userEmail: i.user?.email || '',
      userPhone: i.user?.phoneNumber || '',
      latitude: i.latitude ?? '',
      longitude: i.longitude ?? '',
      address: i.address || '',
      description: i.description || '',
    }));

    return this.toCsv(rows, [
      'id', 'occurredAt', 'type', 'severity', 'status',
      'userName', 'userEmail', 'userPhone',
      'latitude', 'longitude', 'address', 'description',
    ]);
  }

  async exportRepairCostsCsv(): Promise<string> {
    const reports = await this.prisma.repairCostReport.findMany({
      include: {
        user: { select: { fullName: true } },
        vehicle: { select: { make: true, model: true, year: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = reports.map((r: any) => ({
      id: r.id,
      createdAt: new Date(r.createdAt).toISOString(),
      userName: r.user?.fullName || '',
      vehicle: r.vehicle ? `${r.vehicle.make} ${r.vehicle.model} ${r.vehicle.year}` : '',
      totalMinCostPkr: r.totalMinCostPkr,
      totalMaxCostPkr: r.totalMaxCostPkr,
      lineItems: typeof r.lineItems === 'string' ? r.lineItems : JSON.stringify(r.lineItems),
    }));

    return this.toCsv(rows, [
      'id', 'createdAt', 'userName', 'vehicle',
      'totalMinCostPkr', 'totalMaxCostPkr', 'lineItems',
    ]);
  }

  async exportNotificationsCsv(): Promise<string> {
    const logs = await this.prisma.notificationLog.findMany({
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const rows = logs.map((n: any) => ({
      id: n.id,
      createdAt: new Date(n.createdAt).toISOString(),
      userName: n.user?.fullName || '',
      userEmail: n.user?.email || '',
      category: n.category,
      title: n.title,
      body: n.body,
      isRead: n.isRead ? 'READ' : 'UNREAD',
      deliveryStatus: n.deliveryStatus,
    }));

    return this.toCsv(rows, [
      'id', 'createdAt', 'userName', 'userEmail',
      'category', 'title', 'body', 'isRead', 'deliveryStatus',
    ]);
  }

  async exportCrashLogsCsv(): Promise<string> {
    const logs = await this.prisma.crashSoundDetectionLog.findMany({
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const rows = logs.map((l: any) => ({
      id: l.id,
      createdAt: new Date(l.createdAt).toISOString(),
      windowTimestamp: new Date(l.windowTimestamp).toISOString(),
      userName: l.user?.fullName || '',
      topMatchedClass: l.topMatchedClass || '',
      crashConfidence: l.crashConfidence,
      thresholdUsed: l.thresholdUsed,
      flaggedAsCrash: l.flaggedAsCrash ? 'YES' : 'NO',
      combinedWithSensorSignal: l.combinedWithSensorSignal ? 'YES' : 'NO',
      triggeredByTransient: l.triggeredByTransient ? 'YES' : 'NO',
    }));

    return this.toCsv(rows, [
      'id', 'createdAt', 'windowTimestamp', 'userName',
      'topMatchedClass', 'crashConfidence', 'thresholdUsed',
      'flaggedAsCrash', 'combinedWithSensorSignal', 'triggeredByTransient',
    ]);
  }

  async exportVoiceLogsCsv(): Promise<string> {
    const logs = await this.prisma.voiceCommandLog.findMany({
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const rows = logs.map((l: any) => ({
      id: l.id,
      createdAt: new Date(l.createdAt).toISOString(),
      userName: l.user?.fullName || '',
      rawTranscript: l.rawTranscript,
      classifiedIntent: l.classifiedIntent,
      recognitionEngine: l.recognitionEngine,
      actionTaken: l.actionTaken ? 'YES' : 'NO',
    }));

    return this.toCsv(rows, [
      'id', 'createdAt', 'userName',
      'rawTranscript', 'classifiedIntent', 'recognitionEngine', 'actionTaken',
    ]);
  }

  async exportDamageAssessmentsCsv(): Promise<string> {
    const logs = await this.prisma.damageAssessment.findMany({
      include: {
        user: { select: { fullName: true } },
        vehicle: { select: { make: true, model: true, year: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = logs.map((d: any) => ({
      id: d.id,
      createdAt: new Date(d.createdAt).toISOString(),
      userName: d.user?.fullName || '',
      vehicle: d.vehicle ? `${d.vehicle.make} ${d.vehicle.model} ${d.vehicle.year}` : '',
      predictedDamageType: d.predictedDamageType,
      derivedSeverity: d.derivedSeverity,
      confidenceScore: d.confidenceScore,
      partTag: d.partTag,
      modelVersion: d.modelVersion,
      photoUrl: d.photoUrl,
    }));

    return this.toCsv(rows, [
      'id', 'createdAt', 'userName', 'vehicle',
      'predictedDamageType', 'derivedSeverity', 'confidenceScore',
      'partTag', 'modelVersion', 'photoUrl',
    ]);
  }

  async exportDispatchLogsCsv(): Promise<string> {
    const logs = await this.prisma.alertDispatchLog.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Manual user lookup — AlertDispatchLog has no direct user relation
    const userIds = [...new Set(logs.map((l: any) => l.userId).filter(Boolean))];
    const users = userIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const userMap = new Map(users.map((u: any) => [u.id, u.fullName]));

    const rows = logs.map((l: any) => ({
      id: l.id,
      createdAt: new Date(l.createdAt).toISOString(),
      userName: userMap.get(l.userId) || '',
      incidentId: l.incidentId || '',
      pushStatus: l.pushStatus,
      smsStatus: l.smsStatus,
      emailStatus: l.emailStatus,
      attempts: l.attempts,
      payload: typeof l.payload === 'string' ? l.payload : JSON.stringify(l.payload),
    }));

    return this.toCsv(rows, [
      'id', 'createdAt', 'userName', 'incidentId',
      'pushStatus', 'smsStatus', 'emailStatus', 'attempts', 'payload',
    ]);
  }
}