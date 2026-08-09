import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GeminiPricingService } from './gemini-pricing.service';
import { PartsPriceScraperService } from './parts-price-scraper.service';
import { RepairCostService } from './repair-cost.service';
import { RepairCostController } from './repair-cost.controller';

@Module({
  imports: [PrismaModule],
  providers: [GeminiPricingService, PartsPriceScraperService, RepairCostService],
  controllers: [RepairCostController],
  exports: [RepairCostService, PartsPriceScraperService, GeminiPricingService],
})
export class RepairCostModule {}
