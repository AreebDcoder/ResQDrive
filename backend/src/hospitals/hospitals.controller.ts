import { Controller, Get, Query } from '@nestjs/common';
import { HospitalsService } from './hospitals.service';
import { NearestHospitalsDto } from './dto/nearest-hospitals.dto';

@Controller('hospitals')
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  @Get('nearest')
  async getNearest(@Query() query: NearestHospitalsDto) {
    const hospitals = await this.hospitalsService.findNearest(query.lat, query.lng);
    return { hospitals };
  }
}