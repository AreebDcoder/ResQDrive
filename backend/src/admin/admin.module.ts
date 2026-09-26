import { Module } from '@nestjs/common';
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

@Module({
  controllers: [
    AdminController,
    AdminAnalyticsController,
    AdminVehiclesController,
    AdminEmergencyContactsController,
    AdminAccidentReportsController,
  ],
  providers: [
    AdminService,
    AdminAnalyticsService,
    AdminPdfService,
    AdminVehiclesService,
    AdminEmergencyContactsService,
    AdminAccidentReportsService,
  ],
  exports: [
    AdminService,
    AdminAnalyticsService,
    AdminPdfService,
    AdminVehiclesService,
    AdminEmergencyContactsService,
    AdminAccidentReportsService,
  ],
})
export class AdminModule {}
