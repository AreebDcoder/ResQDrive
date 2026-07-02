import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: 'a980-token-uuid-like' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
