import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { VoiceCommandsService } from './voice-commands.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateVoiceLogDto } from './dto/create-voice-log.dto';

@ApiTags('Voice Commands')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('voice-commands')
export class VoiceCommandsController {
  constructor(private voiceCommandsService: VoiceCommandsService) {}

  @Post('log')
  @ApiOperation({ summary: 'Log a recognized voice command and its outcome' })
  async logCommand(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateVoiceLogDto,
  ) {
    return this.voiceCommandsService.logCommand(user.id, dto);
  }

  @Get('history')
  @ApiOperation({ summary: "Get paginated history of the user's voice command logs for debugging" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getHistory(
    @CurrentUser() user: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    return this.voiceCommandsService.getHistory(user.id, pageNum, limitNum);
  }
}
