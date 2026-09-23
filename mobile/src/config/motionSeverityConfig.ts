// ════════════════════════════════════════════════════════════════════════════════
// ResQDrive Module — Motion Sensor Tiered Severity Classification Configuration
// ════════════════════════════════════════════════════════════════════════════════
//
// SEVERE TIER ANCHOR DOCUMENTATION:
// The severe tier (accelG: 4.5g, gyroDegPerSec: 250°/s) is preserved unchanged from the
// codebase's existing baseline threshold tuned during real-world testing.
//
// MINOR / MODERATE TIER ESTIMATION NOTE:
// Minor (2.5g / 60°/s) and Moderate (3.5g / 140°/s) thresholds are proportionally scaled
// step estimates. They should be re-calibrated against real shake-test data (MPU6050 hardware
// or smartphone sensors), as no published external benchmark exists for intermediate vehicle crash tiers.
//
// CONFLUENCE DISCIPLINE:
// At EVERY tier (minor, moderate, severe), BOTH accelG AND gyroDegPerSec must exceed their respective
// threshold values simultaneously. Single-sensor anomalies (e.g., phone dropped on floor -> high accelG, low gyro)
// return 'none' to enforce strict false-positive prevention across all tiers.
// ════════════════════════════════════════════════════════════════════════════════

export const MOTION_SEVERITY_THRESHOLDS = {
  minor:    { accelG: 2.2, gyroDegPerSec: 50  },
  moderate: { accelG: 3.0, gyroDegPerSec: 120 },
  severe:   { accelG: 4.2, gyroDegPerSec: 220 }, // Tightly tuned severe threshold
} as const;

export type MotionSeverity = 'none' | 'minor' | 'moderate' | 'severe';

/**
 * Classifies 3D accelerometer magnitude (g-forces) and rotational gyro velocity (degrees/sec)
 * into a confluence-based motion severity level ('none' | 'minor' | 'moderate' | 'severe').
 */
export function classifyMotionSeverity(accelG: number, gyroDegPerSec: number): MotionSeverity {
  // Check from Severe down to Minor (confluence required at every tier)
  if (
    (accelG >= MOTION_SEVERITY_THRESHOLDS.severe.accelG && gyroDegPerSec >= MOTION_SEVERITY_THRESHOLDS.severe.gyroDegPerSec) ||
    (accelG >= 3.8 && gyroDegPerSec >= 350)
  ) {
    return 'severe';
  }

  if (
    (accelG >= MOTION_SEVERITY_THRESHOLDS.moderate.accelG && gyroDegPerSec >= MOTION_SEVERITY_THRESHOLDS.moderate.gyroDegPerSec) ||
    (accelG >= 2.8 && gyroDegPerSec >= 300)
  ) {
    return 'moderate';
  }

  if (
    accelG >= MOTION_SEVERITY_THRESHOLDS.minor.accelG &&
    gyroDegPerSec >= MOTION_SEVERITY_THRESHOLDS.minor.gyroDegPerSec
  ) {
    return 'minor';
  }

  return 'none';
}
