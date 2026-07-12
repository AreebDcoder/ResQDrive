import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { EmailModule } from './email/email.module';
import { UploadModule } from './upload/upload.module';
import { HospitalsModule } from './hospitals/hospitals.module';
import { WorkshopsModule } from './workshops/workshops.module';
import { IncidentsModule } from './incidents/incidents.module';
import { LocationSharingModule } from './location-sharing/location-sharing.module';
import { EmergencyNotificationModule } from './emergency-notification/emergency-notification.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EmergencyNumbersModule } from './emergency-numbers/emergency-numbers.module';
import { AlertDispatchModule } from './alert-dispatch/alert-dispatch.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { EmergencyContactsModule } from './emergency-contacts/emergency-contacts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CrashSoundDetectionModule } from './crash-sound-detection/crash-sound-detection.module';
import { VoiceCommandsModule } from './voice-commands/voice-commands.module';
import { DamageAssessmentModule } from './damage-assessment/damage-assessment.module';
import { RepairCostModule } from './repair-cost/repair-cost.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    AdminModule,
    EmailModule,
    UploadModule,
    HospitalsModule,
    WorkshopsModule,
    IncidentsModule,
    LocationSharingModule,
    EmergencyNotificationModule,
    EmergencyNumbersModule,
    AlertDispatchModule,
    VehiclesModule,
    EmergencyContactsModule,
    NotificationsModule,
    CrashSoundDetectionModule,
    VoiceCommandsModule,
    DamageAssessmentModule,
    RepairCostModule,
  ],
})
export class AppModule {}