import { IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { AccidentReportSeverity } from '@prisma/client';

export class CreateReportDto {
  @IsUUID()
  @IsOptional()
  incidentId?: string;

  @IsUUID()
  @IsOptional()
  vehicleId?: string;

  @IsEnum(AccidentReportSeverity)
  severity: AccidentReportSeverity;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;
}
