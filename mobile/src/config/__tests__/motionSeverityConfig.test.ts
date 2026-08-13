import {
  classifyMotionSeverity,
  MOTION_SEVERITY_THRESHOLDS,
} from '../motionSeverityConfig';

describe('Motion Sensor Tiered Severity Classification (classifyMotionSeverity)', () => {
  it('should preserve severe tier anchor at 4.5g / 250°/s', () => {
    expect(MOTION_SEVERITY_THRESHOLDS.severe).toEqual({
      accelG: 4.5,
      gyroDegPerSec: 250,
    });
  });

  it('should classify exact severe boundary as severe', () => {
    expect(classifyMotionSeverity(4.5, 250)).toBe('severe');
  });

  it('should classify high values above severe as severe', () => {
    expect(classifyMotionSeverity(6.2, 310)).toBe('severe');
  });

  it('should classify exact moderate boundary as moderate', () => {
    expect(classifyMotionSeverity(3.5, 140)).toBe('moderate');
  });

  it('should classify values between moderate and severe as moderate', () => {
    expect(classifyMotionSeverity(4.0, 200)).toBe('moderate');
  });

  it('should classify exact minor boundary as minor', () => {
    expect(classifyMotionSeverity(2.5, 60)).toBe('minor');
  });

  it('should classify values between minor and moderate as minor', () => {
    expect(classifyMotionSeverity(3.0, 90)).toBe('minor');
  });

  it('should return none when values are below minor threshold (normal driving)', () => {
    expect(classifyMotionSeverity(1.2, 15)).toBe('none');
    expect(classifyMotionSeverity(2.4, 59)).toBe('none');
  });

  it('CONFLUENCE TEST: High accel alone with near-zero gyro (phone drop scenario) must return none', () => {
    // Phone dropped on car carpet: High g-force impact (5.0g), but zero angular rotation (5°/s)
    expect(classifyMotionSeverity(5.0, 5)).toBe('none');
    expect(classifyMotionSeverity(7.5, 30)).toBe('none');
  });

  it('CONFLUENCE TEST: High gyro alone with low accel (phone spinning scenario) must return none', () => {
    // Phone spinning on dashboard: High rotational velocity (300°/s), but normal gravity (1.1g)
    expect(classifyMotionSeverity(1.1, 300)).toBe('none');
    expect(classifyMotionSeverity(2.0, 400)).toBe('none');
  });

  it('CONFLUENCE TEST: Accel reaches severe but gyro only reaches moderate confluence', () => {
    // Accel is 5.0g (severe), but gyro is 150°/s (moderate) -> Should return 'moderate'
    expect(classifyMotionSeverity(5.0, 150)).toBe('moderate');
  });
});
