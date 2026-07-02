import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Pass1234!' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'NewPass5678!' })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long.' })
  @Matches(/^(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])/, {
    message: 'New password must contain at least one number and one special character.',
  })
  newPassword: string;
}
