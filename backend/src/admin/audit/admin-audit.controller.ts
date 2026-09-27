import {
  Body, Controller, Get, Param, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminAuditService } from './admin-audit.service';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';

@ApiTags('Admin Audit + Broadcast')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminAuditController {
  constructor(private readonly service: AdminAuditService) {}

  @Get('audit-log')
  @ApiOperation({ summary: 'Paginated audit log list with filters (adminUserId, action, resourceType, resourceId, dateFrom, dateTo)' })
  async listAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('adminUserId') adminUserId?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.listAuditLogs({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      adminUserId,
      action,
      resourceType,
      resourceId,
      dateFrom,
      dateTo,
    });
  }

  @Post('notifications/broadcast')
  @ApiOperation({ summary: 'Broadcast a push notification to a segment of users (ALL / DRIVERS / MECHANICS)' })
  @ApiResponse({ status: 201, description: 'Returns { sentCount, failedCount, totalUsers, segment }.' })
  async broadcast(@Body() dto: BroadcastNotificationDto) {
    return this.service.broadcastNotification(dto);
  }

  @Post('location-sessions/:id/force-end')
  @ApiOperation({ summary: 'Force-end a stuck active location session' })
  async forceEndLocationSession(@Param('id') id: string) {
    return this.service.forceEndLocationSession(id);
  }

  @Post('emergency-sessions/:id/force-end')
  @ApiOperation({ summary: 'Force-end a stuck active emergency notification session (stops escalation)' })
  async forceEndEmergencySession(@Param('id') id: string) {
    return this.service.forceEndEmergencySession(id);
  }

  @Post('device-tokens/purge-stale')
  @ApiOperation({ summary: 'Delete inactive or 90-day-stale device tokens' })
  async purgeStaleDeviceTokens() {
    return this.service.purgeStaleDeviceTokens();
  }
}
