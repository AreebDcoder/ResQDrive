import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class StartSessionDto {
  @ApiPropertyOptional({ description: 'Optional incident ID to link the session to' })
  @IsOptional()
  @IsUUID()
  incidentId?: string;
}