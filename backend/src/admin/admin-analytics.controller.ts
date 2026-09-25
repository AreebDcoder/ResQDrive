import {
  Controller, Get, Param, Query, Res, UseGuards, NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminPdfService } from './admin-pdf.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AdminIncidentsQueryDto } from './dto/admin-incidents-query.dto';

@ApiTags('Admin Analytics & Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminAnalyticsController {
  constructor(
    private analyticsService: AdminAnalyticsService,
    private pdfService: AdminPdfService,
  ) {}

  @Get('analytics/summary')
  @ApiOperation({ summary: 'Aggregate incident counts, severity breakdown, and recent activity' })
  async getSummary(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getSummary(query);
  }

  @Get('analytics/trends')
  @ApiOperation({ summary: 'Daily incident counts for the last 30 days (for trend chart)' })
  async getTrends(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getTrends(query);
  }

  @Get('analytics/hotspots')
  @ApiOperation({ summary: 'Top incident hotspot locations (for heatmap)' })
  async getHotspots(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getHotspots(query);
  }

  @Get('incidents')
  @ApiOperation({ summary: 'List all incidents across all users (admin only)' })
  async listAllIncidents(@Query() query: AdminIncidentsQueryDto) {
    return this.analyticsService.listAllIncidents(query);
  }

  @Get('incidents/:id')
  @ApiOperation({ summary: 'Get a single incident with user info (admin only)' })
  @ApiResponse({ status: 404, description: 'Incident not found.' })
  async getIncident(@Param('id') id: string) {
    return this.analyticsService.getIncidentById(id);
  }

  @Get('incidents/:id/pdf')
  @ApiOperation({ summary: 'Download a single incident as a PDF report' })
  @ApiResponse({ status: 200, description: 'PDF file stream.' })
  @ApiResponse({ status: 404, description: 'Incident not found.' })
  async downloadIncidentPdf(@Param('id') id: string, @Res() res: Response) {
    try {
      const pdfBuffer = await this.pdfService.generateIncidentReportPdf(id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="incident-${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw err;
    }
  }

  @Get('emergency-sessions')
  @ApiOperation({ summary: 'Get all active emergency notification sessions (admin)' })
  async getEmergencySessions() {
    return this.analyticsService.getActiveEmergencySessions();
  }

  @Get('location-sessions')
  @ApiOperation({ summary: 'Get all active location sharing sessions (admin)' })
  async getLocationSessions() {
    return this.analyticsService.getActiveLocationSessions();
  }

  @Get('dispatch-logs')
  @ApiOperation({ summary: 'Get recent alert dispatch logs (admin)' })
  async getDispatchLogs(@Query('limit') limit?: string) {
    const l = limit ? parseInt(limit, 10) : 20;
    return this.analyticsService.getRecentDispatchLogs(l);
  }

    @Get('crash-detection-logs')
  @ApiOperation({ summary: 'Get crash sound detection logs (admin)' })
  async getCrashDetectionLogs(@Query('limit') limit?: string) {
    return this.analyticsService.getCrashDetectionLogs(limit ? parseInt(limit, 10) : 50);
  }

  @Get('voice-command-logs')
  @ApiOperation({ summary: 'Get voice command logs (admin)' })
  async getVoiceCommandLogs(@Query('limit') limit?: string) {
    return this.analyticsService.getVoiceCommandLogs(limit ? parseInt(limit, 10) : 50);
  }

  @Get('damage-assessments')
  @ApiOperation({ summary: 'Get damage assessment history (admin)' })
  async getDamageAssessments(@Query('limit') limit?: string) {
    return this.analyticsService.getDamageAssessments(limit ? parseInt(limit, 10) : 50);
  }

  @Get('repair-cost-reports')
  @ApiOperation({ summary: 'Get repair cost reports (admin)' })
  async getRepairCostReports(@Query('limit') limit?: string) {
    return this.analyticsService.getRepairCostReports(limit ? parseInt(limit, 10) : 50);
  }
}