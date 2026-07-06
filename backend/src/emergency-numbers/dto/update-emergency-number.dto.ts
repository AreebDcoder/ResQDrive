import { PartialType } from '@nestjs/mapped-types';
import { CreateEmergencyNumberDto } from './create-emergency-number.dto';

export class UpdateEmergencyNumberDto extends PartialType(CreateEmergencyNumberDto) {}