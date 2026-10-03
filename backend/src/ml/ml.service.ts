import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AccidentDetectionDto } from './dto/accident-detection.dto';
import { SeverityDto } from './dto/severity.dto';

@Injectable()
export class MlService {
  private readonly logger = new Logger(MlService.name);
  private readonly fastApiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.fastApiUrl = this.configService.get<string>('FASTAPI_API_URL') || 'http://127.0.0.1:8000';
  }

  async getHealth() {
    try {
      const response = await axios.get(`${this.fastApiUrl}/ml/health`, { timeout: 5000 });
      return response.data;
    } catch (err: any) {
      this.logger.warn(`FastAPI ML health check failed: ${err.message}`);
      return {
        status: 'unavailable',
        error: err.message,
      };
    }
  }

  async detectAccident(dto: AccidentDetectionDto) {
    try {
      this.logger.log(`[ML] Forwarding accident detection request to FastAPI: a_peak=${dto.accel_peak}g, delta_v=${dto.speed_drop}km/h`);
      const response = await axios.post(`${this.fastApiUrl}/ml/accident-detection`, dto, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      return response.data;
    } catch (err: any) {
      if (err.response && err.response.status === 400) {
        throw new BadRequestException(err.response.data?.detail || 'Invalid feature vector passed to accident model.');
      }
      this.logger.error(`Failed to connect to FastAPI ML service at ${this.fastApiUrl}/ml/accident-detection: ${err.message}`);
      throw new ServiceUnavailableException('Accident detection inference service is temporarily unavailable.');
    }
  }

  async assessSeverity(dto: SeverityDto) {
    try {
      this.logger.log(`[ML] Forwarding severity assessment request to FastAPI: a_peak=${dto.accel_peak}g, duration=${dto.impact_duration_ms}ms, audio=${dto.audio_detected}`);
      const response = await axios.post(`${this.fastApiUrl}/ml/severity`, dto, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      return response.data;
    } catch (err: any) {
      if (err.response && err.response.status === 400) {
        throw new BadRequestException(err.response.data?.detail || 'Invalid feature vector passed to severity model.');
      }
      this.logger.error(`Failed to connect to FastAPI ML service at ${this.fastApiUrl}/ml/severity: ${err.message}`);
      throw new ServiceUnavailableException('Severity assessment inference service is temporarily unavailable.');
    }
  }
}
