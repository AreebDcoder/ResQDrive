import {
  computeRms,
  isTransientDetected,
  updateRollingAverage,
  extractCenteredWindow,
  classifyAudioSource,
} from '../transientDetector';

describe('Transient Detector Utility Tests', () => {
  describe('computeRms', () => {
    it('should return 0 for empty or zero-filled arrays', () => {
      expect(computeRms(new Float32Array(0))).toBe(0);
      expect(computeRms(new Float32Array([0, 0, 0, 0]))).toBe(0);
    });

    it('should correctly calculate RMS for constant values', () => {
      const samples = new Float32Array([0.5, 0.5, 0.5, 0.5]);
      expect(computeRms(samples)).toBeCloseTo(0.5);
    });

    it('should correctly calculate RMS for alternating values', () => {
      const samples = new Float32Array([1.0, -1.0, 1.0, -1.0]);
      expect(computeRms(samples)).toBeCloseTo(1.0);
    });
  });

  describe('isTransientDetected', () => {
    it('should return true for an acoustic spike exceeding 2.5x rolling average and min noise floor', () => {
      const currentRms = 0.05;
      const rollingAvgRms = 0.015;
      // 0.05 >= 0.015 * 2.5 = 0.0375, and 0.05 >= 0.015
      expect(isTransientDetected(currentRms, rollingAvgRms)).toBe(true);
    });

    it('should return false if RMS is below min noise floor even if ratio is high', () => {
      const currentRms = 0.005; // Below 0.015 min floor
      const rollingAvgRms = 0.0005; // 10x ratio
      expect(isTransientDetected(currentRms, rollingAvgRms)).toBe(false);
    });

    it('should return false if spike ratio is below multiplier threshold', () => {
      const currentRms = 0.03;
      const rollingAvgRms = 0.02; // Only 1.5x ratio, less than 2.5x
      expect(isTransientDetected(currentRms, rollingAvgRms)).toBe(false);
    });
  });

  describe('updateRollingAverage', () => {
    it('should update rolling average smoothly using EMA', () => {
      const initialAvg = 0.05;
      const newRms = 0.10;
      const updated = updateRollingAverage(initialAvg, newRms, 0.1);
      expect(updated).toBeCloseTo(0.055);
    });

    it('should initialize with new RMS if current average is zero', () => {
      expect(updateRollingAverage(0, 0.08)).toBe(0.08);
    });
  });

  describe('extractCenteredWindow', () => {
    it('should return null during startup if insufficient history exists (< 0.75s)', () => {
      const circularBuffer = new Float32Array(48000); // 3 seconds at 16kHz
      const writeHead = 5000;
      const totalWritten = 5000; // Only ~0.31 seconds of audio written
      
      const result = extractCenteredWindow(circularBuffer, writeHead, totalWritten);
      expect(result).toBeNull();
    });

    it('should extract exact 32,000 samples (2 seconds) centered on transient peak when history is sufficient', () => {
      const sampleRate = 16000;
      const bufferLen = sampleRate * 3; // 48,000 samples
      const circularBuffer = new Float32Array(bufferLen);

      // Populate buffer with identifiable linear indices
      for (let i = 0; i < bufferLen; i++) {
        circularBuffer[i] = i;
      }

      const totalWritten = 20000;
      const writeHead = 20000;

      const window = extractCenteredWindow(circularBuffer, writeHead, totalWritten, sampleRate, 0.75, 1.25);
      expect(window).not.toBeNull();
      expect(window!.length).toBe(32000); // 0.75s + 1.25s = 2.0s = 32,000 samples

      // First sample should be writeHead - 0.75*16000 = 20000 - 12000 = 8000
      expect(window![0]).toBe(8000);
    });

    it('should correctly handle circular buffer wraparound when extracting centered window', () => {
      const sampleRate = 16000;
      const bufferLen = 48000; // 3 seconds
      const circularBuffer = new Float32Array(bufferLen);

      for (let i = 0; i < bufferLen; i++) {
        circularBuffer[i] = i;
      }

      // Write head wrapped to index 500
      const writeHead = 500;
      const totalWritten = 100000;

      const window = extractCenteredWindow(circularBuffer, writeHead, totalWritten, sampleRate, 0.75, 1.25);
      expect(window).not.toBeNull();
      expect(window!.length).toBe(32000);
      
      // Start index = (500 - 12000 + 48000) % 48000 = 36500
      expect(window![0]).toBe(36500);
    });
  });

  describe('classifyAudioSource', () => {
    it('should classify slow turbulent wind / blowing air as direct mic artifact and NOT compressed playback', () => {
      // Simulate low-frequency blowing air / breath rumble (20-40 Hz slow sinusoidal with DC bias)
      const N = 16000;
      const samples = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        // Slow 30Hz wave + DC offset 0.15 (direct air pressure pushing diaphragm)
        samples[i] = 0.15 + 0.4 * Math.sin((2 * Math.PI * 30 * i) / 16000);
      }

      const result = classifyAudioSource(samples);
      expect(result.isDirectMicArtifact).toBe(true);
      expect(result.isCompressedPlayback).toBe(false);
      expect(result.zcr).toBeLessThan(0.08);
    });

    it('should classify crash sound with high frequency texture (YouTube playback) as compressed playback', () => {
      // Simulate metallic impact / crash sound (high frequency components 1000Hz - 4000Hz, zero DC offset)
      const N = 16000;
      const samples = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        samples[i] =
          0.3 * Math.sin((2 * Math.PI * 1200 * i) / 16000) +
          0.2 * Math.sin((2 * Math.PI * 2800 * i) / 16000) +
          0.1 * (Math.random() - 0.5);
      }

      const result = classifyAudioSource(samples);
      expect(result.isDirectMicArtifact).toBe(false);
      expect(result.isCompressedPlayback).toBe(true);
      expect(result.zcr).toBeGreaterThan(0.07);
    });

    it('should identify direct mouth air puffs with DC shift as direct mic artifact', () => {
      const N = 16000;
      const samples = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        // Direct mouth puff creating slow air pressure wave with 0.12 DC shift
        samples[i] = 0.12 + 0.05 * Math.sin((2 * Math.PI * 25 * i) / 16000);
      }

      const result = classifyAudioSource(samples);
      expect(result.isDirectMicArtifact).toBe(true);
      expect(result.isCompressedPlayback).toBe(false);
      expect(result.dcRatio).toBeGreaterThan(0.06);
    });
  });
});
