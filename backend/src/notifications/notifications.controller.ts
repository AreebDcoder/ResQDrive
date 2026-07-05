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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { NotificationCategory } from '@prisma/client';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post('register-device')
  @ApiOperation({ summary: 'Register or update FCM device token for push delivery' })
  async registerDevice(
    @CurrentUser() user: { id: string },
    @Body() registerDto: RegisterDeviceDto,
  ) {
    return this.notificationsService.registerDevice(user.id, registerDto);
  }

  @Delete('register-device')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a device token (e.g. on logout)' })
  async removeDeviceToken(
    @CurrentUser() user: { id: string },
    @Body('fcmToken') fcmToken: string,
  ) {
    return this.notificationsService.removeDeviceToken(user.id, fcmToken);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get current user notification toggles' })
  async getPreferences(@CurrentUser() user: { id: string }) {
    return this.notificationsService.getPreferences(user.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification category toggles' })
  async updatePreferences(
    @CurrentUser() user: { id: string },
    @Body() updateDto: UpdatePreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(user.id, updateDto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get paginated list of past notification logs' })
  @ApiQuery({ name: 'category', required: false, enum: NotificationCategory })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getHistory(
    @CurrentUser() user: { id: string },
    @Query('category') category?: NotificationCategory,
    @Query('isRead') isRead?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const isReadBool = isRead !== undefined ? isRead === 'true' : undefined;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    return this.notificationsService.getHistory(user.id, category, isReadBool, pageNum, limitNum);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser() user: { id: string }) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark single notification log as read' })
  async markAsRead(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.markAsRead(user.id, id);
  }
}
