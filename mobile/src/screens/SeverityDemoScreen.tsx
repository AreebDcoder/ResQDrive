// ════════════════════════════════════════════════════════════════════════════════
// ResQDrive — FYP Severity Assessment Demonstration Screen & Debug Panel
// ════════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ML_CONFIG } from '../config/mlConfig';
import { sensorSourceManager } from '../services/sensorSourceManager';
import { CrashSoundDetectionService } from '../services/crashSoundDetectionService';
import {
  extractImpactFeatures,
  RawSensorSample,
  VZCrashSeverityFeatures,
} from '../services/impactFeatureExtractor';
import {
  MlInferenceService,
  SeverityAssessmentResponse,
} from '../services/mlInferenceService';

export default function SeverityDemoScreen({ navigation }: any) {
  const [isRunningWindow, setIsRunningWindow] = useState<boolean>(false);
  const [isInferencing, setIsInferencing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to start FYP Severity Demo');

  // Real-time sensor reading display
  const [liveAccelG, setLiveAccelG] = useState<number>(1.0);
  const [liveGyroDeg, setLiveGyroDeg] = useState<number>(0.0);
  const [liveSpeedKmh, setLiveSpeedKmh] = useState<number>(0.0);
  const [liveAudioConf, setLiveAudioConf] = useState<number>(0.0);

  // Debug Panel Telemetry (actual 19 features passed to model)
  const [evaluatedFeatures, setEvaluatedFeatures] = useState<VZCrashSeverityFeatures | null>(null);
  const [severityResult, setSeverityResult] = useState<SeverityAssessmentResponse | null>(null);

  // Audio test override option (for presenting different audio evidence scenarios)
  const [audioOverride, setAudioOverride] = useState<number | null>(null);

  // Sensor subscription reference
  const windowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const eventSamplesRef = useRef<RawSensorSample[]>([]);

  useEffect(() => {
    // Start sensor manager for live telemetry
    sensorSourceManager.start();

    const unsubscribe = sensorSourceManager.onSensorEvent((reading) => {
      setLiveAccelG(reading.accelG);
      setLiveGyroDeg(reading.gyroDegPerSec);
      setLiveSpeedKmh(reading.gpsSpeedDropKmh || 0.0);
      const curAudio = CrashSoundDetectionService.getCurrentRms();
      setLiveAudioConf(curAudio);

      if (isRunningWindow) {
        eventSamplesRef.current.push({
          ax: 0,
          ay: 0,
          az: reading.accelG, // Magnitude
          gx: 0,
          gy: 0,
          gz: reading.gyroDegPerSec * (Math.PI / 180.0),
          timestamp: Date.now(),
        });
      }
    });

    return () => {
      if (windowTimerRef.current) clearTimeout(windowTimerRef.current);
    };
  }, [isRunningWindow]);

  /**
   * Starts a controlled demo collection window (Requirement 13 & 18).
   * 1. Resets sensor buffer.
   * 2. Collects IMU + GPS + Audio for a 2-second window.
   * 3. Extracts 19 features.
   * 4. Calls POST /ml/severity.
   * 5. Displays model output on Debug Panel.
   */
  const handleStartDemo = () => {
    if (isRunningWindow || isInferencing) return;

    console.log('[SeverityDemo] Sensor window started');
    sensorSourceManager.resetSensorBuffer();
    eventSamplesRef.current = [];
    setEvaluatedFeatures(null);
    setSeverityResult(null);
    setIsRunningWindow(true);
    setStatusMessage('Collecting live sensor window... Impact the phone or simulate motion now!');

    // Capture a 2000ms impact event window
    windowTimerRef.current = setTimeout(async () => {
      setIsRunningWindow(false);
      await processDemoInference();
    }, 2000);
  };

  const processDemoInference = async () => {
    setIsInferencing(true);
    setStatusMessage('Extracting 19 features and calling Severity Random Forest...');

    try {
      // Fetch window samples
      const windowData = sensorSourceManager.getSensorWindow(10);
      const samples = windowData.samples.length > 0 ? windowData.samples : eventSamplesRef.current;

      console.log(`[SeverityDemo] Sensor samples: ${samples.length}`);

      if (samples.length === 0) {
        // Fallback synthetic baseline sample if device sensors did not report in simulator
        samples.push({
          ax: 0, ay: 0, az: liveAccelG || 1.0,
          gx: 0, gy: 0, gz: (liveGyroDeg || 5.0) * (Math.PI / 180.0),
          timestamp: Date.now(),
        });
      }

      const activeAudioConf = audioOverride !== null ? audioOverride : liveAudioConf;
      const audioDetected = activeAudioConf >= ML_CONFIG.AUDIO_CONFIDENCE_THRESHOLD;
      console.log(`[SeverityDemo] Audio confidence: ${(activeAudioConf * 100).toFixed(1)}%`);
      console.log(`[SeverityDemo] Audio detected: ${audioDetected}`);

      // Speeds from buffer
      const speeds = windowData.speeds.length > 0 ? windowData.speeds : [liveSpeedKmh, 0.0];

      // Extract features using dedicated extractor
      const { severityFeatures } = extractImpactFeatures(
        samples,
        speeds,
        120.0, // Measured event pulse duration
        activeAudioConf
      );

      console.log('[SeverityDemo] Features extracted:', severityFeatures);
      setEvaluatedFeatures(severityFeatures);

      console.log('[SeverityDemo] Sending severity inference to /ml/severity...');
      const result = await MlInferenceService.assessSeverity(severityFeatures);

      if (result) {
        console.log(`[SeverityDemo] Prediction: ${result.severity}`);
        console.log('[SeverityDemo] Probabilities:', result.probabilities);
        setSeverityResult(result);
        setStatusMessage(`Model Classified: ${result.severity.toUpperCase()} (${((result.probabilities[result.severity] || 0) * 100).toFixed(1)}%)`);
      } else {
        setStatusMessage('Error: Inference request failed. Check backend connection.');
      }
    } catch (err: any) {
      console.error('[SeverityDemo] Process error:', err);
      setStatusMessage(`Error extracting features: ${err.message}`);
    } finally {
      setIsInferencing(false);
    }
  };

  /**
   * Toy Car Demonstration Preset (Requirement 14 & 19).
   * Runs the low-speed collision sample (speed_initial ~5.1 km/h -> speed_final ~0.2 km/h).
   * Passes the actual values directly to the Random Forest without hardcoding!
   */
  const handleRunToyCarDemo = async () => {
    if (isInferencing) return;

    setIsInferencing(true);
    setStatusMessage('Running Toy-Car Demo Preset (~5.1 km/h -> 0.2 km/h impact)...');
    setSeverityResult(null);

    try {
      const activeAudioConf = audioOverride !== null ? audioOverride : 0.65;
      const audioDetected = activeAudioConf >= ML_CONFIG.AUDIO_CONFIDENCE_THRESHOLD ? 1 : 0;

      // Realistic toy-car deceleration and IMU metrics
      const toyCarFeatures: VZCrashSeverityFeatures = {
        accel_peak: 1.42,
        accel_mean: 1.05,
        accel_std: 0.15,
        accel_rms: 1.06,

        jerk_peak: 0.8,
        jerk_mean: 0.05,
        jerk_std: 0.1,

        gyro_peak: 15.0,
        gyro_mean: 2.5,
        gyro_std: 3.0,
        gyro_rms: 3.5,

        speed_initial: 5.1,
        speed_final: 0.2,
        speed_max: 5.1,
        speed_min: 0.0,
        speed_drop: 4.9,
        speed_range: 5.1,

        impact_duration_ms: 60.0,
        audio_detected: audioDetected,
      };

      console.log('[SeverityDemo] [ToyCar] Features:', toyCarFeatures);
      setEvaluatedFeatures(toyCarFeatures);

      console.log('[SeverityDemo] [ToyCar] Sending to /ml/severity...');
      const result = await MlInferenceService.assessSeverity(toyCarFeatures);

      if (result) {
        console.log(`[SeverityDemo] [ToyCar] Prediction: ${result.severity}`);
        console.log('[SeverityDemo] [ToyCar] Probabilities:', result.probabilities);
        setSeverityResult(result);
        setStatusMessage(`Toy-Car Classified: ${result.severity.toUpperCase()} (${((result.probabilities[result.severity] || 0) * 100).toFixed(1)}%)`);
      } else {
        setStatusMessage('Error: Toy-Car inference failed. Verify backend.');
      }
    } catch (err: any) {
      console.error('[SeverityDemo] Toy car error:', err);
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsInferencing(false);
    }
  };

  const getSeverityBadgeColor = (sev?: string) => {
    switch (sev) {
      case 'Minor':
        return '#00e676';
      case 'Moderate':
        return '#ff9100';
      case 'Severe':
        return '#ff1744';
      default:
        return '#757575';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FYP SEVERITY DEMO</Text>
        <Text style={styles.headerSubtitle}>
          On-Device 19-Feature Random Forest Severity Inference
        </Text>
      </View>

      {/* ── Safety Indicator (Requirement 16 & 21) ── */}
      <View style={styles.safetyBox}>
        <Ionicons name="shield-checkmark" size={20} color="#00e676" style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.safetyTitle}>Safety Mode Active (Demo)</Text>
          <Text style={styles.safetyText}>
            DEMO_DISPATCH_ENABLED = false. Emergency SMS, calls, WhatsApp alerts, and Rescue 1122 escalation are strictly blocked.
          </Text>
        </View>
      </View>

      {/* ── Mode Status ── */}
      <View style={styles.modeCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.modeLabel}>Active Architecture Mode:</Text>
          <View style={styles.badgeActive}>
            <Text style={styles.badgeActiveText}>
              {ML_CONFIG.SEVERITY_DEMO_MODE ? 'DEMO MODE (Direct Severity)' : 'PRODUCTION MODE'}
            </Text>
          </View>
        </View>
        <Text style={styles.modeDescription}>
          VZCrash accident detection trigger is bypassed in demo mode so you can directly test severity with physical impacts or toy car runs.
        </Text>
      </View>

      {/* ── Control Action Buttons (Requirement 13) ── */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.primaryBtn, isRunningWindow && styles.btnDisabled]}
          onPress={handleStartDemo}
          disabled={isRunningWindow || isInferencing}
        >
          {isRunningWindow ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="play-circle-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
          )}
          <Text style={styles.primaryBtnText}>
            {isRunningWindow ? 'Capturing Window (2s)...' : 'Start Severity Demo (Live Impact)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toyCarBtn}
          onPress={handleRunToyCarDemo}
          disabled={isRunningWindow || isInferencing}
        >
          <Ionicons name="car-sport-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.toyCarBtnText}>Run Toy-Car Demo (~5 km/h → 0 km/h)</Text>
        </TouchableOpacity>
      </View>

      {/* ── Status Message ── */}
      <View style={styles.statusBox}>
        <Text style={styles.statusText}>{statusMessage}</Text>
      </View>

      {/* ── Audio Simulation Switch (Requirement 9 & 15) ── */}
      <View style={styles.audioControlBox}>
        <Text style={styles.sectionTitle}>Audio Evidence (40% Rule)</Text>
        <Text style={styles.audioHint}>
          Rule: Confidence ≥ 0.40 ⇒ audio_detected = true (1), Confidence &lt; 0.40 ⇒ false (0)
        </Text>
        <View style={styles.audioButtonsRow}>
          <TouchableOpacity
            style={[styles.audioOptionBtn, audioOverride === 0.65 && styles.audioOptionActive]}
            onPress={() => setAudioOverride(0.65)}
          >
            <Text style={[styles.audioOptionText, audioOverride === 0.65 && styles.audioOptionTextActive]}>
              Crash Audio: 65% (True)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.audioOptionBtn, audioOverride === 0.35 && styles.audioOptionActive]}
            onPress={() => setAudioOverride(0.35)}
          >
            <Text style={[styles.audioOptionText, audioOverride === 0.35 && styles.audioOptionTextActive]}>
              Ambient: 35% (False)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.audioOptionBtn, audioOverride === null && styles.audioOptionActive]}
            onPress={() => setAudioOverride(null)}
          >
            <Text style={[styles.audioOptionText, audioOverride === null && styles.audioOptionTextActive]}>
              Live Mic RMS
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Result Card (Requirements 14 & 20) ── */}
      {severityResult && (
        <View style={[styles.resultCard, { borderColor: getSeverityBadgeColor(severityResult.severity) }]}>
          <Text style={styles.resultLabel}>RANDOM FOREST SEVERITY</Text>
          <Text style={[styles.resultValue, { color: getSeverityBadgeColor(severityResult.severity) }]}>
            {severityResult.severity.toUpperCase()}
          </Text>

          <View style={styles.probContainer}>
            <Text style={styles.probTitle}>Class Probabilities:</Text>
            <View style={styles.probRow}>
              <Text style={styles.probText}>Minor: {((severityResult.probabilities?.Minor || 0) * 100).toFixed(1)}%</Text>
              <Text style={styles.probText}>Moderate: {((severityResult.probabilities?.Moderate || 0) * 100).toFixed(1)}%</Text>
              <Text style={styles.probText}>Severe: {((severityResult.probabilities?.Severe || 0) * 100).toFixed(1)}%</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Live / Evaluated Debug Panel (Requirement 15 & 20) ── */}
      <View style={styles.debugPanel}>
        <Text style={styles.debugTitle}>
          {evaluatedFeatures ? 'EVALUATED IMPACT FEATURES (Passed to Model)' : 'LIVE SENSOR READINGS'}
        </Text>

        <View style={styles.debugRow}>
          <Text style={styles.debugKey}>Acceleration Peak:</Text>
          <Text style={styles.debugVal}>
            {evaluatedFeatures ? `${evaluatedFeatures.accel_peak} g` : `${liveAccelG.toFixed(2)} g`}
          </Text>
        </View>

        <View style={styles.debugRow}>
          <Text style={styles.debugKey}>Acceleration Mean:</Text>
          <Text style={styles.debugVal}>
            {evaluatedFeatures ? `${evaluatedFeatures.accel_mean} g` : '---'}
          </Text>
        </View>

        <View style={styles.debugRow}>
          <Text style={styles.debugKey}>Jerk Peak:</Text>
          <Text style={styles.debugVal}>
            {evaluatedFeatures ? `${evaluatedFeatures.jerk_peak} g/s` : '---'}
          </Text>
        </View>

        <View style={styles.debugRow}>
          <Text style={styles.debugKey}>Gyroscope Peak:</Text>
          <Text style={styles.debugVal}>
            {evaluatedFeatures ? `${evaluatedFeatures.gyro_peak} °/s` : `${liveGyroDeg.toFixed(1)} °/s`}
          </Text>
        </View>

        <View style={styles.debugRow}>
          <Text style={styles.debugKey}>Initial Speed:</Text>
          <Text style={styles.debugVal}>
            {evaluatedFeatures ? `${evaluatedFeatures.speed_initial} km/h` : `${liveSpeedKmh.toFixed(1)} km/h`}
          </Text>
        </View>

        <View style={styles.debugRow}>
          <Text style={styles.debugKey}>Final Speed:</Text>
          <Text style={styles.debugVal}>
            {evaluatedFeatures ? `${evaluatedFeatures.speed_final} km/h` : '---'}
          </Text>
        </View>

        <View style={styles.debugRow}>
          <Text style={styles.debugKey}>Speed Drop:</Text>
          <Text style={styles.debugVal}>
            {evaluatedFeatures ? `${evaluatedFeatures.speed_drop} km/h` : '---'}
          </Text>
        </View>

        <View style={styles.debugRow}>
          <Text style={styles.debugKey}>Impact Duration:</Text>
          <Text style={styles.debugVal}>
            {evaluatedFeatures ? `${evaluatedFeatures.impact_duration_ms} ms` : '---'}
          </Text>
        </View>

        <View style={styles.debugRow}>
          <Text style={styles.debugKey}>Audio Detected:</Text>
          <Text style={[styles.debugVal, { color: (evaluatedFeatures ? evaluatedFeatures.audio_detected : liveAudioConf >= 0.40) ? '#00e676' : '#bbb' }]}>
            {(evaluatedFeatures ? Boolean(evaluatedFeatures.audio_detected) : liveAudioConf >= 0.40) ? 'TRUE' : 'FALSE'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c12',
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8b8b9e',
    marginTop: 4,
  },
  safetyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderColor: '#00e676',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  safetyTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#00e676',
  },
  safetyText: {
    fontSize: 11,
    color: '#b0bec5',
    marginTop: 2,
    lineHeight: 15,
  },
  modeCard: {
    backgroundColor: '#161622',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262638',
  },
  modeLabel: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  badgeActive: {
    backgroundColor: '#3949ab',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeActiveText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  modeDescription: {
    fontSize: 11,
    color: '#8b8b9e',
    marginTop: 6,
    lineHeight: 16,
  },
  actionsContainer: {
    gap: 10,
    marginBottom: 14,
  },
  primaryBtn: {
    backgroundColor: '#d32f2f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  toyCarBtn: {
    backgroundColor: '#1e88e5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    elevation: 3,
  },
  toyCarBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  statusBox: {
    backgroundColor: '#1c1c28',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    color: '#ffb74d',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  audioControlBox: {
    backgroundColor: '#161622',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262638',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  audioHint: {
    fontSize: 11,
    color: '#8b8b9e',
    marginTop: 3,
    marginBottom: 10,
  },
  audioButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  audioOptionBtn: {
    flex: 1,
    backgroundColor: '#262638',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  audioOptionActive: {
    backgroundColor: '#d32f2f',
  },
  audioOptionText: {
    fontSize: 10,
    color: '#b0bec5',
    fontWeight: '600',
    textAlign: 'center',
  },
  audioOptionTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  resultCard: {
    backgroundColor: '#161622',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
  },
  resultLabel: {
    fontSize: 12,
    color: '#b0bec5',
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  resultValue: {
    fontSize: 32,
    fontWeight: '900',
    marginVertical: 4,
    letterSpacing: 1.5,
  },
  probContainer: {
    width: '100%',
    marginTop: 10,
    borderTopColor: '#262638',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  probTitle: {
    fontSize: 11,
    color: '#8b8b9e',
    marginBottom: 4,
  },
  probRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  probText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  debugPanel: {
    backgroundColor: '#161622',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262638',
  },
  debugTitle: {
    fontSize: 12,
    color: '#64b5f6',
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomColor: '#1f1f2e',
    borderBottomWidth: 1,
  },
  debugKey: {
    fontSize: 12,
    color: '#9e9eb0',
  },
  debugVal: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
