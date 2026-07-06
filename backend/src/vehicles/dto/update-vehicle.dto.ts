import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

const currentYear = new Date().getFullYear();

export class UpdateVehicleDto {
  @ApiProperty({ required: false, example: 'Toyota' })
  @IsOptional()
  @IsString()
  make?: string;

  @ApiProperty({ required: false, example: 'Corolla' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ required: false, example: 2022 })
  @IsOptional()
  @IsInt()
  @Min(1980)
  @Max(currentYear + 1)
  year?: number;

  @ApiProperty({ required: false, example: 'Black' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ required: false, example: 'ABC-1234' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9\s\-]{3,15}$/, {
    message: 'License plate must be a valid format.',
  })
  licensePlate?: string;
}
