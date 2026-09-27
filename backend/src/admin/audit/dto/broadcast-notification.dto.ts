import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * BroadcastNotificationDto — payload for POST /admin/notifications/broadcast
 */
export class BroadcastNotificationDto {
  @ApiProperty({ example: 'System maintenance scheduled' })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title: string;

  @ApiProperty({ example: 'The system will be down for 30 minutes tonight at 2 AM.' })
  @IsString()
  @MinLength(1)
  body: string;

  @ApiPropertyOptional({ enum: ['driving_mode', 'alert_delivery_confirmation', 'false_alarm_log', 'system_status', 'general'], default: 'general' })
  @IsOptional()
  @IsEnum(['driving_mode', 'alert_delivery_confirmation', 'false_alarm_log', 'system_status', 'general'])
  category?: string;

  @ApiProperty({ enum: ['ALL', 'DRIVERS', 'MECHANICS'], description: 'Who should receive this broadcast?' })
  @IsEnum(['ALL', 'DRIVERS', 'MECHANICS'])
  segment: 'ALL' | 'DRIVERS' | 'MECHANICS';
}
