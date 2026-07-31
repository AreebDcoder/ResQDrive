import React, { useEffect, useState, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { CrashSoundDetectionService } from '../services/crashSoundDetectionService';
import {
  CRASH_CONFIDENCE_THRESHOLD,
  CRASH_RELEVANT_CLASS_NAMES,
  CrashRelevantClassName,
} from '../config/crashClassConfig';

export default function CrashSoundDemoScreen() {
  const preferences = useSelector((state: RootState) => state.notifications.preferences);
  const drivingModeEnabled = !!preferences?.drivingModeEnabled;

  const [isMonitoring, setIsMonitoring] = useState(drivingModeEnabled);
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [currentClass, setCurrentClass] = useState<string | null>(null);
  const [lastAlert, setLastAlert] = useState<{ confidence: number; className: string; timestamp: Date } | null>(null);
  const [flashWarning, setFlashWarning] = useState(false);

  const [telemetry, setTelemetry] = useState({
    currentRms: 0,
    rollingAvgRms: 0.01,
    transientRatio: 1.0,
    isTransient: false,
  });
  const [transientFlash, setTransientFlash] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (drivingModeEnabled) {
      CrashSoundDetectionService.startMonitoring();
    }

    CrashSoundDetectionService.subscribeToCrashEvents((confidence, className) => {
      setCurrentConfidence(confidence);
      setCurrentClass(className);
      setLastAlert({ confidence, className, timestamp: new Date() });
      setFlashWarning(true);
      setTimeout(() => { setFlashWarning(false); }, 3000);
    });

    CrashSoundDetectionService.subscribeToTelemetry((data) => {
      setTelemetry(data);
      if (data.isTransient) {
        setTransientFlash(true);
        setTimeout(() => setTransientFlash(false), 1500);
      }
    });

    return () => {
      if (!drivingModeEnabled) {
        CrashSoundDetectionService.stopMonitoring();
      }
    };
  }, [drivingModeEnabled]);

  const handleToggleMonitoring = async () => {
    if (isMonitoring) {
      CrashSoundDetectionService.stopMonitoring();
      setIsMonitoring(false);
    } else {
      await CrashSoundDetectionService.startMonitoring();
      setIsMonitoring(true);
    }
  };

  const handleSimulateCrash = (cls: CrashRelevantClassName) => {
    CrashSoundDetectionService.simulateManualCrash(cls, 0.65 + Math.random() * 0.3);
  };

  return (
    <View style={styles.outer}>
      <View style={StyleSheet.absoluteFillObject}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0A0A0F' }]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradTop]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradBottom]} />
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Transient-Triggered Crash Sound Detection</Text>
            <Text style={styles.subtitle}>
              Event-driven audio classifier: RMS transient detector triggers YAMNet inference on centered 2-second windows.
            </Text>
          </View>

          {transientFlash && (
            <View style={styles.transientBanner}>
              <Text style={styles.transientBannerText}>
                ⚡ ACOUSTIC TRANSIENT DETECTED (Ratio: {telemetry.transientRatio.toFixed(1)}x)
              </Text>
            </View>
          )}

          {flashWarning && lastAlert && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>
                💥 CRASH SOUND CONFIRMED: {lastAlert.className.toUpperCase()} ({Math.round(lastAlert.confidence * 100)}%)
              </Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Real-Time Audio Diagnostics</Text>

            <View style={styles.telemetryRow}>
              <Text style={styles.telemetryTitle}>Status:</Text>
              <View style={[styles.statusDot, isMonitoring ? styles.activeDot : styles.idleDot]} />
              <Text style={[styles.telemetryValue, isMonitoring ? styles.activeText : styles.idleText]}>
                {isMonitoring ? 'Monitoring Active' : 'Idle'}
              </Text>
            </View>

            <View style={styles.telemetryRow}>
              <Text style={styles.telemetryTitle}>Instantaneous RMS Energy:</Text>
              <Text style={styles.telemetryValue}>{telemetry.currentRms.toFixed(4)}</Text>
            </View>

            <View style={styles.telemetryRow}>
              <Text style={styles.telemetryTitle}>Rolling 5s Avg RMS:</Text>
              <Text style={styles.telemetryValue}>{telemetry.rollingAvgRms.toFixed(4)}</Text>
            </View>

            <View style={styles.telemetryRow}>
              <Text style={styles.telemetryTitle}>Transient Energy Multiplier:</Text>
              <Text style={[styles.telemetryValue, telemetry.transientRatio >= 2.5 ? styles.dangerValue : styles.normalValue]}>
                {telemetry.transientRatio.toFixed(1)}x (Threshold: 2.5x)
              </Text>
            </View>

            <View style={styles.telemetryRow}>
              <Text style={styles.telemetryTitle}>Max Crash Confidence:</Text>
              <Text style={[styles.telemetryValue, currentConfidence > CRASH_CONFIDENCE_THRESHOLD ? styles.dangerValue : styles.normalValue]}>
                {Math.round(currentConfidence * 100)}%
              </Text>
            </View>

            <View style={styles.telemetryRow}>
              <Text style={styles.telemetryTitle}>Top Matched Sound:</Text>
              <Text style={styles.telemetryValue}>{currentClass || '—'}</Text>
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, isMonitoring ? styles.stopBtn : styles.startBtn]}
              onPress={handleToggleMonitoring}
            >
              <Text style={styles.actionBtnText}>
                {isMonitoring ? 'Stop Audio Capture' : 'Start Audio Capture'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Manual Classifier Simulator</Text>
            <Text style={styles.simSubtitle}>
              Simulate a high-confidence crash sound event to test the dual-signal event callbacks.
            </Text>

            <View style={styles.simGrid}>
              {CRASH_RELEVANT_CLASS_NAMES.map((name) => (
                <TouchableOpacity key={name} style={styles.simBtn} onPress={() => handleSimulateCrash(name)}>
                  <Text style={styles.simBtnText}>🔊 {name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {lastAlert && (
            <View style={styles.historyCard}>
              <Text style={styles.cardLabel}>Last Confirmed Alert Event</Text>
              <Text style={styles.historyText}>
                Class: <Text style={styles.highlightText}>{lastAlert.className}</Text>
              </Text>
              <Text style={styles.historyText}>
                Confidence: <Text style={styles.highlightText}>{Math.round(lastAlert.confidence * 100)}%</Text>
              </Text>
              <Text style={styles.historyText}>
                Timestamp: <Text style={styles.highlightText}>{lastAlert.timestamp.toLocaleTimeString()}</Text>
              </Text>
            </View>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Zero-Shot Classification Info</Text>
            <Text style={styles.infoDesc}>
              This module monitors audio locally at 16kHz mono. It uses YAMNet's pre-trained AudioSet classification layers to identify crash events without uploading raw files or recording data to disk.
            </Text>
            {!CrashSoundDetectionService.isNativeSupported() && (
              <View style={styles.webWarningBox}>
                <Text style={styles.webWarningTitle}>⚠️ Running in Web/Mock Simulator Mode</Text>
                <Text style={styles.webWarningDesc}>
                  Since standard web browsers cannot run native TensorFlow Lite models directly, clapping or other loud noise spikes will trigger simulated crash classifications (like Explosion, Shatter, Skidding) for database logging and telemetry testing.
                </Text>
                <Text style={styles.webWarningFooter}>
                  To run the real YAMNet AI classification on phone microphone audio, run: npx expo run:android
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#0A0A0F' },
  gradTop: { top: 0, height: 300, backgroundColor: 'rgba(229, 57, 53, 0.08)' },
  gradBottom: { bottom: 0, height: 400, backgroundColor: 'rgba(41, 121, 255, 0.06)' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: '#A0A0B8', marginTop: 6, lineHeight: 20 },
  transientBanner: {
    backgroundColor: 'rgba(255, 145, 0, 0.15)', padding: 12, borderRadius: 14, marginBottom: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255, 145, 0, 0.3)',
  },
  transientBannerText: { color: '#FF9100', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 },
  warningBanner: {
    backgroundColor: '#E53935', padding: 16, borderRadius: 14, marginBottom: 20, alignItems: 'center',
    shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  warningText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', letterSpacing: 0.5 },
  card: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)', borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  cardLabel: { fontSize: 13, fontWeight: 'bold', color: '#E53935', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  telemetryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  telemetryTitle: { fontSize: 15, color: '#A0A0B8', flex: 1 },
  telemetryValue: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  activeDot: { backgroundColor: '#00E676' },
  idleDot: { backgroundColor: '#6B6B80' },
  activeText: { color: '#00E676' },
  idleText: { color: '#6B6B80' },
  dangerValue: { color: '#FF1744' },
  normalValue: { color: '#FFFFFF' },
  actionBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  startBtn: { backgroundColor: '#E53935', shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 },
  stopBtn: { backgroundColor: 'rgba(28, 28, 46, 0.6)', borderWidth: 1, borderColor: 'rgba(229, 57, 53, 0.4)' },
  actionBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  simSubtitle: { color: '#A0A0B8', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  simGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  simBtn: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8,
    width: '48%', marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  simBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  historyCard: {
    backgroundColor: 'rgba(229, 57, 53, 0.08)', borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(229, 57, 53, 0.3)',
    shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  historyText: { fontSize: 14, color: '#A0A0B8', marginBottom: 8 },
  highlightText: { color: '#FFFFFF', fontWeight: 'bold' },
  infoCard: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  infoTitle: { fontSize: 14, fontWeight: 'bold', color: '#A0A0B8', marginBottom: 6 },
  infoDesc: { fontSize: 12, color: '#6B6B80', lineHeight: 18 },
  webWarningBox: {
    marginTop: 14, padding: 12, backgroundColor: 'rgba(255, 145, 0, 0.08)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255, 145, 0, 0.3)',
  },
  webWarningTitle: { color: '#FF9100', fontSize: 13, fontWeight: 'bold', marginBottom: 6 },
  webWarningDesc: { color: '#A0A0B8', fontSize: 11, lineHeight: 16, marginBottom: 8 },
  webWarningFooter: { color: '#FF8A80', fontSize: 11, fontWeight: 'bold' },
});