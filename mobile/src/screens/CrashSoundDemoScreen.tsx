import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CrashSoundDetectionService } from '../services/crashSoundDetectionService';
import {
  CRASH_CONFIDENCE_THRESHOLD,
  CRASH_RELEVANT_CLASS_NAMES,
  CrashRelevantClassName,
} from '../config/crashClassConfig';

export default function CrashSoundDemoScreen() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [currentClass, setCurrentClass] = useState<string | null>(null);
  const [lastAlert, setLastAlert] = useState<{ confidence: number; className: string; timestamp: Date } | null>(null);
  const [flashWarning, setFlashWarning] = useState(false);

  // Transient Telemetry State
  const [telemetry, setTelemetry] = useState({
    currentRms: 0,
    rollingAvgRms: 0.01,
    transientRatio: 1.0,
    isTransient: false,
  });
  const [transientFlash, setTransientFlash] = useState(false);

  useEffect(() => {
    // 1. Subscribe to YAMNet crash events
    CrashSoundDetectionService.subscribeToCrashEvents((confidence, className) => {
      setCurrentConfidence(confidence);
      setCurrentClass(className);
      setLastAlert({
        confidence,
        className,
        timestamp: new Date(),
      });
      
      setFlashWarning(true);
      setTimeout(() => {
        setFlashWarning(false);
      }, 3000);
    });

    // 2. Subscribe to live audio RMS telemetry & transient events
    CrashSoundDetectionService.subscribeToTelemetry((data) => {
      setTelemetry(data);
      if (data.isTransient) {
        setTransientFlash(true);
        setTimeout(() => setTransientFlash(false), 1500);
      }
    });

    return () => {
      CrashSoundDetectionService.stopMonitoring();
    };
  }, []);

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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Transient-Triggered Crash Sound Detection</Text>
        <Text style={styles.subtitle}>
          Event-driven audio classifier: RMS transient detector triggers YAMNet inference on centered 2-second windows.
        </Text>
      </View>

      {/* Transient Flash Banner */}
      {transientFlash && (
        <View style={styles.transientBanner}>
          <Text style={styles.transientBannerText}>
            ⚡ ACOUSTIC TRANSIENT DETECTED (Ratio: {telemetry.transientRatio.toFixed(1)}x)
          </Text>
        </View>
      )}

      {/* Warning Flash Banner */}
      {flashWarning && lastAlert && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            💥 CRASH SOUND CONFIRMED: {lastAlert.className.toUpperCase()} ({Math.round(lastAlert.confidence * 100)}%)
          </Text>
        </View>
      )}

      {/* Live Telemetry Display */}
      <View style={styles.telemetryCard}>
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
          <Text style={[styles.telemetryValue, telemetry.transientRatio >= 1.8 ? styles.dangerValue : styles.normalValue]}>
            {telemetry.transientRatio.toFixed(1)}x (Threshold: 1.8x)
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

      {/* Manual Testing / Simulator Panel */}
      <View style={styles.simCard}>
        <Text style={styles.cardLabel}>Manual Classifier Simulator</Text>
        <Text style={styles.simSubtitle}>
          Simulate a high-confidence crash sound event to test the dual-signal event callbacks.
        </Text>
        
        <View style={styles.simGrid}>
          {CRASH_RELEVANT_CLASS_NAMES.map((name) => (
            <TouchableOpacity
              key={name}
              style={styles.simBtn}
              onPress={() => handleSimulateCrash(name)}
            >
              <Text style={styles.simBtnText}>🔊 {name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Audit History Log */}
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

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Zero-Shot Classification Info</Text>
        <Text style={styles.infoDesc}>
          This module monitors audio locally at 16kHz mono. It uses YAMNet's pre-trained AudioSet classification layers to identify crash events without uploading raw files or recording data to disk.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  transientBanner: {
    backgroundColor: '#f57c00',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  transientBannerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 6,
    lineHeight: 20,
  },
  warningBanner: {
    backgroundColor: '#d32f2f',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#d32f2f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  warningText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  telemetryCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#d32f2f',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  telemetryTitle: {
    fontSize: 15,
    color: '#aaaaaa',
    flex: 1,
  },
  telemetryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  activeDot: {
    backgroundColor: '#4caf50',
  },
  idleDot: {
    backgroundColor: '#757575',
  },
  activeText: {
    color: '#4caf50',
  },
  idleText: {
    color: '#888888',
  },
  dangerValue: {
    color: '#ff5252',
  },
  normalValue: {
    color: '#ffffff',
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  startBtn: {
    backgroundColor: '#d32f2f',
  },
  stopBtn: {
    backgroundColor: '#2e2e2e',
    borderWidth: 1,
    borderColor: '#d32f2f',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  simCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  simSubtitle: {
    color: '#888888',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  simGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  simBtn: {
    backgroundColor: '#262626',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#363636',
  },
  simBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  historyCard: {
    backgroundColor: '#201818',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#d32f2f',
  },
  historyText: {
    fontSize: 14,
    color: '#bbbbbb',
    marginBottom: 8,
  },
  highlightText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222222',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#aaaaaa',
    marginBottom: 6,
  },
  infoDesc: {
    fontSize: 12,
    color: '#777777',
    lineHeight: 18,
  },
});
