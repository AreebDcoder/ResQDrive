import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * AdminInsuranceDto — admin override of vehicle insurance.
 *
 * Mirrors the user-facing InsuranceDto but lives in the admin namespace so
 * Swagger groups it correctly.
 */
export class AdminInsuranceDto {
  @ApiPropertyOptional({ example: 'Jubilee Insurance' })
  @IsOptional()
  @IsString()
  providerName?: string;

  @ApiPropertyOptional({ example: 'JL-987654321' })
  @IsOptional()
  @IsString()
  policyNumber?: string;

  @ApiPropertyOptional({ example: 'Comprehensive' })
  @IsOptional()
  @IsString()
  coverageType?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ example: '0800-12345' })
  @IsOptional()
  @IsString()
  emergencyHelpline?: string;
}
