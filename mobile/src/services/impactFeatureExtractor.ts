// ════════════════════════════════════════════════════════════════════════════════
// ResQDrive — Impact Feature Extraction Service (VZCrash & Severity)
// ════════════════════════════════════════════════════════════════════════════════

import { ML_CONFIG } from '../config/mlConfig';

export interface RawSensorSample {
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  timestamp: number;
}

export interface VZCrashAccidentFeatures {
  accel_peak: number;
  accel_mean: number;
  accel_std: number;
  accel_rms: number;

  jerk_peak: number;
  jerk_mean: number;
  jerk_std: number;

  gyro_peak: number;
  gyro_mean: number;
  gyro_std: number;
  gyro_rms: number;

  speed_initial: number;
  speed_final: number;
  speed_max: number;
  speed_min: number;
  speed_drop: number;
  speed_range: number;
}

export interface VZCrashSeverityFeatures extends VZCrashAccidentFeatures {
  impact_duration_ms: number;
  audio_detected: number; // 1 or 0
}

/**
 * Calculates statistical metrics (peak, mean, std, rms) for an array of numbers.
 */
function calculateStats(values: number[]): { peak: number; mean: number; std: number; rms: number } {
  if (values.length === 0) {
    return { peak: 0, mean: 0, std: 0, rms: 0 };
  }

  const peak = Math.max(...values);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / values.length;

  const sqDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSqDiff = sqDiffs.reduce((acc, v) => acc + v, 0) / values.length;
  const std = Math.sqrt(avgSqDiff);

  const sqValues = values.map(v => v * v);
  const avgSqValue = sqValues.reduce((acc, v) => acc + v, 0) / values.length;
  const rms = Math.sqrt(avgSqValue);

  return {
    peak: Number(peak.toFixed(4)),
    mean: Number(mean.toFixed(4)),
    std: Number(std.toFixed(4)),
    rms: Number(rms.toFixed(4)),
  };
}

/**
 * Validates that all features in the dictionary are finite numbers.
 * Rejects NaN, Infinity, null, and undefined.
 */
export function validateFeatureRecord(record: Record<string, any>): boolean {
  for (const [key, val] of Object.entries(record)) {
    if (val === null || val === undefined) {
      console.warn(`[FeatureExtractor] Validation failed: '${key}' is ${val}`);
      return false;
    }
    if (typeof val === 'number') {
      if (isNaN(val) || !isFinite(val)) {
        console.warn(`[FeatureExtractor] Validation failed: '${key}' is ${val}`);
        return false;
      }
    }
  }
  return true;
}

/**
 * Extracts the 17 VZCrash accident features and 19 severity features from an event window.
 */
