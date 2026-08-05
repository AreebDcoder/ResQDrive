import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class LogCallDto {
  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @IsBoolean()
  @IsNotEmpty()
  autoDialed: boolean;
}
