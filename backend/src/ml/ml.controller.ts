import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { MlService } from './ml.service';
import { AccidentDetectionDto } from './dto/accident-detection.dto';
import { SeverityDto } from './dto/severity.dto';

@ApiTags('Machine Learning Inference')
@Controller('ml')
export class MlController {
  constructor(private readonly mlService: MlService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check health and loading status of ML Random Forest models' })
  async getHealth() {
    return this.mlService.getHealth();
  }

  @Post('accident-detection')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Model 1 — VZCrash Accident Detection RF (17 features)' })
  @ApiResponse({ status: 200, description: 'Prediction result: crash | near_miss | normal_driving with probabilities' })
  async detectAccident(@Body() dto: AccidentDetectionDto) {
    return this.mlService.detectAccident(dto);
  }

  @Post('severity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Model 2 — Crash Severity Assessment RF (19 features)' })
  @ApiResponse({ status: 200, description: 'Severity prediction: Minor | Moderate | Severe with probabilities' })
  async assessSeverity(@Body() dto: SeverityDto) {
    return this.mlService.assessSeverity(dto);
  }
}
