import { IsString, IsNotEmpty } from 'class-validator';

export class CreateEmergencyNumberDto {
  @IsString()
  @IsNotEmpty()
  region: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  number: string;
}