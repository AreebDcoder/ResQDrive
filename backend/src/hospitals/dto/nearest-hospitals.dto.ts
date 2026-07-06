import { IsNumber, IsLatitude, IsLongitude } from 'class-validator';
import { Type } from 'class-transformer';

export class NearestHospitalsDto {
  @Type(() => Number)
  @IsNumber()
  @IsLatitude()
  lat: number;

  @Type(() => Number)
  @IsNumber()
  @IsLongitude()
  lng: number;
}