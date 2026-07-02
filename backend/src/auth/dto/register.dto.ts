import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email: string;

  @ApiProperty({ example: '+923001234567' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Phone number must be a valid E.164 format (e.g. +923001234567).' })
  phoneNumber: string;

  @ApiProperty({ example: 'Pass1234!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(/^(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])/, {
    message: 'Password must contain at least one number and one special character.',
  })
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.DRIVER })
  @IsEnum(UserRole, { message: 'Role must be either DRIVER or MECHANIC.' })
  role: UserRole;

  @ApiProperty({ required: false, example: '42101-1234567-1' })
  @IsOptional()
  @IsString()
  cnicNumber?: string;

  @ApiProperty({ required: false, example: 'DL-987654321' })
  @IsOptional()
  @IsString()
  drivingLicenseNumber?: string;

  @ApiProperty({ required: false, example: 'Auto Fix Workshop' })
  @IsOptional()
  @IsString()
  workshopName?: string;

  @ApiProperty({ required: false, example: '123 Main St, Karachi' })
  @IsOptional()
  @IsString()
  workshopAddress?: string;

  @ApiProperty({ required: false, example: 'Engine Repair' })
  @IsOptional()
  @IsString()
  specialization?: string;
}
