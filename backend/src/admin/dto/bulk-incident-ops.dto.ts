import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

/**
 * BulkIncidentOpsDto — DTO for bulk incident operations.
 *
 * Used by:
 *   POST /admin/incidents/bulk-resolve   → marks all matching IDs as RESOLVED
 *   POST /admin/incidents/bulk-delete    → soft-deletes all matching IDs
 *
 * Validates that `ids` is a non-empty array of UUID strings.
 */
export class BulkIncidentOpsDto {
  @ApiProperty({
    description: 'List of incident UUIDs to operate on',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one incident ID must be provided.' })
  @IsString({ each: true })
  ids: string[];
}
