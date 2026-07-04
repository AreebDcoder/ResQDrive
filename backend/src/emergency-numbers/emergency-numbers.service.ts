import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmergencyNumbersService {
  private readonly logger = new Logger(EmergencyNumbersService.name);
  private readonly geoapifyKey: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.geoapifyKey = this.configService.get<string>('GEOAPIFY_API_KEY') || '';
  }

  /**
   * Determines which region (Punjab/Islamabad, Karachi, or KPK) a GPS
   * coordinate falls into, using Geoapify reverse geocoding.
   */
  async detectRegion(lat: number, lng: number): Promise<string> {
    try {
      const res = await axios.get('https://api.geoapify.com/v1/geocode/reverse', {
        params: { lat, lon: lng, apiKey: this.geoapifyKey },
      });

      const props = res.data.features?.[0]?.properties;
      const state: string = (props?.state || '').toLowerCase();
      const city: string = (props?.city || '').toLowerCase();

      if (city.includes('karachi')) return 'KARACHI';
      if (state.includes('khyber') || state.includes('kpk')) return 'KPK';
      if (state.includes('sindh')) return 'KARACHI'; // fallback for Sindh generally
      // Default to Punjab/Islamabad for Punjab, Islamabad Capital Territory, or unknown
      return 'PUNJAB_ISLAMABAD';
    } catch (err: any) {
      this.logger.warn(`Region detection failed: ${err.message}. Defaulting to PUNJAB_ISLAMABAD.`);
      return 'PUNJAB_ISLAMABAD';
    }
  }

  /**
   * Returns the emergency numbers relevant to the detected region.
   */
  async getNumbersForLocation(lat: number, lng: number) {
    const region = await this.detectRegion(lat, lng);
    const numbers = await this.prisma.emergencyNumber.findMany({
      where: { region },
      orderBy: { createdAt: 'asc' },
    });
    return { region, numbers };
  }

  // --- Admin management methods ---

  async findAll() {
    return this.prisma.emergencyNumber.findMany({ orderBy: [{ region: 'asc' }, { name: 'asc' }] });
  }

  async create(data: { region: string; name: string; number: string }) {
    return this.prisma.emergencyNumber.create({ data });
  }

  async update(id: string, data: Partial<{ region: string; name: string; number: string }>) {
    return this.prisma.emergencyNumber.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.emergencyNumber.delete({ where: { id } });
  }
}