import {
  Delete, Get, Param, Query, UseGuards, Controller,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminAccidentReportsService } from './admin-accident-reports.service';

@ApiTags('Admin Accident Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/accident-reports')
export class AdminAccidentReportsController {
  constructor(private readonly service: AdminAccidentReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Paginated list of all accident reports (admin). Filter by severity/userId/autoDialed/search.' })
  async listAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('severity') severity?: string,
    @Query('userId') userId?: string,
    @Query('autoDialed') autoDialed?: string,
  ) {
    return this.service.listAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      severity,
      userId,
      autoDialed: autoDialed !== undefined ? autoDialed === 'true' : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Single accident report with user + vehicle (admin).' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete accident report' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
