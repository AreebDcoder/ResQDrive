import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface HospitalResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  durationText: string;
  durationSeconds: number;
}

@Injectable()
export class HospitalsService {
  private readonly logger = new Logger(HospitalsService.name);
  private readonly geoapifyKey: string;

  constructor(private configService: ConfigService) {
    this.geoapifyKey = this.configService.get<string>('GEOAPIFY_API_KEY');
  }

  async findNearest(lat: number, lng: number): Promise<HospitalResult[]> {
    try {
      return await this.findViaGeoapify(lat, lng);
    } catch (err: any) {
      this.logger.warn(`Geoapify failed: ${err.message}. Falling back to OSM Overpass.`);
      try {
        return await this.findViaOverpass(lat, lng);
      } catch (fallbackErr: any) {
        this.logger.error(`Overpass fallback also failed: ${fallbackErr.message}`);
        throw new ServiceUnavailableException('Unable to fetch nearby hospitals right now.');
      }
    }
  }

  private async findViaGeoapify(lat: number, lng: number): Promise<HospitalResult[]> {
    if (!this.geoapifyKey) throw new Error('Geoapify API key not configured');

    // Step A: find nearby hospitals, sorted by straight-line proximity
    const placesRes = await axios.get('https://api.geoapify.com/v2/places', {
      params: {
        categories: 'healthcare.hospital',
        filter: `circle:${lng},${lat},10000`,
        bias: `proximity:${lng},${lat}`,
        limit: 5,
        apiKey: this.geoapifyKey,
      },
    });

    const features = placesRes.data.features || [];
    if (features.length === 0) return [];

    // Step B: get real driving distance/ETA for each via Routing API
    const results: HospitalResult[] = [];

    for (const feature of features) {
      const props = feature.properties;
      const hospitalLat = props.lat;
      const hospitalLng = props.lon;

      try {
        const routeRes = await axios.get('https://api.geoapify.com/v1/routing', {
          params: {
            waypoints: `${lat},${lng}|${hospitalLat},${hospitalLng}`,
            mode: 'drive',
            apiKey: this.geoapifyKey,
          },
        });

        const routeProps = routeRes.data.features?.[0]?.properties;
        const durationSeconds = routeProps?.time ?? 0;
        const distanceMeters = routeProps?.distance ?? props.distance ?? 0;

        results.push({
          name: props.name || 'Unnamed Hospital',
          address: props.address_line2 || props.formatted || 'Address unavailable',
          lat: hospitalLat,
          lng: hospitalLng,
          distanceMeters,
          durationText: this.formatDuration(durationSeconds),
          durationSeconds,
        });
      } catch (routeErr) {
        // If routing fails for this one hospital, still include it using straight-line distance
        results.push({
          name: props.name || 'Unnamed Hospital',
          address: props.address_line2 || props.formatted || 'Address unavailable',
          lat: hospitalLat,
          lng: hospitalLng,
          distanceMeters: props.distance || 0,
          durationText: 'Estimate unavailable',
          durationSeconds: Math.round(((props.distance || 0) / 1000) * 120),
        });
      }
    }

    results.sort((a, b) => a.durationSeconds - b.durationSeconds);
    return results.slice(0, 3);
  }

  private async findViaOverpass(lat: number, lng: number): Promise<HospitalResult[]> {
    const query = `[out:json][timeout:25];node["amenity"="hospital"](around:10000,${lat},${lng});out body 10;`;

    const res = await axios.post(
      'https://overpass-api.de/api/interpreter',
      query,
      {
        headers: {
          'Content-Type': 'text/plain',
          'User-Agent': 'ResQDrive-FYP-App/1.0 (contact: 232477@students.au.edu.pk)',
        },
        timeout: 30000,
      },
    );

    const elements = res.data.elements || [];
    const results: HospitalResult[] = elements.map((e: any) => {
      const distanceMeters = this.haversineDistance(lat, lng, e.lat, e.lon);
      return {
        name: e.tags?.name || 'Unnamed Hospital',
        address: e.tags?.['addr:full'] || e.tags?.['addr:street'] || 'Address unavailable',
        lat: e.lat,
        lng: e.lon,
        distanceMeters,
        durationText: 'Estimate unavailable',
        durationSeconds: Math.round((distanceMeters / 1000) * 120),
      };
    });

    results.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return results.slice(0, 3);
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