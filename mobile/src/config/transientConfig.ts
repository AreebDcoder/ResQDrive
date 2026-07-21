/**
 * Configurable constants for transient-triggered audio detection.
 * These values are tuned to detect sudden high-energy acoustic spikes (crashes, impacts, glass breaks)
 * while ignoring ambient noise and steady-state background music.
 */

// Instantaneous RMS must exceed 2.5x rolling average to flag a transient (prevents room hum false alerts)
export const TRANSIENT_MULTIPLIER = 2.5;

// Absolute minimum RMS floor to prevent false triggers in silence (prevents room noise floor triggers)
export const TRANSIENT_MIN_RMS = 0.015;

// Audio pre-buffer to extract BEFORE the transient peak (0.75 seconds)
export const PRE_TRANSIENT_SECONDS = 0.75;

// Audio post-buffer to extract AFTER the transient peak (1.25 seconds)
export const POST_TRANSIENT_SECONDS = 1.25;

// Total depth of the circular audio sample buffer (3.0 seconds)
export const CIRCULAR_BUFFER_SECONDS = 3.0;

// Window depth for calculating the rolling average RMS energy (5.0 seconds)
export const ROLLING_AVG_WINDOW_SECONDS = 5.0;

// Refractory / cooldown period in milliseconds to prevent multi-triggering on the same crash peak
export const REFRACTORY_PERIOD_MS = 2000;
