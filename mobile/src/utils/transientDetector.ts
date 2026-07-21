import {
  TRANSIENT_MULTIPLIER,
  TRANSIENT_MIN_RMS,
  PRE_TRANSIENT_SECONDS,
  POST_TRANSIENT_SECONDS,
} from '../config/transientConfig';

/**
 * Computes the Root Mean Square (RMS) energy of a Float32Array audio sample chunk.
 * Output range is [0.0, 1.0].
 */
export function computeRms(samples: Float32Array): number {
  if (!samples || samples.length === 0) return 0;

  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i];
  }

  return Math.sqrt(sumSquares / samples.length);
}

/**
 * Pure evaluation function to check if an audio chunk's instantaneous RMS energy
 * constitutes a sudden high-energy acoustic transient.
 * 
 * @param currentRms - Instantaneous RMS energy of the current audio chunk
 * @param rollingAvgRms - Rolling average RMS energy over past ~5 seconds
 * @param multiplier - Sensitivity ratio (default 3.5x)
 * @param minRms - Minimum absolute noise floor (default 0.02)
 */
export function isTransientDetected(
  currentRms: number,
  rollingAvgRms: number,
  multiplier = TRANSIENT_MULTIPLIER,
  minRms = TRANSIENT_MIN_RMS
): boolean {
  if (currentRms < minRms) return false;
  const effectiveAverage = Math.max(rollingAvgRms, 0.001);
  return currentRms >= effectiveAverage * multiplier;
}

/**
 * Exponential Moving Average (EMA) update function for smooth rolling RMS calculation.
 */
export function updateRollingAverage(currentAvg: number, newRms: number, alpha = 0.05): number {
  if (currentAvg === 0) return newRms;
  return alpha * newRms + (1 - alpha) * currentAvg;
}

/**
 * Extracts a 2-second audio window centered around a transient peak moment
 * (0.75s pre-peak + 1.25s post-peak = 2.0s = 32,000 samples at 16kHz)
 * from a circular sample buffer.
 * 
 * Handles circular buffer wrapping and protects against app startup edge cases
 * where insufficient audio history exists before the peak.
 */
export function extractCenteredWindow(
  circularBuffer: Float32Array,
  writeHead: number,
  totalSamplesWritten: number,
  sampleRate = 16000,
  preSeconds = PRE_TRANSIENT_SECONDS,
  postSeconds = POST_TRANSIENT_SECONDS
): Float32Array | null {
  const preSamples = Math.round(preSeconds * sampleRate);
  const postSamples = Math.round(postSeconds * sampleRate);
  const targetTotalSamples = preSamples + postSamples;

  // Startup edge-case protection: discard if less than preSeconds of history exists
  if (totalSamplesWritten < preSamples + 1600) {
    return null;
  }

  const outputWindow = new Float32Array(targetTotalSamples);
  const bufferLen = circularBuffer.length;

  // Calculate starting index in circular buffer (preSamples backward from current writeHead)
  let startIdx = (writeHead - preSamples) % bufferLen;
  if (startIdx < 0) {
    startIdx += bufferLen;
  }

  for (let i = 0; i < targetTotalSamples; i++) {
    const readIdx = (startIdx + i) % bufferLen;
    outputWindow[i] = circularBuffer[readIdx];
  }

  return outputWindow;
}
