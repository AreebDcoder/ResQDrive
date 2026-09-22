import { Module } from '@nestjs/common';
import { AlertDispatchService } from './alert-dispatch.service';
import { AlertDispatchController } from './alert-dispatch.controller';
import { WhatsAppService } from './whatsapp.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, EmailModule, ConfigModule],
  controllers: [AlertDispatchController],
  providers: [AlertDispatchService, WhatsAppService],
  exports: [AlertDispatchService, WhatsAppService],
})
export class AlertDispatchModule {}