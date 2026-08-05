import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { EmergencySosService } from './emergency-sos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateRegionalNumberDto } from './dto/create-regional-number.dto';
import { UpdateRegionalNumberDto } from './dto/update-regional-number.dto';

@ApiTags('Admin Emergency Numbers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/emergency-numbers')
export class AdminEmergencyNumbersController {
  constructor(private readonly sosService: EmergencySosService) {}

  @Get()
  @ApiOperation({ summary: 'List all regional emergency numbers' })
  @ApiResponse({ status: 200, description: 'List of all regional emergency numbers.' })
  async listAll() {
    return this.sosService.findAllRegional();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new regional emergency number' })
  @ApiResponse({ status: 201, description: 'Regional emergency number created.' })
  async create(@CurrentUser() admin: { id: string }, @Body() dto: CreateRegionalNumberDto) {
    return this.sosService.createRegional(admin.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a regional emergency number' })
  @ApiResponse({ status: 200, description: 'Regional emergency number updated.' })
  async update(
    @CurrentUser() admin: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateRegionalNumberDto,
  ) {
    return this.sosService.updateRegional(admin.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a regional emergency number' })
  @ApiResponse({ status: 200, description: 'Regional emergency number deleted.' })
  async remove(@Param('id') id: string) {
    return this.sosService.deleteRegional(id);
  }
}
