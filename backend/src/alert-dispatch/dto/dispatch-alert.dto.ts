import { IsString, IsNumber, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ContactTargetDto {
  @IsString()
  name: string;

  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  pushToken?: string;
}

export class DispatchAlertDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  incidentId?: string;

  @IsString()
  userName: string;

  @IsOptional()
  @IsString()
  vehicleInfo?: string;

  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  longitude: number;

  @IsString()
  severity: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactTargetDto)
  contacts: ContactTargetDto[];
}