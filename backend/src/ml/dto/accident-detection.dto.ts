import { IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AccidentDetectionDto {
  @ApiProperty({ example: 5.99, description: 'Acceleration peak magnitude in g' })
  @IsNumber()
  @IsNotEmpty()
  accel_peak: number;

  @ApiProperty({ example: 1.28, description: 'Acceleration mean magnitude in g' })
  @IsNumber()
  @IsNotEmpty()
  accel_mean: number;

  @ApiProperty({ example: 0.74, description: 'Acceleration standard deviation in g' })
  @IsNumber()
  @IsNotEmpty()
  accel_std: number;

  @ApiProperty({ example: 1.48, description: 'Acceleration RMS energy in g' })
  @IsNumber()
  @IsNotEmpty()
  accel_rms: number;

  @ApiProperty({ example: 4.56, description: 'Jerk peak magnitude in g/s' })
  @IsNumber()
  @IsNotEmpty()
  jerk_peak: number;

  @ApiProperty({ example: 0.19, description: 'Jerk mean magnitude in g/s' })
  @IsNumber()
  @IsNotEmpty()
  jerk_mean: number;

  @ApiProperty({ example: 0.48, description: 'Jerk standard deviation in g/s' })
  @IsNumber()
  @IsNotEmpty()
  jerk_std: number;

  @ApiProperty({ example: 402.8, description: 'Gyroscope peak angular velocity in deg/s' })
  @IsNumber()
  @IsNotEmpty()
  gyro_peak: number;

  @ApiProperty({ example: 41.8, description: 'Gyroscope mean angular velocity in deg/s' })
  @IsNumber()
  @IsNotEmpty()
  gyro_mean: number;

  @ApiProperty({ example: 78.2, description: 'Gyroscope standard deviation in deg/s' })
  @IsNumber()
  @IsNotEmpty()
  gyro_std: number;

  @ApiProperty({ example: 88.7, description: 'Gyroscope RMS angular velocity in deg/s' })
  @IsNumber()
  @IsNotEmpty()
  gyro_rms: number;

  @ApiProperty({ example: 103.0, description: 'Initial GPS speed before impact in km/h' })
  @IsNumber()
  @IsNotEmpty()
  speed_initial: number;

  @ApiProperty({ example: 0.0, description: 'Final GPS speed after impact in km/h' })
  @IsNumber()
  @IsNotEmpty()
  speed_final: number;

  @ApiProperty({ example: 105.0, description: 'Maximum GPS speed in event window in km/h' })
  @IsNumber()
  @IsNotEmpty()
  speed_max: number;

  @ApiProperty({ example: 0.0, description: 'Minimum GPS speed in event window in km/h' })
  @IsNumber()
  @IsNotEmpty()
  speed_min: number;

  @ApiProperty({ example: 103.0, description: 'Speed drop in km/h' })
  @IsNumber()
  @IsNotEmpty()
  speed_drop: number;

  @ApiProperty({ example: 105.0, description: 'Speed range (max - min) in km/h' })
  @IsNumber()
  @IsNotEmpty()
  speed_range: number;
}
