import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/**
 * AdminUpdateUserProfileDto — DTO for PATCH /admin/users/:id/profile
 *
 * Allows admin to override user profile fields. Does NOT allow changing
 * role (use /role endpoint) or isActive (use /status endpoint).
 */
export class AdminUpdateUserProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: 'john@resqdrive.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+923001234567' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be a valid E.164 format (e.g. +923001234567).',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'URL to profile picture (use /upload endpoint first)' })
  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @ApiPropertyOptional({ example: '42101-1234567-1', description: 'Driver CNIC (only relevant for DRIVER role)' })
  @IsOptional()
  @IsString()
  cnicNumber?: string;

  @ApiPropertyOptional({ example: 'DL-987654321', description: 'Driver license number (only relevant for DRIVER role)' })
  @IsOptional()
  @IsString()
  drivingLicenseNumber?: string;

  @ApiPropertyOptional({ example: 'Auto Fix Workshop', description: 'Workshop name (only relevant for MECHANIC role)' })
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
}
