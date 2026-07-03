import { Controller, Get, Query } from '@nestjs/common';
import { WorkshopsService } from './workshops.service';
import { NearestWorkshopsDto } from './dto/nearest-workshops.dto';

@Controller('workshops')
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  @Get('nearest')
  async getNearest(@Query() query: NearestWorkshopsDto) {
    const workshops = await this.workshopsService.findNearest(query.lat, query.lng);
    return { workshops };
  }
}