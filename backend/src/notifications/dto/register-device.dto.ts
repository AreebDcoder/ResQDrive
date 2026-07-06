import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'fcm-device-token-123456' })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;

  @ApiProperty({ enum: ['android', 'ios'], example: 'android' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['android', 'ios'], { message: 'Platform must be either android or ios.' })
  platform: string;
}
