import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminPdfService {
  constructor(private prisma: PrismaService) {}

  async generateIncidentReportPdf(incidentId: string): Promise<Buffer> {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      include: { user: { select: { fullName: true, email: true, phoneNumber: true } } },
    });

    if (!incident || incident.isDeleted) {
      throw new NotFoundException('Incident not found');
    }

    return new Promise<Buffer>((resolve) => {
      const buffers: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - 100;

      doc.fontSize(22).fillColor('#d32f2f').font('Helvetica-Bold').text('ResQDrive', 50, 50);
      doc.fontSize(14).fillColor('#666666').font('Helvetica').text('Incident Report', 50, 78);

      doc.moveTo(50, 100).lineTo(pageWidth - 50, 100).strokeColor('#e0e0e0').lineWidth(1).stroke();

      let y = 120;

      doc.fontSize(11).fillColor('#888888').font('Helvetica-Bold').text('INCIDENT ID', 50, y);
      doc.fillColor('#000000').font('Helvetica').text(incident.id, 50, y + 14);
      y += 40;

      this.drawSection(doc, 'TYPE', incident.type, 50, y, contentWidth);
      y += 32;
      this.drawSection(doc, 'SEVERITY', incident.severity, 50, y, contentWidth);
      y += 32;
      this.drawSection(doc, 'STATUS', incident.status.replace(/_/g, ' '), 50, y, contentWidth);
      y += 32;
      this.drawSection(doc, 'OCCURRED AT', new Date(incident.occurredAt).toLocaleString(), 50, y, contentWidth);
      y += 32;
      this.drawSection(doc, 'REPORTED BY', `${incident.user.fullName} (${incident.user.email})`, 50, y, contentWidth);
      y += 32;
      this.drawSection(doc, 'CONTACT', incident.user.phoneNumber, 50, y, contentWidth);
      y += 40;

      if (incident.address) {
        this.drawSection(doc, 'ADDRESS', incident.address, 50, y, contentWidth);
        y += 32;
      }

      if (incident.latitude != null && incident.longitude != null) {
        const coords = `${incident.latitude.toFixed(6)}, ${incident.longitude.toFixed(6)}`;
        this.drawSection(doc, 'GPS COORDINATES', coords, 50, y, contentWidth);
        y += 14;
        doc.fontSize(10).fillColor('#d32f2f').font('Helvetica').text(
          `https://www.google.com/maps/search/?api=1&query=${incident.latitude},${incident.longitude}`,
          50, y,
        );
        y += 38;
      }

      if (incident.description) {
        y = this.drawParagraph(doc, 'DESCRIPTION', incident.description, 50, y, contentWidth);
        y += 12;
      }

      if (incident.sensorSnapshot) {
        y = this.drawJsonBlock(doc, 'SENSOR SNAPSHOT', incident.sensorSnapshot, 50, y, contentWidth);
        y += 12;
      }

      if (incident.alertDispatchStatus) {
        y = this.drawJsonBlock(doc, 'ALERT DISPATCH STATUS', incident.alertDispatchStatus, 50, y, contentWidth);
        y += 12;
      }

      if (incident.damageAssessmentResult) {
        y = this.drawJsonBlock(doc, 'DAMAGE ASSESSMENT', incident.damageAssessmentResult, 50, y, contentWidth);
        y += 12;
      }

      doc.moveTo(50, y).lineTo(pageWidth - 50, y).strokeColor('#e0e0e0').lineWidth(1).stroke();
      y += 16;
      doc.fontSize(9).fillColor('#999999').font('Helvetica-Oblique').text(
        `Report generated on ${new Date().toLocaleString()} by ResQDrive Admin System. This document is confidential and intended for insurance, police, or administrative use only.`,
        50, y, { width: contentWidth, align: 'left' },
      );

      doc.end();
    });
  }

  private drawSection(doc: any, label: string, value: string, x: number, y: number, width: number) {
    doc.fontSize(9).fillColor('#888888').font('Helvetica-Bold').text(label, x, y);
    doc.fontSize(12).fillColor('#000000').font('Helvetica').text(value, x, y + 12, { width });
  }

  private drawParagraph(doc: any, label: string, value: string, x: number, y: number, width: number): number {
    doc.fontSize(9).fillColor('#888888').font('Helvetica-Bold').text(label, x, y);
    doc.fontSize(11).fillColor('#000000').font('Helvetica').text(value, x, y + 12, { width, lineGap: 4 });
    const height = doc.heightOfString(value, { width, lineGap: 4 });
    return y + 12 + height;
  }

  private drawJsonBlock(doc: any, label: string, value: any, x: number, y: number, width: number): number {
    doc.fontSize(9).fillColor('#888888').font('Helvetica-Bold').text(label, x, y);
    const json = JSON.stringify(value, null, 2);
    doc.fontSize(9).fillColor('#333333').font('Courier').text(json, x, y + 12, { width: width - 20, lineGap: 2 });
    const height = doc.heightOfString(json, { width: width - 20, lineGap: 2 });
    return y + 12 + height;
  }
}