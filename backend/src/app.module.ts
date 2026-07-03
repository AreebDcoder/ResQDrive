import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { EmailModule } from './email/email.module';
import { UploadModule } from './upload/upload.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { EmergencyContactsModule } from './emergency-contacts/emergency-contacts.module';

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
    VehiclesModule,
    EmergencyContactsModule,
  ],
})
export class AppModule {}
