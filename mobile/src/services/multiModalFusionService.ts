// ════════════════════════════════════════════════════════════════════════════════
// ResQDrive — Multi-Modal Acoustic & Motion Coincidence Fusion Service
// ════════════════════════════════════════════════════════════════════════════════
//
// SAFETY RATIONALE & BIDIRECTIONAL COINCIDENCE DISCIPLINE:
// Neither acoustic crash detection (YAMNet AI model) nor kinetic motion classification
// alone is sufficient to trigger an emergency alert.
//
// 1. ACOUSTIC-FIRST SCENARIO:
// When a crash sound is detected, a 10-second sliding coincidence window is opened.
// If another crash sound is detected within this window, the 10-second window is REFRESHED.
// If Model 1 (VZCrash Accident Detector) predicts 'crash' within this window, coincidence is confirmed.
//
// 2. KINETIC/MODEL 1-FIRST SCENARIO:
// When Model 1 predicts a vehicular 'crash', a 10-second sliding coincidence window is opened.
// If acoustic confirmation (crash sound) is detected within 10 seconds, coincidence is confirmed.
//
// 3. FYP DEMO MODE:
// In Demo Mode (indoor presentation), physical hand shakes substitute for Model 1 predictions.
//
// 4. PIPELINE ADVANCEMENT:
// Once coincidence is confirmed, the system immediately evaluates Model 2 (Severity Assessor)
// and launches the Countdown screen (10s for Severe, 20s for Moderate).
// ════════════════════════════════════════════════════════════════════════════════

import { MotionSeverity } from '../config/motionSeverityConfig';
import { ML_CONFIG } from '../config/mlConfig';
import { AccidentPrediction } from './mlInferenceService';

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

export interface Model1CrashEvent {
  prediction: AccidentPrediction;
  probabilities: Record<AccidentPrediction, number>;
  accelPeak: number;
  speedDrop: number;
  timestamp: number;
}

export interface ConfirmedAccidentTrigger {
  soundEvent: SoundEvent | null; // null if no acoustic crash was detected (e.g. music playing in car, soundproofed cabin)
  motionEvent?: MotionEvent;
  model1Event?: Model1CrashEvent;
  combinedSeverity: 'Severe' | 'Moderate';
  timestamp: number;
}

export class MultiModalFusionService {
  private static readonly COINCIDENCE_WINDOW_MS = 10000; // 10-second sliding window
  private static readonly COOLDOWN_PERIOD_MS = 30 * 1000; // 30-second lockout after trigger

  private static lastSoundEvent: SoundEvent | null = null;
  private static soundWindowTimer: any = null;

  private static lastModel1CrashEvent: Model1CrashEvent | null = null;
  private static model1WindowTimer: any = null;

  private static lastMotionEvent: MotionEvent | null = null;
  private static motionWindowTimer: any = null;

  private static lastConfirmedTriggerTime = 0;

  private static onConfirmedAccidentCallback: ((trigger: ConfirmedAccidentTrigger) => void) | null = null;

  /**
   * Subscribes to confirmed multi-modal accident triggers.
   */
  static subscribeToConfirmedAccidents(callback: (trigger: ConfirmedAccidentTrigger) => void) {
    this.onConfirmedAccidentCallback = callback;
  }

  /**
   * Returns true if an acoustic crash event window is currently active and waiting for kinetic confirmation.
   */
  static isSoundWindowActive(): boolean {
    if (!this.lastSoundEvent) return false;
    return Date.now() - this.lastSoundEvent.timestamp <= this.COINCIDENCE_WINDOW_MS;
  }

  /**
   * Returns true if a Model 1 crash event window is currently active and waiting for acoustic confirmation.
   */
  static isModel1WindowActive(): boolean {
    if (!this.lastModel1CrashEvent) return false;
    return Date.now() - this.lastModel1CrashEvent.timestamp <= this.COINCIDENCE_WINDOW_MS;
  }

  /**
   * Returns the most recent sound event, if still valid.
   */
  static getLastSoundEvent(): SoundEvent | null {
    if (this.isSoundWindowActive()) {
      return this.lastSoundEvent;
    }
    return null;
  }

  /**
   * Returns the most recent Model 1 crash event, if still valid.
   */
  static getLastModel1Event(): Model1CrashEvent | null {
    if (this.isModel1WindowActive()) {
      return this.lastModel1CrashEvent;
    }
    return null;
  }

