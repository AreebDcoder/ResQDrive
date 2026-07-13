import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  ParseIntPipe,
  HttpException,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DamageAssessmentService } from './damage-assessment.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

@ApiTags('Damage Assessment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('damage-assessment')
export class DamageAssessmentController {
  constructor(private readonly damageAssessmentService: DamageAssessmentService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload damage photo, run TFLite inference, and log record' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        vehicleId: {
          type: 'string',
        },
        incidentId: {
          type: 'string',
        },
      },
    },
  })
  async create(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateAssessmentDto,
  ) {
    if (!file) {
      throw new HttpException('A valid image file upload is required.', HttpStatus.BAD_REQUEST);
    }
    return this.damageAssessmentService.createAssessment(user.id, file, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get paginated history of past damage assessments for user' })
  async getHistory(
    @CurrentUser() user: { id: string },
    @Query('page', new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) page = 1,
    @Query('limit', new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) limit = 10,
  ) {
    return this.damageAssessmentService.getHistory(user.id, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed log of a specific damage assessment' })
  async getDetail(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.damageAssessmentService.getAssessmentDetail(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a damage assessment log entry' })
  async delete(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.damageAssessmentService.deleteAssessment(user.id, id);
  }
}
