import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDetectionLogDto {
  @ApiProperty({ required: false, example: 'd3b07384-d113-49c3-a558-f58c42a229a4' })
  @IsOptional()
  @IsUUID('4', { message: 'Incident ID must be a valid UUID v4.' })
  incidentId?: string;

  @ApiProperty({ example: '2026-07-06T00:51:27Z' })
  @IsDateString({}, { message: 'Window timestamp must be a valid ISO-8601 date string.' })
  windowTimestamp: string;

  @ApiProperty({ required: false, example: 'Skidding' })
  @IsOptional()
  @IsString()
  topMatchedClass?: string;

  @ApiProperty({ example: 0.85 })
  @IsNumber()
  crashConfidence: number;

  @ApiProperty({ example: 0.3 })
  @IsNumber()
  thresholdUsed: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  flaggedAsCrash: boolean;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  combinedWithSensorSignal?: boolean;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  triggeredByTransient?: boolean;
}
