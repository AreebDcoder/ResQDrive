import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DispatchContactDto {
  @IsString()
  name: string;

  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsInt()
  priorityOrder?: number;                    // ← NEW: accept priorityOrder
}

export class DispatchAlertDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  incidentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleInfo?: string;

  @ApiProperty()
  @IsNumber()
  @IsLatitude()
  latitude: number;

  @ApiProperty()
  @IsNumber()
  @IsLongitude()
  longitude: number;

  @ApiProperty()
  @IsString()
  severity: string;

  @ApiPropertyOptional({ description: 'Reverse-geocoded street address (used in WhatsApp message)' })
  @IsOptional()
  @IsString()
  address?: string;                           // ← NEW: accept address

  @ApiPropertyOptional({ type: [DispatchContactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DispatchContactDto)             // ← NEW: proper nested transformation
  contacts?: DispatchContactDto[];

  @ApiPropertyOptional({ description: 'Acknowledge URL from Module 6.8 (for WhatsApp message)' })
  @IsOptional()
  @IsString()
  acknowledgeUrl?: string;
}