import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * AdminUpdateVehicleDto — admin override of vehicle fields.
 * All fields optional (partial update).
 */
export class AdminUpdateVehicleDto {
  @ApiPropertyOptional({ example: 'Toyota' })
  @IsOptional()
  @IsString()
  make?: string;

  @ApiPropertyOptional({ example: 'Corolla' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 2022, minimum: 1980 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1980, { message: 'Vehicle year must be 1980 or later.' })
  @Max(new Date().getFullYear() + 1, { message: `Vehicle year cannot be beyond ${new Date().getFullYear() + 1}.` })
  year?: number;

  @ApiPropertyOptional({ example: 'Black' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'ABC-1234' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9\s\-]{3,15}$/, {
    message: 'License plate must be a valid format (e.g., ABC-123, LEA-15-2839).',
  })
  licensePlate?: string;

  @ApiPropertyOptional({ description: 'Mark as primary vehicle for the owner' })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
