import { Module } from '@nestjs/common';
import { AlertDispatchController } from './alert-dispatch.controller';
import { AlertDispatchService } from './alert-dispatch.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [AlertDispatchController],
  providers: [AlertDispatchService],
  exports: [AlertDispatchService],
})
export class AlertDispatchModule {}