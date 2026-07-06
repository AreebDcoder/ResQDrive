import { Module } from '@nestjs/common';
import { VoiceCommandsService } from './voice-commands.service';
import { VoiceCommandsController } from './voice-commands.controller';

@Module({
  controllers: [VoiceCommandsController],
  providers: [VoiceCommandsService],
  exports: [VoiceCommandsService],
})
export class VoiceCommandsModule {}
