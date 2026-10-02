import { IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccidentDetectionDto } from './accident-detection.dto';

export class SeverityDto extends AccidentDetectionDto {
  @ApiProperty({ example: 85.0, description: 'Duration of the structural impact window in milliseconds' })
  @IsNumber()
  @IsNotEmpty()
  impact_duration_ms: number;

  @ApiProperty({ example: true, description: 'Whether crash audio was detected (confidence >= 0.40)' })
  @IsNotEmpty()
  audio_detected: boolean | number;
}