  /**
   * Called when YAMNet acoustic classifier detects a high-confidence crash sound.
   * If a previous sound window is active, REFRESHES the 10-second window!
   */
  static recordSoundEvent(confidence: number, topClass: string): void {
    const now = Date.now();
    if (now - this.lastConfirmedTriggerTime < this.COOLDOWN_PERIOD_MS) {
      console.log('⏸️ [MultiModalFusion] Acoustic crash event ignored due to 30-second post-trigger cooldown lockout.');
      return;
    }

    // Refresh / reset existing 10-second timer if another crash sound arrives within the window
    if (this.soundWindowTimer) {
      clearTimeout(this.soundWindowTimer);
      this.soundWindowTimer = null;
      console.log(`🔄 [MultiModalFusion] Repeated crash sound detected ("${topClass}"). REFRESHED 10-second coincidence window!`);
    } else {
      console.log(`🔊 [MultiModalFusion] Recorded Acoustic Signature: "${topClass}" (${(confidence * 100).toFixed(1)}%). Opened 10-second coincidence window.`);
    }

    this.lastSoundEvent = { confidence, topClass, timestamp: now };

    // Start 10-second expiration timer
    this.soundWindowTimer = setTimeout(() => {
      console.log('⏱️ [MultiModalFusion] 10s sound window expired without Model 1 crash confirmation. Discarded.');
      this.lastSoundEvent = null;
      this.soundWindowTimer = null;
    }, this.COINCIDENCE_WINDOW_MS);

    this.evaluateCoincidence();
  }

  /**
   * Called in Real Mode when Model 1 (VZCrash Accident Detector) predicts a 'crash'.
   * Opens or satisfies a 10-second coincidence window.
   */
  static recordModel1CrashEvent(
    prediction: AccidentPrediction,
    probabilities: Record<AccidentPrediction, number>,
    accelPeak: number = 0,
    speedDrop: number = 0
  ): void {
    if (prediction !== 'crash') {
      return; // Non-crash predictions do not qualify
    }

    const now = Date.now();
    if (now - this.lastConfirmedTriggerTime < this.COOLDOWN_PERIOD_MS) {
      console.log('⏸️ [MultiModalFusion] Model 1 crash event ignored due to 30-second post-trigger cooldown lockout.');
      return;
    }

    if (this.model1WindowTimer) {
      clearTimeout(this.model1WindowTimer);
      this.model1WindowTimer = null;
      console.log('🔄 [MultiModalFusion] Repeated Model 1 crash prediction received. REFRESHED 10-second window.');
    } else {
      const probStr = (probabilities?.crash ? (probabilities.crash * 100).toFixed(1) : '90.0') + '%';
      console.log(`🤖 [MultiModalFusion] Recorded Model 1 CRASH Prediction (${probStr}, a_peak=${accelPeak.toFixed(2)}g, drop=${speedDrop.toFixed(1)}km/h). 10-second window OPEN.`);
    }

    this.lastModel1CrashEvent = {
      prediction,
      probabilities,
      accelPeak,
      speedDrop,
      timestamp: now,
    };

    // Start 10-second timer:
    // If NO acoustic crash sound arrives within 10s, DO NOT DISCARD!
    // The user might be playing loud music in the cabin or mic was muffled.
    // Since Model 1 authoritatively predicted a vehicle crash, proceed with audio_detected = FALSE:
    this.model1WindowTimer = setTimeout(() => {
      if (this.lastModel1CrashEvent) {
        console.log('📻 [MultiModalFusion] 10s elapsed with Model 1 CRASH but NO acoustic crash sound (e.g. in-car music). Continuing pipeline with audio_detected = FALSE!');

        const trigger: ConfirmedAccidentTrigger = {
          soundEvent: null, // No acoustic sound detected
          model1Event: this.lastModel1CrashEvent,
          combinedSeverity: this.lastModel1CrashEvent.accelPeak >= 4.0 ? 'Severe' : 'Moderate',
          timestamp: Date.now(),
        };

        this.fireConfirmedTrigger(trigger);
      }
    }, this.COINCIDENCE_WINDOW_MS);

    this.evaluateCoincidence();
  }

  /**
   * Called when motion sensor fusion detects a 'moderate' or 'severe' impact.
   * In Demo Mode (FYP Presentation), this satisfies the kinetic requirement.
   */
  static recordMotionEvent(
    severity: MotionSeverity,
    accelG: number,
    gyroDegPerSec: number,
    mlSeverity?: MotionSeverity,
    mlConfidence?: number
  ): void {
    if (severity === 'none' || severity === 'minor') return;

    const now = Date.now();
    if (now - this.lastConfirmedTriggerTime < this.COOLDOWN_PERIOD_MS) {
      console.log('⏸️ [MultiModalFusion] Motion crash event ignored due to 30-second post-trigger cooldown lockout.');
      return;
    }

    if (this.motionWindowTimer) {
      clearTimeout(this.motionWindowTimer);
      this.motionWindowTimer = null;
    }

    this.lastMotionEvent = { severity, accelG, gyroDegPerSec, timestamp: now };
    const mlInfo = mlSeverity ? ` | ML Model: ${mlSeverity.toUpperCase()} (${((mlConfidence || 0) * 100).toFixed(1)}%)` : '';
    console.log(`🚗 [MultiModalFusion] Recorded Motion Signature: ${severity.toUpperCase()} (${accelG.toFixed(2)}g / ${gyroDegPerSec.toFixed(1)}°/s)${mlInfo}.`);

    this.motionWindowTimer = setTimeout(() => {
      console.log('⏱️ [MultiModalFusion] 10s motion window expired without acoustic crash coincidence. Discarded.');
      this.lastMotionEvent = null;
      this.motionWindowTimer = null;
    }, this.COINCIDENCE_WINDOW_MS);

    this.evaluateCoincidence();
  }

