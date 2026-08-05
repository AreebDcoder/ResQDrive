import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as PDFDocument from 'pdfkit';
import axios from 'axios';
import { EmergencySosService } from './emergency-sos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateCustomNumberDto } from './dto/create-custom-number.dto';
import { LogCallDto } from './dto/log-call.dto';
import { CreateReportDto } from './dto/create-report.dto';

@ApiTags('Emergency SOS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('emergency-sos')
export class EmergencySosController {
  constructor(private readonly sosService: EmergencySosService) {}

  @Get('numbers')
  @ApiOperation({ summary: 'Get regional emergency numbers and user overrides based on coordinates' })
  @ApiResponse({ status: 200, description: 'List of regional and custom emergency numbers.' })
  async getEmergencyNumbers(
    @CurrentUser() user: { id: string },
    @Query('lat') latStr: string,
    @Query('lng') lngStr: string,
  ) {
    const lat = parseFloat(latStr || '33.6844'); // Default to Islamabad coords
    const lng = parseFloat(lngStr || '73.0479');
    return this.sosService.getNumbersForLocation(lat, lng, user.id);
  }

  @Post('log-call')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log that an emergency call was placed' })
  @ApiResponse({ status: 200, description: 'Call logged successfully.' })
  async logCall(@CurrentUser() user: { id: string }, @Body() logCallDto: LogCallDto) {
    return this.sosService.logCall(user.id, logCallDto.serviceName, logCallDto.autoDialed);
  }

  @Post('custom-numbers')
  @ApiOperation({ summary: 'Add a custom emergency number override' })
  @ApiResponse({ status: 201, description: 'Custom emergency number created.' })
  async createCustomNumber(@CurrentUser() user: { id: string }, @Body() dto: CreateCustomNumberDto) {
    return this.sosService.createCustomNumber(user.id, dto.label, dto.phoneNumber, dto.priorityOrder);
  }

  @Get('custom-numbers')
  @ApiOperation({ summary: 'List user custom emergency numbers' })
  @ApiResponse({ status: 200, description: 'List of custom emergency numbers.' })
  async getCustomNumbers(@CurrentUser() user: { id: string }) {
    return this.sosService.findCustomNumbers(user.id);
  }

  @Delete('custom-numbers/:id')
  @ApiOperation({ summary: 'Delete a custom emergency number' })
  @ApiResponse({ status: 200, description: 'Custom emergency number deleted.' })
  async deleteCustomNumber(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.sosService.deleteCustomNumber(user.id, id);
  }

  @Post('report')
  @ApiOperation({ summary: 'Generate digital accident report with damage photos' })
  @ApiResponse({ status: 201, description: 'Accident report generated.' })
  async createReport(@CurrentUser() user: { id: string }, @Body() dto: CreateReportDto) {
    return this.sosService.createReport(
      user.id,
      dto.incidentId || null,
      dto.vehicleId || null,
      dto.severity,
      dto.latitude !== undefined ? dto.latitude : null,
      dto.longitude !== undefined ? dto.longitude : null,
    );
  }

  @Get('report/:id/pdf')
  @ApiOperation({ summary: 'Download accident report as a PDF document' })
  async downloadPdf(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const report = await this.sosService.getReport(id);

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ResQDrive_Accident_Report_${id}.pdf`);

    doc.pipe(res);

    // PDF Design Styles
    doc.fillColor('#d32f2f').fontSize(24).font('Helvetica-Bold').text('ResQDrive', 50, 50);
    doc.fillColor('#333333').fontSize(14).font('Helvetica').text('OFFICIAL ACCIDENT & EMERGENCY REPORT', 50, 78);

    doc.fillColor('#777777').fontSize(9).text(`Report Generated: ${new Date(report.createdAt).toLocaleString()}`, 350, 50, { align: 'right' });
    doc.text(`Report ID: ${report.id}`, 350, 65, { align: 'right' });

    doc.moveTo(50, 100).lineTo(550, 100).strokeColor('#e0e0e0').stroke();

    // Section: Driver details
    doc.y = 115;
    doc.fillColor('#222222').fontSize(11).font('Helvetica-Bold').text('Driver Information', 50, doc.y);
    doc.moveDown(0.5);
    doc.font('Helvetica').fillColor('#555555');
    doc.text(`Driver Name: ${report.user.fullName}`);
    doc.text(`Email Address: ${report.user.email}`);
    doc.text(`Phone Number: ${report.user.phoneNumber}`);

    // Section: Incident details (aligned right)
    const originalY = 115;
    doc.fillColor('#222222').fontSize(11).font('Helvetica-Bold').text('Accident Meta', 320, originalY);
    doc.moveDown(0.5);
    doc.font('Helvetica').fillColor('#555555');
    doc.text(`Severity Level: ${report.severity.toUpperCase()}`, 320, doc.y);
    doc.text(`Region Detected: ${report.detectedRegion || 'Unknown'}`, 320, doc.y);
    doc.text(`GPS Location: ${report.latitude?.toFixed(4) || 'N/A'}, ${report.longitude?.toFixed(4) || 'N/A'}`, 320, doc.y);

    doc.y = 200;
    doc.moveTo(50, 200).lineTo(550, 200).strokeColor('#e0e0e0').stroke();

    // Section: Vehicle Details
    doc.y = 215;
    doc.fillColor('#222222').fontSize(11).font('Helvetica-Bold').text('Vehicle Information', 50, doc.y);
    doc.moveDown(0.5);
    doc.font('Helvetica').fillColor('#555555');
    if (report.vehicle) {
      doc.text(`Vehicle details: ${report.vehicle.year} ${report.vehicle.make} ${report.vehicle.model}`);
      doc.text(`License Plate: ${report.vehicle.licensePlate.toUpperCase()}`);
      doc.text(`Color: ${report.vehicle.color || 'N/A'}`);
    } else {
      doc.text('No vehicle profile was linked to this incident.');
    }

    // Section: Dialing / Emergency call log (aligned right)
    doc.fillColor('#222222').fontSize(11).font('Helvetica-Bold').text('Emergency Dispatch Log', 320, 215);
    doc.moveDown(0.5);
    doc.font('Helvetica').fillColor('#555555');
    if (report.calledServiceName) {
      doc.text(`Service Called: ${report.calledServiceName}`, 320, doc.y);
      doc.text(`Dialed At: ${new Date(report.calledAt!).toLocaleString()}`, 320, doc.y);
      doc.text(`Trigger Mode: ${report.autoDialed ? 'Auto-Escalated (60s Timeout)' : 'Manual Driver Call'}`, 320, doc.y);
    } else {
      doc.text('Service Called: No emergency services dialed.', 320, doc.y);
    }

    doc.y = 290;
    doc.moveTo(50, 290).lineTo(550, 290).strokeColor('#e0e0e0').stroke();

    // Section: Damage Photos & Evidence
    doc.y = 305;
    doc.fillColor('#222222').fontSize(11).font('Helvetica-Bold').text('Damage Photos & Evidence', 50, doc.y);
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10).fillColor('#555555');

    if (report.damagePhotoUrls && Array.isArray(report.damagePhotoUrls) && report.damagePhotoUrls.length > 0) {
      const photoUrls = report.damagePhotoUrls as string[];
      doc.text(`Detected ${photoUrls.length} photo(s) associated with this incident:`);
      doc.moveDown(1);

      let imageX = 50;
      let imageY = doc.y;

      for (const url of photoUrls) {
        try {
          const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
          const imageBuffer = Buffer.from(response.data, 'binary');
          
          if (imageX + 150 > 550) {
            imageX = 50;
            imageY += 120;
          }

          doc.image(imageBuffer, imageX, imageY, { width: 140, height: 100 });
          imageX += 160;
        } catch (err) {
          doc.text(`Evidence URL (download failed): ${url}`);
          doc.moveDown(0.5);
        }
      }
    } else {
      doc.text('No damage assessments or photo links found for this incident.');
    }

    doc.end();
  }
}
