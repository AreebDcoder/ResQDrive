import { Module } from '@nestjs/common';
import { EmergencyNumbersController } from './emergency-numbers.controller';
import { EmergencyNumbersService } from './emergency-numbers.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EmergencyNumbersController],
  providers: [EmergencyNumbersService],
})
export class EmergencyNumbersModule {}