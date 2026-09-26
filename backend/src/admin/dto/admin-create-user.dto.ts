import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MinLength,
} from 'class-validator';

/**
 * AdminCreateUserDto — DTO for POST /admin/users
 *
 * Admins can create any role (including ADMIN). Self-registration via
 * /auth/register explicitly blocks ADMIN role — but admin override via
 * this endpoint is allowed.
 *
 * Validates:
 *   - fullName: non-empty string
 *   - email: valid email format
 *   - phoneNumber: E.164 format (e.g. +923001234567)
 *   - password: min 8 chars, at least one number + one special char
 *   - role: DRIVER | MECHANIC | ADMIN
 *   - role-specific fields (cnicNumber, drivingLicenseNumber for DRIVER;
 *     workshopName, workshopAddress, specialization for MECHANIC) are optional
 */
export class AdminCreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'john@resqdrive.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+923001234567' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be a valid E.164 format (e.g. +923001234567).',
  })
  phoneNumber: string;

  @ApiProperty({ example: 'Pass1234!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(/^(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])/, {
    message: 'Password must contain at least one number and one special character.',
  })
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.DRIVER })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({ example: '42101-1234567-1' })
  @IsOptional()
  @IsString()
  cnicNumber?: string;

  @ApiPropertyOptional({ example: 'DL-987654321' })
  @IsOptional()
  @IsString()
  drivingLicenseNumber?: string;

  @ApiPropertyOptional({ example: 'Auto Fix Workshop' })
  @IsOptional()
  @IsString()
  workshopName?: string;

  @ApiPropertyOptional({ example: '123 Main St, Karachi' })
  @IsOptional()
  @IsString()
  workshopAddress?: string;

  @ApiPropertyOptional({ example: 'Engine Repair' })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiPropertyOptional({ default: false, description: 'Bypass email verification (admin-created users are auto-verified)' })
  @IsOptional()
  isVerified?: boolean;
}
