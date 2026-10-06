// ════════════════════════════════════════════════════════════════════════════════
// ResQDrive — Mobile ML Inference Client Service
// ════════════════════════════════════════════════════════════════════════════════

import api from '../api/axios';
import {
  VZCrashAccidentFeatures,
  VZCrashSeverityFeatures,
  validateFeatureRecord,
} from './impactFeatureExtractor';

export type AccidentPrediction = 'crash' | 'near_miss' | 'normal_driving';
export type SeverityPrediction = 'Minor' | 'Moderate' | 'Severe';

export interface AccidentDetectionResponse {
  prediction: AccidentPrediction;
  label_id: number;
  probabilities: Record<AccidentPrediction, number>;
}

export interface SeverityAssessmentResponse {
  severity: SeverityPrediction;
  probabilities: Record<SeverityPrediction, number>;
  features: Record<string, any>;
}

export interface MlHealthResponse {
  status: string;
  accident_model_loaded: boolean;
  severity_model_loaded: boolean;
  accident_features: string[];
  severity_features: string[];
}

export class MlInferenceService {
  /**
   * Model 1 — VZCrash Accident Detection
   * Evaluates the 17 IMU and speed features.
   */
  static async detectAccident(features: VZCrashAccidentFeatures): Promise<AccidentDetectionResponse | null> {
    if (!validateFeatureRecord(features)) {
      console.error('[AccidentDetection] Validation failed: invalid feature vector. Aborting inference.');
      return null;
    }

    try {
      console.log(`[AccidentDetection] Sending 17 features: a_peak=${features.accel_peak}g, delta_v=${features.speed_drop}km/h, jerk_peak=${features.jerk_peak}g/s`);
      const response = await api.post('/ml/accident-detection', features, { timeout: 10000 });
      const data: AccidentDetectionResponse = response.data;
      console.log(`[AccidentDetection] Prediction: ${data.prediction.toUpperCase()} (label_id: ${data.label_id}) | Probabilities:`, data.probabilities);
      return data;
    } catch (err: any) {
      console.error('[AccidentDetection] Inference request failed:', err?.response?.data || err.message);
      return null;
    }
  }

  /**
   * Model 2 — Severity Assessment
   * Evaluates the 19 features (17 kinematic features + impact_duration_ms + audio_detected).
   */
  static async assessSeverity(features: VZCrashSeverityFeatures): Promise<SeverityAssessmentResponse | null> {
    if (!validateFeatureRecord(features)) {
      console.error('[SeverityDemo] Validation failed: invalid feature vector. Aborting inference.');
      return null;
    }

    try {
      console.log(`[SeverityDemo] Sending 19 features: a_peak=${features.accel_peak}g, delta_v=${features.speed_drop}km/h, duration=${features.impact_duration_ms}ms, audio=${Boolean(features.audio_detected)}`);
      const response = await api.post('/ml/severity', features, { timeout: 10000 });
      const data: SeverityAssessmentResponse = response.data;
      console.log(`[SeverityDemo] Prediction: ${data.severity.toUpperCase()} | Probabilities:`, data.probabilities);
      return data;
    } catch (err: any) {
      console.error('[SeverityDemo] Severity inference request failed:', err?.response?.data || err.message);
      return null;
    }
  }

  /**
   * Checks ML microservice health and model loading status.
   */
  static async checkHealth(): Promise<MlHealthResponse | null> {
    try {
      const response = await api.get('/ml/health', { timeout: 5000 });
      return response.data;
    } catch (err: any) {
      console.warn('[ML] Health check failed:', err?.message);
      return null;
    }
  }
}
