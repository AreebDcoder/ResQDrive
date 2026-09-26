import {
  Body, Controller, Delete, Get, Param, Patch, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminEmergencyContactsService } from './admin-emergency-contacts.service';
import { AdminUpdateContactDto } from './dto/admin-update-contact.dto';

@ApiTags('Admin Emergency Contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/emergency-contacts')
export class AdminEmergencyContactsController {
  constructor(private readonly service: AdminEmergencyContactsService) {}

  @Get()
  @ApiOperation({ summary: 'Paginated list of all emergency contacts (admin). Filter by userId/relationship/search.' })
  async listAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('userId') userId?: string,
    @Query('relationship') relationship?: string,
  ) {
    return this.service.listAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      userId,
      relationship,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Single emergency contact with owner info (admin).' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin edit of contact (name, phoneNumber, email, relationship)' })
  async update(@Param('id') id: string, @Body() dto: AdminUpdateContactDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete contact. Re-sequences priorities contiguously.' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
