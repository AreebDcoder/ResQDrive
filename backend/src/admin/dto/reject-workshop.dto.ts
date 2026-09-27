import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * RejectWorkshopDto — DTO for PATCH /admin/users/:id/reject-workshop
 *
 * Used when admin rejects a mechanic's workshop verification. The `reason`
 * field is included in the email notification sent to the mechanic so they
 * understand what to fix before re-applying.
 */
export class RejectWorkshopDto {
  @ApiProperty({
    example: 'Workshop address not verifiable. Please upload a utility bill as proof.',
    description: 'Reason for rejection. Will be sent to the mechanic via email.',
  })
  @IsString()
  @IsNotEmpty({ message: 'A rejection reason must be provided.' })
  @MaxLength(1000, { message: 'Reason must be 1000 characters or fewer.' })
  reason: string;
}
