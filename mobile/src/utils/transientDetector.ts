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
 * Asymmetric Exponential Moving Average (EMA) update function.
 * Uses slow upward adaptation (0.002) so continuous 30+ second crash sounds don't artificially
 * inflate the background noise floor baseline, and fast downward adaptation (0.05) so quiet periods recover quickly.
 */
export function updateRollingAverage(currentAvg: number, newRms: number, alpha = 0.01): number {
  if (currentAvg === 0) return newRms;
  const effectiveAlpha = newRms > currentAvg ? 0.002 : 0.05;
  return effectiveAlpha * newRms + (1 - effectiveAlpha) * currentAvg;
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
  preSeconds = 0.975,
  postSeconds = 0.000
): Float32Array | null {
  const preSamples = Math.round(preSeconds * sampleRate);
  const postSamples = Math.round(postSeconds * sampleRate);
  const targetTotalSamples = preSamples + postSamples;

  // Startup edge-case protection: discard if less than preSamples of history exists
  if (totalSamplesWritten < preSamples) {
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

export interface AudioSourceClassification {
  /** True if audio displays signatures of compressed speaker playback (e.g. YouTube video test) */
  isCompressedPlayback: boolean;
  /** True if audio displays raw acoustic plosive / blowing air / breath on microphone */
  isDirectMicArtifact: boolean;
  zcr: number;
  highFreqRatio: number;
  dcRatio: number;
  crestFactor: number;
}

/**
 * Acoustically distinguishes between:
 * 1) Compressed loudspeaker / YouTube video crash audio:
 *    - Balanced frequency spread (ZCR >= 0.07, highFreqRatio >= 0.20)
 *    - Negligible DC bias (dcRatio < 0.035)
 * 
 * 2) Uncompressed direct microphone air blow / wind turbulence:
 *    - Low zero crossing rate (turbulent sub-audible flutter, ZCR < 0.08)
 *    - Heavy low-frequency dominance (highFreqRatio < 0.25)
 *    - Noticeable DC offset or membrane bias (dcRatio >= 0.04)
 */
export function classifyAudioSource(samples: Float32Array): AudioSourceClassification {
  if (!samples || samples.length < 2) {
    return {
      isCompressedPlayback: false,
      isDirectMicArtifact: false,
      zcr: 0,
      highFreqRatio: 0,
      dcRatio: 0,
      crestFactor: 0,
    };
  }

  let zeroCrossings = 0;
  let sum = 0;
  let sumSquares = 0;
  let diffSumSquares = 0;
  let maxAmp = 0;

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const absS = Math.abs(s);
    if (absS > maxAmp) maxAmp = absS;
    sum += s;
    sumSquares += s * s;
    if (i > 0) {
      const prev = samples[i - 1];
      if ((s >= 0 && prev < 0) || (s < 0 && prev >= 0)) {
        zeroCrossings++;
      }
      const diff = s - prev;
      diffSumSquares += diff * diff;
    }
  }

  const N = samples.length;
  const zcr = zeroCrossings / (N - 1);
  const mean = sum / N;
  const rms = Math.sqrt(sumSquares / N);
  const highFreqRms = Math.sqrt(diffSumSquares / (N - 1));
  const highFreqRatio = rms > 1e-5 ? highFreqRms / rms : 0;
  const dcRatio = rms > 1e-5 ? Math.abs(mean) / rms : 0;
  const crestFactor = rms > 1e-5 ? maxAmp / rms : 0;

  // Direct mic air blow / breath artifact detection:
  // Blowing air creates slow, turbulent low-frequency membrane displacement:
  // Must have low ZCR (< 0.08) AND low high-frequency content (< 0.25) AND physical membrane DC displacement (>= 0.05)
  const isDirectMicArtifact =
    (zcr < 0.08 && highFreqRatio < 0.25 && dcRatio >= 0.05) ||
    (zcr < 0.05 && highFreqRatio < 0.18) ||
    (dcRatio >= 0.10 && zcr < 0.10);

  // Compressed loudspeaker playback (e.g. YouTube video test):
  // Broadcast audio played through phone/laptop speakers has audible zero-crossings and rich frequency spread
  const isCompressedPlayback =
    !isDirectMicArtifact &&
    (zcr >= 0.07 || highFreqRatio >= 0.20);

  return {
    isCompressedPlayback,
    isDirectMicArtifact,
    zcr,
    highFreqRatio,
    dcRatio,
    crestFactor,
  };
}
