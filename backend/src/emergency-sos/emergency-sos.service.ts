import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { lookupRegionOffline } from './offlineRegionLookup';
import { AccidentReportSeverity } from '@prisma/client';

@Injectable()
export class EmergencySosService {
  private readonly logger = new Logger(EmergencySosService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Resolves region name using Google Geocoding API with a timeout,
   * falling back to offline bounding box geocoding on failure.
   */
  async detectRegion(lat: number, lng: number): Promise<string> {
    const googleKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    if (!googleKey) {
      this.logger.warn('GOOGLE_MAPS_API_KEY is missing. Falling back to offline bounding-box lookup.');
      return lookupRegionOffline(lat, lng);
    }

    try {
      // 1.5-second fast timeout to prevent waiting too long on emergency screens
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          latlng: `${lat},${lng}`,
          key: googleKey,
        },
        timeout: 1500,
      });

      const results = response.data.results;
      if (results && results.length > 0) {
        let province = '';
        let city = '';

        for (const component of results[0].address_components) {
          if (component.types.includes('administrative_area_level_1')) {
            province = component.long_name;
          }
          if (component.types.includes('locality')) {
            city = component.long_name;
          }
        }

        const cityLower = city.toLowerCase();
        const provLower = province.toLowerCase();

        if (cityLower.includes('karachi')) return 'Karachi';
        if (provLower.includes('khyber') || provLower.includes('kpk')) return 'Khyber Pakhtunkhwa';
        if (provLower.includes('punjab') || provLower.includes('islamabad')) return 'Punjab / Islamabad';
      }

