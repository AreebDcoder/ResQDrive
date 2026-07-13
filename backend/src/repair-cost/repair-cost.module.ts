import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GeminiPricingService } from './gemini-pricing.service';
import { RepairCostService } from './repair-cost.service';
import { RepairCostController } from './repair-cost.controller';

@Module({
  imports: [PrismaModule],
  providers: [GeminiPricingService, RepairCostService],
  controllers: [RepairCostController],
  exports: [RepairCostService],
})
export class RepairCostModule {}
