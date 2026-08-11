// ════════════════════════════════════════════════════════════════════════════════
// ResQDrive — Multi-Modal Acoustic & Motion Coincidence Fusion Service
// ════════════════════════════════════════════════════════════════════════════════
//
// SAFETY RATIONALE & COINCIDENCE DISCIPLINE:
// Neither acoustic crash detection (YAMNet AI model) nor motion sensor thresholding
// (Accelerometer + Gyroscope) alone is sufficient to confirm a vehicular collision.
// - Acoustic signatures alone can be falsely triggered by loud ambient sounds (e.g. popping balloons, doors slamming, explosions).
// - Motion signatures alone can be falsely triggered by phone drops or sudden braking.
//
// COINCIDENCE WINDOW RULE:
// An automatic emergency crash trigger requires BOTH an acoustic crash signature AND a motion sensor
// impact ('moderate' or 'severe') occurring within a 10-second temporal sliding window (|t_sound - t_motion| <= 10,000ms).
// ════════════════════════════════════════════════════════════════════════════════

import { MotionSeverity } from '../config/motionSeverityConfig';

export interface SoundEvent {
  confidence: number;
  topClass: string;
  timestamp: number;
}

export interface MotionEvent {
  severity: MotionSeverity;
  accelG: number;
  gyroDegPerSec: number;
  timestamp: number;
}

export interface ConfirmedAccidentTrigger {
  soundEvent: SoundEvent;
  motionEvent: MotionEvent;
  combinedSeverity: 'Severe' | 'Moderate';
  timestamp: number;
}

export class MultiModalFusionService {
  private static readonly COINCIDENCE_WINDOW_MS = 10000; // 10-second sliding window
  private static readonly COOLDOWN_PERIOD_MS = 3 * 60 * 1000; // 3-minute lockout after trigger

  private static lastSoundEvent: SoundEvent | null = null;
  private static lastMotionEvent: MotionEvent | null = null;
  private static lastConfirmedTriggerTime = 0;

  private static onConfirmedAccidentCallback: ((trigger: ConfirmedAccidentTrigger) => void) | null = null;

  /**
   * Subscribes to confirmed multi-modal accident triggers.
   */
  static subscribeToConfirmedAccidents(callback: (trigger: ConfirmedAccidentTrigger) => void) {
    this.onConfirmedAccidentCallback = callback;
  }

  /**
   * Called when YAMNet acoustic classifier detects a high-confidence crash sound.
   */
  static recordSoundEvent(confidence: number, topClass: string): void {
    const now = Date.now();
    if (now - this.lastConfirmedTriggerTime < this.COOLDOWN_PERIOD_MS) {
      console.log('⏸️ [MultiModalFusion] Acoustic crash event ignored due to 3-minute post-trigger cooldown lockout.');
      return;
    }

    this.lastSoundEvent = { confidence, topClass, timestamp: now };
    console.log(`🔊 [MultiModalFusion] Recorded Acoustic Signature: "${topClass}" (${(confidence * 100).toFixed(1)}%). Checking for motion coincidence...`);

    this.evaluateCoincidence();
  }

  /**
   * Called when motion sensor fusion detects a 'moderate' or 'severe' impact.
   */
  static recordMotionEvent(severity: MotionSeverity, accelG: number, gyroDegPerSec: number): void {
    if (severity === 'none' || severity === 'minor') return; // Ignore minor bumps

    const now = Date.now();
    if (now - this.lastConfirmedTriggerTime < this.COOLDOWN_PERIOD_MS) {
      console.log('⏸️ [MultiModalFusion] Motion crash event ignored due to 3-minute post-trigger cooldown lockout.');
      return;
    }

    this.lastMotionEvent = { severity, accelG, gyroDegPerSec, timestamp: now };
    console.log(`🚗 [MultiModalFusion] Recorded Motion Signature: ${severity.toUpperCase()} (${accelG.toFixed(2)}g / ${gyroDegPerSec.toFixed(1)}°/s). Checking for acoustic coincidence...`);

    this.evaluateCoincidence();
  }

  /**
   * Checks if both Sound and Motion signals occurred within the 10-second coincidence window.
   */
  private static evaluateCoincidence(): void {
    const now = Date.now();

    if (!this.lastSoundEvent || !this.lastMotionEvent) {
      if (this.lastSoundEvent && now - this.lastSoundEvent.timestamp > this.COINCIDENCE_WINDOW_MS) {
        console.log('⏱️ [MultiModalFusion] Acoustic window expired without motion sensor coincidence. Sound alone ignored.');
        this.lastSoundEvent = null;
      }
      if (this.lastMotionEvent && now - this.lastMotionEvent.timestamp > this.COINCIDENCE_WINDOW_MS) {
        console.log('⏱️ [MultiModalFusion] Motion window expired without acoustic crash coincidence. Motion alone ignored.');
        this.lastMotionEvent = null;
      }
      return;
    }

    // Calculate time delta between acoustic and motion events
    const timeDeltaMs = Math.abs(this.lastSoundEvent.timestamp - this.lastMotionEvent.timestamp);

    if (timeDeltaMs <= this.COINCIDENCE_WINDOW_MS) {
      console.log(`🚨 [MultiModalFusion] COINCIDENCE CONFIRMED! Acoustic & Motion co-occurred within ${(timeDeltaMs / 1000).toFixed(2)}s window.`);

      // Determine combined severity
      const combinedSeverity: 'Severe' | 'Moderate' =
        this.lastMotionEvent.severity === 'severe' || this.lastSoundEvent.confidence >= 0.75
          ? 'Severe'
          : 'Moderate';

      const trigger: ConfirmedAccidentTrigger = {
        soundEvent: this.lastSoundEvent,
        motionEvent: this.lastMotionEvent,
        combinedSeverity,
        timestamp: now,
      };

      // Set cooldown and reset signals
      this.lastConfirmedTriggerTime = now;
      this.lastSoundEvent = null;
      this.lastMotionEvent = null;

      if (this.onConfirmedAccidentCallback) {
        this.onConfirmedAccidentCallback(trigger);
      }
    } else {
      // Clean up stale event
      if (this.lastSoundEvent.timestamp < this.lastMotionEvent.timestamp) {
        this.lastSoundEvent = null;
      } else {
        this.lastMotionEvent = null;
      }
    }
  }

  /**
   * Resets internal timestamps and state.
   */
  static reset(): void {
    this.lastSoundEvent = null;
    this.lastMotionEvent = null;
    this.lastConfirmedTriggerTime = 0;
  }
}
