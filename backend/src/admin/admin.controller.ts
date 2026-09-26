import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserProfileDto } from './dto/admin-update-user-profile.dto';
import { RejectWorkshopDto } from './dto/reject-workshop.dto';
import { BulkUserOpsDto } from './dto/bulk-user-ops.dto';

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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user (admin can create any role)' })
  @ApiResponse({ status: 201, description: 'User created.' })
  @ApiResponse({ status: 400, description: 'Email or phone already in use.' })
  async createUser(@Body() dto: AdminCreateUserDto) {
    return this.adminService.createUser(dto);
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

  @Patch(':id/profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin override of user profile (name, email, phone, role-specific fields)' })
  @ApiResponse({ status: 200, description: 'Profile updated.' })
  async updateProfile(@Param('id') id: string, @Body() dto: AdminUpdateUserProfileDto) {
    return this.adminService.updateUserProfile(id, dto);
  }

  @Post(':id/force-logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all refresh tokens for a user (force-logout all their sessions)' })
  async forceLogout(@Param('id') id: string) {
    return this.adminService.forceLogout(id);
  }

  @Patch(':id/verify-workshop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a mechanic workshop. Sends approval email.' })
  @ApiResponse({ status: 200, description: 'Workshop status changed.' })
  async verifyWorkshop(@Param('id') id: string, @Body('isWorkshopVerified') isWorkshopVerified: boolean) {
    return this.adminService.verifyWorkshop(id, isWorkshopVerified);
  }

  @Patch(':id/reject-workshop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a mechanic workshop application. Sends rejection email with reason.' })
  @ApiResponse({ status: 200, description: 'Workshop rejected. Email sent.' })
  async rejectWorkshop(@Param('id') id: string, @Body() dto: RejectWorkshopDto) {
    return this.adminService.rejectWorkshop(id, dto.reason);
  }

  @Post('bulk-deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk deactivate multiple users in one transaction. Revokes all their refresh tokens.' })
  @ApiResponse({ status: 200, description: 'Returns { count, deactivatedIds[] }.' })
  async bulkDeactivate(@Body() dto: BulkUserOpsDto) {
    return this.adminService.bulkDeactivate(dto.ids);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently remove a user account' })
  @ApiResponse({ status: 200, description: 'User deleted.' })
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }
}
