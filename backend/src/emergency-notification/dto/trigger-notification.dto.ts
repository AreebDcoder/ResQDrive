import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsString, IsNumber, Min, Max } from 'class-validator';

export class TriggerNotificationDto {
  @ApiPropertyOptional({ description: 'Optional incident ID to link the alert to' })
  @IsOptional()
  @IsUUID()
  incidentId?: string;

  @ApiPropertyOptional({ description: 'Optional custom message to include in alert' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'User latitude at time of trigger', minimum: -90, maximum: 90 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: 'User longitude at time of trigger', minimum: -180, maximum: 180 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ description: 'Address text at time of trigger' })
  @IsOptional()
  @IsString()
  address?: string;
}