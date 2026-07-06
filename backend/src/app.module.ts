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
import { ScheduleModule } from '@nestjs/schedule';
import { EmergencyNumbersModule } from './emergency-numbers/emergency-numbers.module';
import { AlertDispatchModule } from './alert-dispatch/alert-dispatch.module';

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
    EmergencyNumbersModule,
    AlertDispatchModule,
  ],
})
export class AppModule {}