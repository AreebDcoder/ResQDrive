import { Controller, Post, Get, Param, Body, UseGuards, Res, Delete } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RepairCostService } from './repair-cost.service';
const PDFDocument = require('pdfkit');

@ApiTags('Repair Cost Estimation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('repair-cost')
export class RepairCostController {
  constructor(private readonly repairCostService: RepairCostService) {}

  @Post('estimate')
  @ApiOperation({ summary: 'Generate a full cost report for an incident' })
  async estimate(
    @CurrentUser() user: { id: string },
    @Body('incidentId') incidentId?: string,
    @Body('assessmentIds') assessmentIds?: string[],
  ) {
    return this.repairCostService.generateReport(user.id, incidentId, assessmentIds);
  }

  @Get('history')
  @ApiOperation({ summary: 'Retrieve past generated reports list for user' })
  async getHistory(@CurrentUser() user: { id: string }) {
    return this.repairCostService.getUserReports(user.id);
  }

  @Get('report/:id')
  @ApiOperation({ summary: 'Retrieve a previously generated cost report details' })
  async getReport(
    @CurrentUser() user: { id: string; role?: string },
    @Param('id') id: string,
  ) {
    return this.repairCostService.getReport(user.id, id, user.role);
  }

  @Delete('report/:id')
  @ApiOperation({ summary: 'Delete a previously generated cost report' })
  async deleteReport(
    @CurrentUser() user: { id: string; role?: string },
    @Param('id') id: string,
  ) {
    return this.repairCostService.deleteReport(user.id, id, user.role);
  }

  @Get('report/:id/pdf')
  @ApiOperation({ summary: 'Download the breakdown report as a PDF document' })
  async downloadPdf(
    @CurrentUser() user: { id: string; role?: string },
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const report = await this.repairCostService.getReport(user.id, id, user.role);

    const doc = new PDFDocument({ margin: 50 });
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ResQDrive_Repair_Report_${id}.pdf`);
    
    // Pipe doc directly to the express response
    doc.pipe(res);

    // Document Header
    doc.fillColor('#d32f2f').fontSize(24).font('Helvetica-Bold').text('ResQDrive', 50, 50);
    doc.fillColor('#333333').fontSize(14).font('Helvetica').text('ACCIDENT REPAIR COST ESTIMATE', 50, 78);
    
    // Meta / Date Details
    doc.fillColor('#777777').fontSize(9).text(`Report Generated: ${new Date(report.createdAt).toLocaleDateString()}`, 380, 50, { align: 'right' });
    doc.text(`Report ID: ${report.id}`, 380, 65, { align: 'right' });

    doc.moveTo(50, 100).lineTo(550, 100).strokeColor('#e0e0e0').stroke();

    // Vehicle Details
    doc.y = 115;
    doc.fillColor('#222222').fontSize(11).font('Helvetica-Bold').text('Vehicle Information', 50, doc.y);
    doc.moveDown(0.5);
    doc.font('Helvetica').fillColor('#555555');
    if (report.vehicle) {
      doc.text(`Vehicle Model: ${report.vehicle.year} ${report.vehicle.make} ${report.vehicle.model}`);
      doc.text(`License Plate: ${report.vehicle.licensePlate.toUpperCase()}`);
    } else {
      doc.text('Vehicle Model: Generic / Reference Vehicle');
    }
    
    // Prominent Cost Summary Box
    doc.y = 115;
    doc.rect(330, 115, 220, 60).fillAndStroke('#fbe9e7', '#ffccbc');
    doc.fillColor('#d32f2f').fontSize(10).font('Helvetica-Bold').text('TOTAL ESTIMATED COST RANGE', 340, 125);
    const minTotal = report.totalMinCostPkr != null ? report.totalMinCostPkr.toLocaleString() : '0';
    const maxTotal = report.totalMaxCostPkr != null ? report.totalMaxCostPkr.toLocaleString() : '0';
    doc.fontSize(16).text(`PKR ${minTotal} - ${maxTotal}`, 340, 142);

    doc.y = 200;
    doc.moveTo(50, 200).lineTo(550, 200).strokeColor('#e0e0e0').stroke();

    // Breakdown Line Items Header
    doc.y = 215;
    doc.fillColor('#222222').fontSize(12).font('Helvetica-Bold').text('Damage Cost Breakdown', 50, doc.y);
    doc.moveDown(1);

    // Table Headers
    const tableTop = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Part Affected', 50, tableTop);
    doc.text('Action', 170, tableTop);
    doc.text('Labor Rate (PKR)', 260, tableTop);
    doc.text('Parts Price (PKR)', 360, tableTop);
    doc.text('Line Total (PKR)', 460, tableTop);

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).strokeColor('#888888').stroke();

    doc.y = tableTop + 25;
    doc.font('Helvetica').fillColor('#444444').fontSize(9);

    const rawLineItems = report.lineItems;
    const lineItemsArray: any[] = Array.isArray(rawLineItems)
      ? rawLineItems
      : (typeof rawLineItems === 'string' ? JSON.parse(rawLineItems || '[]') : []);

    for (const item of lineItemsArray) {
      const currentY = doc.y;
      doc.text((item.partTag || '').toUpperCase().replace(/_/g, ' '), 50, currentY);
      doc.text((item.action || '').toUpperCase(), 170, currentY);
      const laborMin = item.laborCost?.min != null ? item.laborCost.min.toLocaleString() : '0';
      const laborMax = item.laborCost?.max != null ? item.laborCost.max.toLocaleString() : '0';
      doc.text(`${laborMin} - ${laborMax}`, 260, currentY);
      
      const partsMin = item.partsCost?.min != null ? item.partsCost.min.toLocaleString() : '0';
      const partsMax = item.partsCost?.max != null ? item.partsCost.max.toLocaleString() : '0';
      const partsText = item.partsSource === 'fallback_default'
        ? `${partsMin} - ${partsMax}*`
        : `${partsMin} - ${partsMax}`;
      
      doc.text(partsText, 360, currentY);
      const lineMin = item.lineTotal?.min != null ? item.lineTotal.min.toLocaleString() : '0';
      const lineMax = item.lineTotal?.max != null ? item.lineTotal.max.toLocaleString() : '0';
      doc.text(`${lineMin} - ${lineMax}`, 460, currentY);

      doc.moveTo(50, currentY + 15).lineTo(550, currentY + 15).strokeColor('#f0f0f0').stroke();
      doc.y = currentY + 20;
    }

    doc.moveDown(2);

    // Disclaimers and notes
    doc.fontSize(8).fillColor('#777777');
    doc.text('Disclaimer: This is an automated estimation. Parts pricing matches generic dynamic values and labor costs match regional workshop averages. Actual costs at verified repair workshops may vary.', { width: 500 });
    
    // Check if fallback pricing indicator exists
    const hasFallback = lineItemsArray.some(item => item.partsSource === 'fallback_default');
    if (hasFallback) {
      doc.moveDown(0.5);
      doc.text('* Parts marked with an asterisk match standard fallback estimates due to API connectivity timeouts.', { width: 500 });
    }

    doc.end();
  }
}
