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
}