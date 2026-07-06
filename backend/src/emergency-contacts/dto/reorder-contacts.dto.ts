import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ContactOrderDto {
  @ApiProperty({ example: 'uuid-string' })
  @IsString()
  @IsNotEmpty()
  contactId: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(5)
  priorityOrder: number;
}

export class ReorderContactsDto {
  @ApiProperty({ type: [ContactOrderDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactOrderDto)
  orders: ContactOrderDto[];
}