      // Fallback if Google API does not return expected components
      return lookupRegionOffline(lat, lng);
    } catch (error: any) {
      this.logger.warn(`Google Geocoding failed: ${error.message}. Falling back to offline bounding-box lookup.`);
      return lookupRegionOffline(lat, lng);
    }
  }

  /**
   * Retrieves regional emergency numbers
   */
  async getNumbersForLocation(lat: number, lng: number, userId: string) {
    const regionName = await this.detectRegion(lat, lng);

    let regionalNumbers = await this.prisma.regionalEmergencyNumber.findMany({
      where: { regionName, isActive: true },
      orderBy: { priorityOrder: 'asc' },
    });

    // Fallback: If no regional numbers matched for this specific region, fetch active rescue emergency numbers
    if (regionalNumbers.length === 0) {
      regionalNumbers = await this.prisma.regionalEmergencyNumber.findMany({
        where: {
          isActive: true,
          OR: [
            { serviceName: { contains: 'Rescue', mode: 'insensitive' } },
            { serviceName: { contains: '1122', mode: 'insensitive' } },
            { phoneNumber: '1122' },
          ],
        },
        orderBy: { priorityOrder: 'asc' },
      });
    }

    // Filter to guarantee sole focus on Rescue services
    let filtered = regionalNumbers.filter((r) => {
      const name = (r.serviceName || '').toLowerCase();
      return name.includes('rescue') || name.includes('1122') || name.includes('edhi') || name.includes('chhipa');
    });

    // Default hard fallbacks for Pakistan regional Rescue services
    if (filtered.length === 0) {
      const isKarachi = regionName.toLowerCase().includes('karachi');
      const isKPK = regionName.toLowerCase().includes('khyber') || regionName.toLowerCase().includes('kpk');

      if (isKarachi) {
        filtered = [
          {
            id: 'def-khi-1',
            regionName,
            serviceName: 'Sindh Rescue 1122',
            phoneNumber: '1122',
            priorityOrder: 1,
            isActive: true,
          },
          {
            id: 'def-khi-2',
            regionName,
            serviceName: 'Edhi Foundation Rescue (Ambulance)',
            phoneNumber: '115',
            priorityOrder: 2,
            isActive: true,
          },
          {
            id: 'def-khi-3',
            regionName,
            serviceName: 'Chhipa Emergency Rescue',
            phoneNumber: '1020',
            priorityOrder: 3,
            isActive: true,
          },
        ] as any;
      } else if (isKPK) {
        filtered = [
          {
            id: 'def-kpk-1',
            regionName,
            serviceName: 'Rescue 1122 KPK (Emergency Hotline)',
            phoneNumber: '1122',
            priorityOrder: 1,
            isActive: true,
          },
          {
            id: 'def-kpk-2',
            regionName,
            serviceName: 'Rescue 1122 Peshawar / KP HQ',
            phoneNumber: '0919212222',
            priorityOrder: 2,
            isActive: true,
          },
        ] as any;
      } else {
        filtered = [
          {
            id: 'def-pnb-1',
            regionName,
            serviceName: 'Rescue 1122 (Emergency Hotline)',
            phoneNumber: '1122',
            priorityOrder: 1,
            isActive: true,
          },
          {
            id: 'def-pnb-2',
            regionName,
            serviceName: 'Rescue 1122 Regional HQ (Direct)',
            phoneNumber: '0519290002',
            priorityOrder: 2,
            isActive: true,
          },
        ] as any;
      }
    }

    return {
      regionName,
      regionalNumbers: filtered,
    };
  }

  /**
   * Logs a cellular call event (manual or auto-escalated)
   */
  async logCall(userId: string, serviceName: string, autoDialed: boolean) {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Try to find an existing report created recently to log the call on
    const recentReport = await this.prisma.accidentReport.findFirst({
      where: {
        userId,
        createdAt: { gte: fifteenMinutesAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentReport) {
      return this.prisma.accidentReport.update({
        where: { id: recentReport.id },
        data: {
          calledServiceName: serviceName,
          calledAt: new Date(),
          autoDialed,
        },
      });
    }

    // Otherwise, create a new minimal report log
    return this.prisma.accidentReport.create({
      data: {
        userId,
        severity: AccidentReportSeverity.moderate, // default fallback
        calledServiceName: serviceName,
        calledAt: new Date(),
        autoDialed,
      },
    });
  }

  /**
   * Creates a formal digital accident report, integrating damage assessment photo URLs
   */
  async createReport(
    userId: string,
    incidentId: string | null,
    vehicleId: string | null,
    severity: AccidentReportSeverity,
    latitude: number | null,
    longitude: number | null,
  ) {
    let damagePhotoUrls: string[] = [];

    if (incidentId) {
      const assessments = await this.prisma.damageAssessment.findMany({
        where: { incidentId },
        select: { photoUrl: true },
      });
      damagePhotoUrls = assessments.map((a) => a.photoUrl);
    }

    const regionName = (latitude !== null && longitude !== null)
      ? await this.detectRegion(latitude, longitude)
      : null;

    return this.prisma.accidentReport.create({
      data: {
        userId,
        incidentId,
        vehicleId,
        severity,
        latitude,
        longitude,
        detectedRegion: regionName,
        damagePhotoUrls: damagePhotoUrls as any,
      },
    });
  }

  /**
   * Gets a specific accident report
   */
  async getReport(id: string) {
    const report = await this.prisma.accidentReport.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        vehicle: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Accident report not found.');
    }

    return report;
  }

  // --- Admin Regional Emergency Numbers Management ---

  async findAllRegional() {
    return this.prisma.regionalEmergencyNumber.findMany({
      orderBy: [
        { regionName: 'asc' },
        { priorityOrder: 'asc' },
      ],
      include: {
        updatedByAdmin: {
          select: {
            fullName: true,
          },
        },
      },
    });
  }

  async createRegional(
    adminId: string,
    data: { regionName: string; serviceName: string; phoneNumber: string; priorityOrder?: number; isActive?: boolean },
  ) {
    return this.prisma.regionalEmergencyNumber.create({
      data: {
        regionName: data.regionName,
        serviceName: data.serviceName,
        phoneNumber: data.phoneNumber,
        priorityOrder: data.priorityOrder ?? 1,
        isActive: data.isActive ?? true,
        updatedByAdminId: adminId,
      },
    });
  }

  async updateRegional(
    adminId: string,
    id: string,
    data: { phoneNumber?: string; priorityOrder?: number; isActive?: boolean },
  ) {
    const number = await this.prisma.regionalEmergencyNumber.findUnique({
      where: { id },
    });

    if (!number) {
      throw new NotFoundException('Regional emergency number not found.');
    }

    return this.prisma.regionalEmergencyNumber.update({
      where: { id },
      data: {
        ...data,
        updatedByAdminId: adminId,
      },
    });
  }

  async deleteRegional(id: string) {
    const number = await this.prisma.regionalEmergencyNumber.findUnique({
      where: { id },
    });

    if (!number) {
      throw new NotFoundException('Regional emergency number not found.');
    }

    return this.prisma.regionalEmergencyNumber.delete({
      where: { id },
    });
  }
}
