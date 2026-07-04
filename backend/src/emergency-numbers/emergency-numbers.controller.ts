import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { EmergencyNumbersService } from './emergency-numbers.service';
import { NearestNumbersDto } from './dto/nearest-numbers.dto';
import { CreateEmergencyNumberDto } from './dto/create-emergency-number.dto';
import { UpdateEmergencyNumberDto } from './dto/update-emergency-number.dto';

@Controller('emergency-numbers')
export class EmergencyNumbersController {
  constructor(private readonly service: EmergencyNumbersService) {}

  // Public: get numbers relevant to the user's current location
  @Get('for-location')
  async getForLocation(@Query() query: NearestNumbersDto) {
    return this.service.getNumbersForLocation(query.lat, query.lng);
  }

  // Admin: manage the regional number database
  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @Post()
  async create(@Body() dto: CreateEmergencyNumberDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateEmergencyNumberDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}