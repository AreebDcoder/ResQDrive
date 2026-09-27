import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminPdfService } from './admin-pdf.service';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminVehiclesController } from './vehicles/admin-vehicles.controller';
import { AdminVehiclesService } from './vehicles/admin-vehicles.service';
import { AdminEmergencyContactsController } from './contacts/admin-emergency-contacts.controller';
import { AdminEmergencyContactsService } from './contacts/admin-emergency-contacts.service';
import { AdminAccidentReportsController } from './accident-reports/admin-accident-reports.controller';
import { AdminAccidentReportsService } from './accident-reports/admin-accident-reports.service';
import { AdminAuditController } from './audit/admin-audit.controller';
import { AdminAuditService } from './audit/admin-audit.service';
import { AuditLogInterceptor } from './audit/audit-log.interceptor';

@Module({
  imports: [
    NotificationsModule, // 👈 Added this so AdminAuditService can use NotificationsService
  ],
  controllers: [
    AdminController,
    AdminAnalyticsController,
    AdminVehiclesController,
    AdminEmergencyContactsController,
    AdminAccidentReportsController,
    AdminAuditController,
  ],
  providers: [
    AdminService,
    AdminAnalyticsService,
    AdminPdfService,
    AdminVehiclesService,
    AdminEmergencyContactsService,
    AdminAccidentReportsService,
    AdminAuditService,
    AuditLogInterceptor,
  ],
  exports: [
    AdminService,
    AdminAnalyticsService,
    AdminPdfService,
    AdminVehiclesService,
    AdminEmergencyContactsService,
    AdminAccidentReportsService,
    AdminAuditService,
  ],
})
export class AdminModule {}
