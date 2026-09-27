import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminVehiclesService } from './admin-vehicles.service';
import { AdminUpdateVehicleDto } from './dto/admin-update-vehicle.dto';
import { AdminInsuranceDto } from './dto/admin-insurance.dto';

@ApiTags('Admin Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/vehicles')
export class AdminVehiclesController {
  constructor(private readonly service: AdminVehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'Paginated list of all vehicles (admin). Filter by make/year/isPrimary/user/search.' })
  @ApiResponse({ status: 200, description: 'Returns { data, meta }.' })
  async listAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('make') make?: string,
    @Query('year') year?: string,
    @Query('isPrimary') isPrimary?: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.listAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      make,
      year: year ? parseInt(year, 10) : undefined,
      isPrimary: isPrimary !== undefined ? isPrimary === 'true' : undefined,
      userId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Single vehicle with insurance + linked damage/repair/incidents (admin).' })
  @ApiResponse({ status: 200, description: 'Vehicle detail.' })
  @ApiResponse({ status: 404, description: 'Vehicle not found.' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin edit of vehicle (make, model, year, color, licensePlate, isPrimary)' })
  async update(@Param('id') id: string, @Body() dto: AdminUpdateVehicleDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/set-primary')
  @ApiOperation({ summary: 'Mark this vehicle as primary (unsets others for same owner)' })
  async setPrimary(@Param('id') id: string) {
    return this.service.setPrimary(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete vehicle (insurance cascades)' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Patch(':id/insurance')
  @ApiOperation({ summary: 'Admin override of vehicle insurance (upsert)' })
  async upsertInsurance(@Param('id') id: string, @Body() dto: AdminInsuranceDto) {
    return this.service.upsertInsurance(id, dto);
  }

  @Delete(':id/insurance')
  @ApiOperation({ summary: 'Remove insurance record' })
  async deleteInsurance(@Param('id') id: string) {
    return this.service.deleteInsurance(id);
  }
}
