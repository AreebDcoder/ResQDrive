import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EmergencyContactsService } from './emergency-contacts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateContactDto } from './dto/create-contact.dto';
import { ReorderContactsDto } from './dto/reorder-contacts.dto';

@ApiTags('Emergency Contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('emergency-contacts')
export class EmergencyContactsController {
  constructor(private contactsService: EmergencyContactsService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new emergency contact (max 5)' })
  @ApiResponse({ status: 201, description: 'Contact successfully created.' })
  async create(@CurrentUser() user: { id: string }, @Body() createContactDto: CreateContactDto) {
    return this.contactsService.create(user.id, createContactDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all emergency contacts ordered by priority' })
  async findAll(@CurrentUser() user: { id: string }) {
    return this.contactsService.findAll(user.id);
  }

  @Get('quick-access')
  @ApiOperation({ summary: 'Get lightweight contacts payload for dashboard caching' })
  async getQuickAccess(@CurrentUser() user: { id: string }) {
    return this.contactsService.getQuickAccess(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single contact details' })
  async findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.contactsService.findOne(user.id, id);
  }

  @Patch('reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder contact priorities bulk transaction' })
  async reorder(@CurrentUser() user: { id: string }, @Body() reorderDto: ReorderContactsDto) {
    return this.contactsService.reorder(user.id, reorderDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update contact details' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() updateContactDto: Partial<CreateContactDto>,
  ) {
    return this.contactsService.update(user.id, id, updateContactDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an emergency contact and re-sequence remaining priorities' })
  async delete(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.contactsService.delete(user.id, id);
  }
}
