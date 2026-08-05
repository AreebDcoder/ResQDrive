import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateRegionalNumberDto {
  @IsString()
  @IsNotEmpty()
  regionName: string;

  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsNumber()
  @IsOptional()
  priorityOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
