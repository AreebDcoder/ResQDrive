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
import { LocationSharingService } from './location-sharing.service';
import { LocationSharingGateway } from './location-sharing.gateway';
import { StartSessionDto } from './dto/start-session.dto';

@ApiTags('Location Sharing')
@Controller('location-sharing')
export class LocationSharingController {
  constructor(
    private locationService: LocationSharingService,
    private gateway: LocationSharingGateway,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new live location sharing session (auth required)' })
  async startSession(
    @CurrentUser() user: { id: string },
    @Body() dto: StartSessionDto,
  ) {
    return this.locationService.startSession(user.id, dto.incidentId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':sessionId/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop an active location sharing session (auth required)' })
  async stopSession(
    @CurrentUser() user: { id: string },
    @Param('sessionId') sessionId: string,
  ) {
    const result = await this.locationService.stopSession(user.id, sessionId);
    const shareToken = await this.locationService.getShareTokenBySessionId(sessionId);
    if (shareToken) {
      this.gateway.broadcastSessionEnded(shareToken);
    }
    return result;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('status')
  @ApiOperation({ summary: 'Check current user active session (auth required)' })
  async getStatus(@CurrentUser() user: { id: string }) {
    return this.locationService.getStatus(user.id);
  }

  @Get('public/:shareToken')
  @ApiOperation({ summary: 'Public endpoint — get session info by share token (no auth)' })
  async getPublicSession(@Param('shareToken') shareToken: string) {
    const session = await this.locationService.getSessionByShareToken(shareToken);
    return {
      sessionId: session.id,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      lastLat: session.lastLat,
      lastLng: session.lastLng,
      lastUpdateAt: session.lastUpdateAt,
      userName: session.user?.fullName,
    };
  }
}