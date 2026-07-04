import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminPdfService } from './admin-pdf.service';
import { AdminAnalyticsController } from './admin-analytics.controller';

@Module({
  controllers: [AdminController, AdminAnalyticsController],
  providers: [AdminService, AdminAnalyticsService, AdminPdfService],
  exports: [AdminService, AdminAnalyticsService, AdminPdfService],
})
export class AdminModule {}