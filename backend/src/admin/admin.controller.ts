import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Admin Users Control')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/users')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Paginated user audit list' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of users returned.' })
  async listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: UserRole,
    @Query('isActive') isActive?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 10;
    const active = isActive !== undefined ? isActive === 'true' : undefined;
    return this.adminService.listUsers(p, l, role, active);
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user role (RBAC escalation/de-escalation)' })
  @ApiResponse({ status: 200, description: 'Role changed.' })
  async changeRole(@Param('id') id: string, @Body('role') role: UserRole) {
    return this.adminService.changeUserRole(id, role);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate or reactivate an account' })
  @ApiResponse({ status: 200, description: 'Status updated.' })
  async changeStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.adminService.changeUserStatus(id, isActive);
  }

  @Patch(':id/verify-workshop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify mechanic workshop profile' })
  @ApiResponse({ status: 200, description: 'Workshop status changed.' })
  async verifyWorkshop(@Param('id') id: string, @Body('isWorkshopVerified') isWorkshopVerified: boolean) {
    return this.adminService.verifyWorkshop(id, isWorkshopVerified);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently remove a user account' })
  @ApiResponse({ status: 200, description: 'User deleted.' })
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }
}
