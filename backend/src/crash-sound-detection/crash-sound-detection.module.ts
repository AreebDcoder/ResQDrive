import { Module } from '@nestjs/common';
import { CrashSoundDetectionService } from './crash-sound-detection.service';
import { CrashSoundDetectionController } from './crash-sound-detection.controller';

@Module({
  controllers: [CrashSoundDetectionController],
  providers: [CrashSoundDetectionService],
  exports: [CrashSoundDetectionService],
})
export class CrashSoundDetectionModule {}