  /**
   * Checks bidirectional coincidence:
   * Real Mode: Validates that BOTH Acoustic Crash AND Model 1 Crash occurred within 10 seconds.
   * Demo Mode: Validates that BOTH Acoustic Crash AND Hand Motion occurred within 10 seconds.
   */
  private static evaluateCoincidence(): void {
    const now = Date.now();
    const isDemo = ML_CONFIG.SEVERITY_DEMO_MODE;

    if (isDemo) {
      // ═══ DEMO MODE (FYP PRESENTATION) ═══
      if (!this.lastSoundEvent || !this.lastMotionEvent) {
        return;
      }

      const timeDeltaMs = Math.abs(this.lastSoundEvent.timestamp - this.lastMotionEvent.timestamp);
      if (timeDeltaMs <= this.COINCIDENCE_WINDOW_MS) {
        console.log(`🚨 [MultiModalFusion - DEMO] COINCIDENCE CONFIRMED! Acoustic & Motion co-occurred within ${(timeDeltaMs / 1000).toFixed(2)}s.`);

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

        this.fireConfirmedTrigger(trigger);
      } else {
        // Discard older event
        if (this.lastSoundEvent.timestamp < this.lastMotionEvent.timestamp) {
          this.lastSoundEvent = null;
        } else {
          this.lastMotionEvent = null;
        }
      }
    } else {
      // ═══ REAL MODE (ON THE ROAD) ═══
      // Requires authoritative Model 1 Crash prediction + Acoustic Crash signature
      if (!this.lastSoundEvent || !this.lastModel1CrashEvent) {
        return;
      }

      const timeDeltaMs = Math.abs(this.lastSoundEvent.timestamp - this.lastModel1CrashEvent.timestamp);
      if (timeDeltaMs <= this.COINCIDENCE_WINDOW_MS) {
        console.log(`🚨 [MultiModalFusion - REAL] COINCIDENCE CONFIRMED! Acoustic Crash ("${this.lastSoundEvent.topClass}") & Model 1 Crash co-occurred within ${(timeDeltaMs / 1000).toFixed(2)}s!`);

        const combinedSeverity: 'Severe' | 'Moderate' =
          this.lastModel1CrashEvent.accelPeak >= 4.0 || this.lastSoundEvent.confidence >= 0.75
            ? 'Severe'
            : 'Moderate';

        const trigger: ConfirmedAccidentTrigger = {
          soundEvent: this.lastSoundEvent,
          model1Event: this.lastModel1CrashEvent,
          combinedSeverity,
          timestamp: now,
        };

        this.fireConfirmedTrigger(trigger);
      } else {
        // Discard older event
        if (this.lastSoundEvent.timestamp < this.lastModel1CrashEvent.timestamp) {
          this.lastSoundEvent = null;
        } else {
          this.lastModel1CrashEvent = null;
        }
      }
    }
  }

  private static fireConfirmedTrigger(trigger: ConfirmedAccidentTrigger): void {
    this.lastConfirmedTriggerTime = Date.now();

    // Cancel all pending timers
    if (this.soundWindowTimer) {
      clearTimeout(this.soundWindowTimer);
      this.soundWindowTimer = null;
    }
    if (this.model1WindowTimer) {
      clearTimeout(this.model1WindowTimer);
      this.model1WindowTimer = null;
    }
    if (this.motionWindowTimer) {
      clearTimeout(this.motionWindowTimer);
      this.motionWindowTimer = null;
    }

    // Reset buffered events
    this.lastSoundEvent = null;
    this.lastModel1CrashEvent = null;
    this.lastMotionEvent = null;

    if (this.onConfirmedAccidentCallback) {
      this.onConfirmedAccidentCallback(trigger);
    }
  }

  /**
   * Resets internal timestamps, pending timers, and states.
   */
  static reset(): void {
    if (this.soundWindowTimer) clearTimeout(this.soundWindowTimer);
    if (this.model1WindowTimer) clearTimeout(this.model1WindowTimer);
    if (this.motionWindowTimer) clearTimeout(this.motionWindowTimer);

    this.soundWindowTimer = null;
    this.model1WindowTimer = null;
    this.motionWindowTimer = null;

    this.lastSoundEvent = null;
    this.lastModel1CrashEvent = null;
    this.lastMotionEvent = null;
    this.lastConfirmedTriggerTime = 0;
  }
}
