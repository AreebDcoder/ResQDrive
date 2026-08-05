import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateRegionalNumberDto {
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsNumber()
  @IsOptional()
  priorityOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
