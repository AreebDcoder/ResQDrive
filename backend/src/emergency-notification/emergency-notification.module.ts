import { Module } from '@nestjs/common';
import { EmergencyNotificationController } from './emergency-notification.controller';
import { EmergencyNotificationService } from './emergency-notification.service';
import { EmergencyNotificationScheduler } from './emergency-notification.scheduler';
import { LocationSharingModule } from '../location-sharing/location-sharing.module';

@Module({
  imports: [LocationSharingModule],
  controllers: [EmergencyNotificationController],
  providers: [EmergencyNotificationService, EmergencyNotificationScheduler],
  exports: [EmergencyNotificationService],
})
export class EmergencyNotificationModule {}