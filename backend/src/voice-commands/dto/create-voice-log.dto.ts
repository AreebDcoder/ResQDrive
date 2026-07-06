import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { VoiceIntent } from '@prisma/client';

export class CreateVoiceLogDto {
  @ApiProperty({ required: false, example: 'd3b07384-d113-49c3-a558-f58c42a229a4' })
  @IsOptional()
  @IsUUID('4', { message: 'Incident ID must be a valid UUID v4.' })
  incidentId?: string;

  @ApiProperty({ example: 'cancel the alarm im fine' })
  @IsString()
  @IsNotEmpty()
  rawTranscript: string;

  @ApiProperty({ enum: VoiceIntent, example: VoiceIntent.cancel })
  @IsEnum(VoiceIntent, { message: 'Classified intent must be cancel, sos, or unknown.' })
  classifiedIntent: VoiceIntent;

  @ApiProperty({ example: 'native' })
  @IsString()
  @IsNotEmpty()
  recognitionEngine: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  actionTaken: boolean;
}
