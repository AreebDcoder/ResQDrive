import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { DamageAssessmentController } from './damage-assessment.controller';
import { DamageAssessmentService } from './damage-assessment.service';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [DamageAssessmentController],
  providers: [DamageAssessmentService],
  exports: [DamageAssessmentService],
})
export class DamageAssessmentModule {}
