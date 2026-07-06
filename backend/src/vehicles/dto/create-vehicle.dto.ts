import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

const currentYear = new Date().getFullYear();

export class CreateVehicleDto {
  @ApiProperty({ example: 'Toyota' })
  @IsString()
  @IsNotEmpty()
  make: string;

  @ApiProperty({ example: 'Corolla' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ example: 2022 })
  @IsInt()
  @Min(1980, { message: 'Vehicle year must be 1980 or later.' })
  @Max(currentYear + 1, { message: `Vehicle year cannot be beyond ${currentYear + 1}.` })
  year: number;

  @ApiProperty({ required: false, example: 'Black' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: 'ABC-1234' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9\s\-]{3,15}$/, {
    message: 'License plate must be a valid format (e.g., ABC-123, LEA-15-2839).',
  })
  licensePlate: string;
}