export function extractImpactFeatures(
  samples: RawSensorSample[],
  speeds: number[],
  durationMs: number,
  audioConfidence: number
): { accidentFeatures: VZCrashAccidentFeatures; severityFeatures: VZCrashSeverityFeatures } {
  if (!samples || samples.length === 0) {
    throw new Error('Insufficient sensor samples in window to extract features.');
  }

  // 1. Calculate Acceleration Magnitudes
  const accelMagnitudes: number[] = [];
  const gyroMagnitudes: number[] = [];
  const jerkValues: number[] = [];

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];

    // a = sqrt(ax^2 + ay^2 + az^2)
    const a = Math.sqrt(s.ax * s.ax + s.ay * s.ay + s.az * s.az);
    accelMagnitudes.push(a);

    // gyro = sqrt(gx^2 + gy^2 + gz^2) * (180 / pi)
    // Convert radians/sec to degrees/sec
    const rawGyroMag = Math.sqrt(s.gx * s.gx + s.gy * s.gy + s.gz * s.gz);
    const gyroDegPerSec = rawGyroMag * (180.0 / Math.PI);
    gyroMagnitudes.push(gyroDegPerSec);

    // Jerk calculation: |a_current - a_previous| / delta_t
    if (i === 0) {
      jerkValues.push(0.0); // Safe handling for first sample
    } else {
      const prevS = samples[i - 1];
      const prevA = accelMagnitudes[i - 1];
      const dtSeconds = Math.max(0.01, (s.timestamp - prevS.timestamp) / 1000.0);
      const j = Math.abs(a - prevA) / dtSeconds;
      jerkValues.push(isFinite(j) ? j : 0.0);
    }
  }

  // 2. Compute statistical aggregates
  const accelStats = calculateStats(accelMagnitudes);
  const jerkStats = calculateStats(jerkValues);
  const gyroStats = calculateStats(gyroMagnitudes);

  // 3. Compute GPS Speed metrics
  const validSpeeds = (speeds && speeds.length > 0)
    ? speeds.filter(sp => typeof sp === 'number' && !isNaN(sp) && isFinite(sp))
    : [0.0];

  const safeSpeeds = validSpeeds.length > 0 ? validSpeeds : [0.0];
  const speed_initial = Number(safeSpeeds[0].toFixed(2));
  const speed_final = Number(safeSpeeds[safeSpeeds.length - 1].toFixed(2));
  const speed_max = Number(Math.max(...safeSpeeds).toFixed(2));
  const speed_min = Number(Math.min(...safeSpeeds).toFixed(2));
  const speed_drop = Number(Math.max(0, speed_initial - speed_final).toFixed(2));
  const speed_range = Number(Math.max(0, speed_max - speed_min).toFixed(2));

  // 4. Build exact 17-feature vector for Model 1 (Accident Detection)
  const accidentFeatures: VZCrashAccidentFeatures = {
    accel_peak: accelStats.peak,
    accel_mean: accelStats.mean,
    accel_std: accelStats.std,
    accel_rms: accelStats.rms,

    jerk_peak: jerkStats.peak,
    jerk_mean: jerkStats.mean,
    jerk_std: jerkStats.std,

    gyro_peak: gyroStats.peak,
    gyro_mean: gyroStats.mean,
    gyro_std: gyroStats.std,
    gyro_rms: gyroStats.rms,

    speed_initial,
    speed_final,
    speed_max,
    speed_min,
    speed_drop,
    speed_range,
  };

  // 5. Compute Duration and Audio boolean for Model 2 (Severity)
  // Ensure duration is finite, non-negative, and sensible
  const safeDurationMs = Math.max(10.0, Math.min(5000.0, isFinite(durationMs) ? durationMs : 100.0));

  // Audio thresholding rule: >= 0.40 => 1 (true), < 0.40 => 0 (false)
  const safeAudioConf = isFinite(audioConfidence) ? audioConfidence : 0.0;
  const audio_detected = safeAudioConf >= ML_CONFIG.AUDIO_CONFIDENCE_THRESHOLD ? 1 : 0;

  // 6. Build exact 19-feature vector for Model 2 (Severity Assessment)
  const severityFeatures: VZCrashSeverityFeatures = {
    ...accidentFeatures,
    impact_duration_ms: Number(safeDurationMs.toFixed(1)),
    audio_detected,
  };

  return { accidentFeatures, severityFeatures };
}

export class ImpactFeatureExtractor {
  static extractImpactFeatures = extractImpactFeatures;

  static extractAccidentDetectionFeatures(
    windowOrSamples: RawSensorSample[] | { samples: RawSensorSample[]; speeds?: number[] },
    speeds: number[] = [0]
  ): VZCrashAccidentFeatures {
    if (Array.isArray(windowOrSamples)) {
      return extractImpactFeatures(windowOrSamples, speeds, 200, 0).accidentFeatures;
    }
    return extractImpactFeatures(windowOrSamples.samples, windowOrSamples.speeds || speeds, 200, 0).accidentFeatures;
  }

  static extractSeverityFeatures(
    windowOrSamples: RawSensorSample[] | { samples: RawSensorSample[]; speeds?: number[] },
    audioConfidence: number = 0.0,
    speeds: number[] = [0],
    durationMs: number = 200
  ): VZCrashSeverityFeatures {
    if (Array.isArray(windowOrSamples)) {
      return extractImpactFeatures(windowOrSamples, speeds, durationMs, audioConfidence).severityFeatures;
    }
    return extractImpactFeatures(windowOrSamples.samples, windowOrSamples.speeds || speeds, durationMs, audioConfidence).severityFeatures;
  }
}

