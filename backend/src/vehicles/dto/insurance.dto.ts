import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class InsuranceDto {
  @ApiProperty({ required: false, example: 'EFU General Insurance' })
  @IsOptional()
  @IsString()
  providerName?: string;

  @ApiProperty({ required: false, example: 'POL-1234567-XYZ' })
  @IsOptional()
  @IsString()
  policyNumber?: string;

  @ApiProperty({ required: false, example: 'Comprehensive' })
  @IsOptional()
  @IsString()
  coverageType?: string;

  @ApiProperty({ required: false, example: '2027-12-31' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty({ required: false, example: '111-338-111' })
  @IsOptional()
  @IsString()
  emergencyHelpline?: string;
}
