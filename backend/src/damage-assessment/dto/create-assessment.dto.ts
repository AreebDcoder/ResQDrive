import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { PartTag } from '@prisma/client';

export class CreateAssessmentDto {
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsUUID()
  incidentId?: string;

  @IsOptional()
  @IsEnum(PartTag)
  partTag?: PartTag;
}
