import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CrashSoundDetectionService } from './crash-sound-detection.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateDetectionLogDto } from './dto/create-detection-log.dto';

@ApiTags('Crash Sound Detection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crash-sound-detection')
export class CrashSoundDetectionController {
  constructor(private crashSoundService: CrashSoundDetectionService) {}

  @Post('log')
  @ApiOperation({ summary: 'Log a rolling 2-second audio window analysis result' })
  async logWindow(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateDetectionLogDto,
  ) {
    return this.crashSoundService.logWindow(user.id, dto);
  }

  @Get('history')
  @ApiOperation({ summary: "Get paginated history of the user's sound detection logs for tuning" })
  @ApiQuery({ name: 'flaggedAsCrash', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getHistory(
    @CurrentUser() user: { id: string },
    @Query('flaggedAsCrash') flaggedAsCrash?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const flaggedAsCrashBool =
      flaggedAsCrash !== undefined ? flaggedAsCrash === 'true' : undefined;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    return this.crashSoundService.getHistory(user.id, flaggedAsCrashBool, pageNum, limitNum);
  }
}
