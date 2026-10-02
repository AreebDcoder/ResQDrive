// ════════════════════════════════════════════════════════════════════════════════
// ResQDrive — Machine Learning Configuration (Accident & Severity Models)
// ════════════════════════════════════════════════════════════════════════════════

export const ML_CONFIG = {
  /**
   * SEVERITY_DEMO_MODE:
   * true  => FYP DEMO MODE: Bypasses VZCrash accident detector as a prerequisite.
   *          Sensors + GPS + Audio directly feed Severity RF for demonstration.
   * false => PRODUCTION MODE: Full production pipeline:
   *          Sensors -> VZCrash Accident RF -> 20s Countdown -> Severity RF -> Emergency Response
   */
  SEVERITY_DEMO_MODE: true,

  /**
   * DEMO_DISPATCH_ENABLED:
   * true  => Allows real emergency SMS / calls to fire from demo mode.
   * false => SAFETY LOCK: Strictly prevents SMS, RoboCall, WhatsApp, and SOS calls
   *          during demo testing. Displays/logs predictions only.
   */
  DEMO_DISPATCH_ENABLED: false,

  /**
   * AUDIO_CONFIDENCE_THRESHOLD:
   * Rule: confidence >= 0.40 => audio_detected = true (1)
   *       confidence < 0.40  => audio_detected = false (0)
   */
  AUDIO_CONFIDENCE_THRESHOLD: 0.40,
};
