import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { InsuranceDto } from './dto/insurance.dto';

@ApiTags('Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new vehicle' })
  @ApiResponse({ status: 201, description: 'Vehicle created.' })
  async create(@CurrentUser() user: { id: string }, @Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(user.id, createVehicleDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all vehicles for current user' })
  async findAll(@CurrentUser() user: { id: string }) {
    return this.vehiclesService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details for a specific vehicle' })
  async findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.vehiclesService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update vehicle details' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(user.id, id, updateVehicleDto);
  }

  @Patch(':id/set-primary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set vehicle as primary (active for accident detection)' })
  async setPrimary(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.vehiclesService.setPrimary(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a vehicle' })
  async delete(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.vehiclesService.delete(user.id, id);
  }

  // --- Insurance ---

  @Put(':id/insurance')
  @ApiOperation({ summary: 'Create or update insurance details for a vehicle' })
  async upsertInsurance(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() insuranceDto: InsuranceDto,
  ) {
    return this.vehiclesService.upsertInsurance(user.id, id, insuranceDto);
  }

  @Get(':id/insurance')
  @ApiOperation({ summary: 'Get insurance details for a specific vehicle' })
  @ApiResponse({ status: 200, description: 'Insurance details.' })
  @ApiResponse({ status: 404, description: 'No insurance details exist.' })
  async getInsurance(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.vehiclesService.getInsurance(user.id, id);
  }

  @Delete(':id/insurance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete insurance details for a vehicle' })
  async deleteInsurance(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.vehiclesService.deleteInsurance(user.id, id);
  }
}
