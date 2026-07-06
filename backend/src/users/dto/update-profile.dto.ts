import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ required: false, example: 'John Doe Jr.' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ required: false, example: '+923001234567' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Phone number must be a valid E.164 format.' })
  phoneNumber?: string;

  @ApiProperty({ required: false, example: 'http://cloudinary.com/pic.jpg' })
  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cnicNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  drivingLicenseNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  workshopName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  workshopAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiProperty({ required: false, example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsOptional()
  @IsString()
  pushToken?: string;
}