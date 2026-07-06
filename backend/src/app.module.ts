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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
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
  ],
})
export class AppModule {}