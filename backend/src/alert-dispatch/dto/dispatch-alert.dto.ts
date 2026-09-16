import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class DispatchContactDto {
  @IsString()
  name: string;

  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  email?: string;
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

  @ApiPropertyOptional({ type: [DispatchContactDto] })
  @IsOptional()
  @IsArray()
  contacts?: DispatchContactDto[];

  @ApiPropertyOptional({ description: 'Acknowledge URL from Module 6.8 (for WhatsApp message)' })
  @IsOptional()
  @IsString()
  acknowledgeUrl?: string;
}