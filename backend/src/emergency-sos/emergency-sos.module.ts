import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmergencySosService } from './emergency-sos.service';
import { EmergencySosController } from './emergency-sos.controller';
import { AdminEmergencyNumbersController } from './admin-emergency-numbers.controller';
import { EmergencySosOrchestrator } from './emergency-sos.orchestrator';

@Module({
  imports: [PrismaModule],
  controllers: [EmergencySosController, AdminEmergencyNumbersController],
  providers: [EmergencySosService, EmergencySosOrchestrator],
  exports: [EmergencySosService, EmergencySosOrchestrator],
})
export class EmergencySosModule {}
