import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

export interface WorkshopResult {
  name: string;
  address: string;
  phoneNumber: string;
  specialization: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  durationText: string;
  durationSeconds: number;
}

@Injectable()
export class WorkshopsService {
  private readonly logger = new Logger(WorkshopsService.name);
  private readonly geoapifyKey: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.geoapifyKey = this.configService.get<string>('GEOAPIFY_API_KEY') || '';
  }

  async findNearest(lat: number, lng: number): Promise<WorkshopResult[]> {
    // Get all verified workshop owners with coordinates registered in ResQDrive DB
    const verifiedMechanics = await this.prisma.user.findMany({
      where: {
        role: 'MECHANIC',
        mechanicDetails: {
          isWorkshopVerified: true,
          workshopLatitude: { not: null },
          workshopLongitude: { not: null },
        },
      },
      include: { mechanicDetails: true },
    });

    const results: WorkshopResult[] = [];

    for (const mechanic of verifiedMechanics) {
      const details = mechanic.mechanicDetails!;
      const workshopLat = details.workshopLatitude!;
      const workshopLng = details.workshopLongitude!;

      let distanceMeters: number;
      let durationSeconds: number;
      let durationText: string;

      try {
        if (!this.geoapifyKey) throw new Error('No Geoapify key');
        const routeRes = await axios.get('https://api.geoapify.com/v1/routing', {
          params: {
            waypoints: `${lat},${lng}|${workshopLat},${workshopLng}`,
            mode: 'drive',
            apiKey: this.geoapifyKey,
          },
        });
        const routeProps = routeRes.data.features?.[0]?.properties;
        distanceMeters = routeProps?.distance ?? this.haversineDistance(lat, lng, workshopLat, workshopLng);
        durationSeconds = Math.round(routeProps?.time ?? 0);
        durationText = this.formatDuration(durationSeconds);
      } catch {
        distanceMeters = this.haversineDistance(lat, lng, workshopLat, workshopLng);
        durationSeconds = Math.round((distanceMeters / 1000) * 120);
        durationText = `${Math.max(1, Math.round((distanceMeters / 1000) * 2))} min`;
      }

      results.push({
        name: details.workshopName || mechanic.fullName || 'Registered Workshop',
        address: details.workshopAddress || 'Address unavailable',
        phoneNumber: mechanic.phoneNumber,
        specialization: details.specialization || 'Bodywork, Denting & Painting',
        lat: workshopLat,
        lng: workshopLng,
        distanceMeters,
        durationText,
        durationSeconds,
      });
    }

    results.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return results;
  }

  private formatDuration(seconds: number): string {
    if (!seconds) return 'Estimate unavailable';
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}