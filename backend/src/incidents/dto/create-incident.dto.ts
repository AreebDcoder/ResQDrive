import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentSeverity, IncidentStatus, IncidentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateIncidentDto {
  @ApiPropertyOptional({ enum: IncidentType, default: IncidentType.MANUAL })
  @IsOptional()
  @IsEnum(IncidentType)
  type?: IncidentType;

  @ApiPropertyOptional({ enum: IncidentSeverity, default: IncidentSeverity.NONE })
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @ApiPropertyOptional({ enum: IncidentStatus, default: IncidentStatus.ACTIVE })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @ApiProperty({ example: '2026-07-04T10:30:00.000Z' })
  @IsDateString()
  occurredAt: string;

  @ApiPropertyOptional({ example: 24.8607, minimum: -90, maximum: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 67.0011, minimum: -180, maximum: 180 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ example: 'Shahrah-e-Faisal, Karachi' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'Rear-ended at traffic signal' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    example: {
      accelerometer: { x: 2.1, y: 0.4, z: 9.8 },
      gyroscope: { x: 0.1, y: 0.2, z: 0.05 },
      speedKmh: 0,
    },
  })
  @IsOptional()
  @IsObject()
  sensorSnapshot?: Record<string, any>;

  @ApiPropertyOptional({
    example: { push: 'delivered', sms: 'failed', email: 'pending' },
  })
  @IsOptional()
  @IsObject()
  alertDispatchStatus?: Record<string, any>;

  @ApiPropertyOptional({
    example: {
      damageType: 'MODERATE',
      damagedArea: 'front',
      confidence: 0.87,
      estimatedCost: 45000,
    },
  })
  @IsOptional()
  @IsObject()
  damageAssessmentResult?: Record<string, any>;
}