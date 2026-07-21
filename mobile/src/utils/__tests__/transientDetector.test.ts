import {
  computeRms,
  isTransientDetected,
  updateRollingAverage,
  extractCenteredWindow,
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
    it('should return true for a high-energy spike exceeding 3.5x rolling average and min noise floor', () => {
      const currentRms = 0.35;
      const rollingAvgRms = 0.05;
      // 0.35 >= 0.05 * 3.5 = 0.175, and 0.35 >= 0.02
      expect(isTransientDetected(currentRms, rollingAvgRms)).toBe(true);
    });

    it('should return false if RMS is below min noise floor even if ratio is high', () => {
      const currentRms = 0.01; // Below 0.02 min floor
      const rollingAvgRms = 0.001; // 10x ratio
      expect(isTransientDetected(currentRms, rollingAvgRms)).toBe(false);
    });

    it('should return false if spike ratio is below multiplier threshold', () => {
      const currentRms = 0.10;
      const rollingAvgRms = 0.05; // Only 2x ratio, less than 3.5x
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
});
