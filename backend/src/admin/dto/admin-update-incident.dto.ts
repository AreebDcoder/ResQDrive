import { ApiPropertyOptional } from '@nestjs/swagger';
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

/**
 * AdminUpdateIncidentDto — DTO for PATCH /admin/incidents/:id
 *
 * Allows admin to override any field on an incident EXCEPT userId (immutable)
 * and isDeleted/archived (use the dedicated soft-delete/restore endpoints).
 *
 * All fields optional — partial update.
 */
export class AdminUpdateIncidentDto {
  @ApiPropertyOptional({ enum: IncidentType, description: 'Incident type' })
  @IsOptional()
  @IsEnum(IncidentType)
  type?: IncidentType;

  @ApiPropertyOptional({ enum: IncidentSeverity, description: 'Incident severity level' })
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @ApiPropertyOptional({ enum: IncidentStatus, description: 'Workflow status' })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @ApiPropertyOptional({ example: '2026-07-04T10:30:00.000Z', description: 'ISO 8601 timestamp' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

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

  @ApiPropertyOptional({ description: 'Raw sensor data at time of incident' })
  @IsOptional()
  @IsObject()
  sensorSnapshot?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Per-channel dispatch outcome' })
  @IsOptional()
  @IsObject()
  alertDispatchStatus?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Damage assessment summary' })
  @IsOptional()
  @IsObject()
  damageAssessmentResult?: Record<string, any>;
}
