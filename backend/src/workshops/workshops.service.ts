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
  isVerifiedPartner: boolean;
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
    const results: WorkshopResult[] = [];
    const seenCoordinates = new Set<string>();

    // ─── STEP 1: Fetch verified partner mechanics from ResQDrive DB ───────
    try {
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

      for (const mechanic of verifiedMechanics) {
        const details = mechanic.mechanicDetails!;
        const workshopLat = details.workshopLatitude!;
        const workshopLng = details.workshopLongitude!;

        const coordKey = `${workshopLat.toFixed(3)},${workshopLng.toFixed(3)}`;
        seenCoordinates.add(coordKey);

        const routing = await this.getRouteDistanceAndDuration(lat, lng, workshopLat, workshopLng);

        results.push({
          name: details.workshopName || 'ResQDrive Partner Workshop',
          address: details.workshopAddress || 'Address on file',
          phoneNumber: mechanic.phoneNumber,
          specialization: details.specialization || 'Automotive & Collision Repair',
          lat: workshopLat,
          lng: workshopLng,
          distanceMeters: routing.distanceMeters,
          durationText: routing.durationText,
          durationSeconds: routing.durationSeconds,
          isVerifiedPartner: true,
        });
      }
    } catch (err: any) {
      this.logger.warn(`Error querying DB mechanics: ${err.message}`);
    }

    // ─── STEP 2: Fallback to Geoapify / OpenStreetMap Auto Repair Places ───
    if (results.length < 5) {
      try {
        const externalWorkshops = await this.fetchExternalWorkshops(lat, lng);
        for (const ext of externalWorkshops) {
          const coordKey = `${ext.lat.toFixed(3)},${ext.lng.toFixed(3)}`;
          if (!seenCoordinates.has(coordKey)) {
            seenCoordinates.add(coordKey);
            const routing = await this.getRouteDistanceAndDuration(lat, lng, ext.lat, ext.lng);
            results.push({
              name: ext.name,
              address: ext.address,
              phoneNumber: ext.phoneNumber || 'Helpline via Navigation',
              specialization: ext.specialization || 'Auto Repair & Garage Services',
              lat: ext.lat,
              lng: ext.lng,
              distanceMeters: routing.distanceMeters,
              durationText: routing.durationText,
              durationSeconds: routing.durationSeconds,
              isVerifiedPartner: false,
            });
          }
        }
      } catch (err: any) {
        this.logger.warn(`External workshops fetch failed: ${err.message}`);
      }
    }

    // Sort: Verified partners first, then by duration / distance
    results.sort((a, b) => {
      if (a.isVerifiedPartner && !b.isVerifiedPartner) return -1;
      if (!a.isVerifiedPartner && b.isVerifiedPartner) return 1;
      return a.durationSeconds - b.durationSeconds || a.distanceMeters - b.distanceMeters;
    });

    return results.slice(0, 6);
  }

  private async fetchExternalWorkshops(
    lat: number,
    lng: number,
  ): Promise<Array<{ name: string; address: string; phoneNumber?: string; specialization?: string; lat: number; lng: number }>> {
    // Try Geoapify Places first (standard service.vehicle category with 10km radius)
    if (this.geoapifyKey) {
      try {
        const res = await axios.get('https://api.geoapify.com/v2/places', {
          params: {
            categories: 'service.vehicle',
            filter: `circle:${lng},${lat},10000`,
            bias: `proximity:${lng},${lat}`,
            limit: 6,
            apiKey: this.geoapifyKey,
          },
          timeout: 4000,
        });

        const features = res.data.features || [];
        if (features.length > 0) {
          return features.map((f: any) => {
            const props = f.properties;
            return {
              name: props.name || props.address_line1 || 'Auto Repair Workshop',
              address: props.address_line2 || props.formatted || 'Nearby Area',
              phoneNumber: props.phone || props.contact?.phone || '',
              specialization: 'Automotive Repair & Services',
              lat: props.lat,
              lng: props.lon,
            };
          });
        }
      } catch (e: any) {
        this.logger.warn(`Geoapify places for workshops failed: ${e.message}`);
      }
    }

    // Fallback to OSM Overpass
    try {
      const query = `[out:json][timeout:20];(node["shop"="car_repair"](around:10000,${lat},${lng});node["amenity"="car_repair"](around:10000,${lat},${lng}););out body 6;`;
      const res = await axios.post('https://overpass-api.de/api/interpreter', query, {
        headers: {
          'Content-Type': 'text/plain',
          'User-Agent': 'ResQDrive-Emergency-Platform/1.0',
        },
        timeout: 10000,
      });

      const elements = res.data?.elements || [];
      return elements.map((e: any) => ({
        name: e.tags?.name || e.tags?.brand || 'Local Auto Workshop',
        address: e.tags?.['addr:street'] || e.tags?.['addr:full'] || 'Nearby Location',
        phoneNumber: e.tags?.phone || e.tags?.['contact:phone'] || '',
        specialization: 'Automotive Mechanics & Repair',
        lat: e.lat,
        lng: e.lon,
      }));
    } catch (e: any) {
      this.logger.warn(`OSM Overpass workshops fallback failed: ${e.message}`);
      return [];
    }
  }

  private async getRouteDistanceAndDuration(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ): Promise<{ distanceMeters: number; durationSeconds: number; durationText: string }> {
    if (this.geoapifyKey) {
      try {
        const routeRes = await axios.get('https://api.geoapify.com/v1/routing', {
          params: {
            waypoints: `${fromLat},${fromLng}|${toLat},${toLng}`,
            mode: 'drive',
            apiKey: this.geoapifyKey,
          },
          timeout: 4000,
        });
        const routeProps = routeRes.data.features?.[0]?.properties;
        if (routeProps) {
          const distanceMeters = Math.round(routeProps.distance || 0);
          const durationSeconds = Math.round(routeProps.time || 0);
          return {
            distanceMeters,
            durationSeconds,
            durationText: this.formatDuration(durationSeconds),
          };
        }
      } catch (e) {}
    }

    const dist = this.haversineDistance(fromLat, fromLng, toLat, toLng);
    const durationSeconds = Math.round((dist / 1000) * 120);
    return {
      distanceMeters: Math.round(dist),
      durationSeconds,
      durationText: this.formatDuration(durationSeconds),
    };
  }

  private formatDuration(seconds: number): string {
    if (!seconds) return 'Estimate unavailable';
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
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