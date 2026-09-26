import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

/**
 * BulkUserOpsDto — DTO for POST /admin/users/bulk-deactivate
 *
 * Validates that `ids` is a non-empty array of UUID strings.
 */
export class BulkUserOpsDto {
  @ApiProperty({
    description: 'List of user UUIDs to deactivate',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one user ID must be provided.' })
  @IsString({ each: true })
  ids: string[];
}
