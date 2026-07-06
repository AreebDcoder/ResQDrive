import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EmergencyNotificationService } from './emergency-notification.service';
import { TriggerNotificationDto } from './dto/trigger-notification.dto';

@ApiTags('Emergency Notification')
@Controller('emergency-notification')
export class EmergencyNotificationController {
  constructor(private notificationService: EmergencyNotificationService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('trigger')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Trigger an emergency notification to all emergency contacts (auth required)' })
  async trigger(
    @CurrentUser() user: { id: string },
    @Body() dto: TriggerNotificationDto,
  ) {
    return this.notificationService.trigger(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':sessionId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an active emergency notification session (auth required)' })
  async cancel(
    @CurrentUser() user: { id: string },
    @Param('sessionId') sessionId: string,
  ) {
    return this.notificationService.cancel(user.id, sessionId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('status')
  @ApiOperation({ summary: 'Check current user active emergency notification session (auth required)' })
  async getStatus(@CurrentUser() user: { id: string }) {
    return this.notificationService.getStatus(user.id);
  }

  @Post('public/:shareToken/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Public endpoint — acknowledge an emergency alert (no auth, contact uses share token)' })
  async acknowledge(
    @Param('shareToken') shareToken: string,
    @Body() body: { name: string },
  ) {
    return this.notificationService.acknowledge(shareToken, body.name || 'Anonymous');
  }

  @Get('public/:shareToken')
  @ApiOperation({ summary: 'Public endpoint — get session info by share token (no auth)' })
  async getPublicSession(@Param('shareToken') shareToken: string) {
    return this.notificationService.getPublicSession(shareToken);
  }
}