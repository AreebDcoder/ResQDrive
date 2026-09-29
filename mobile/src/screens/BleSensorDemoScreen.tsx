import React, { useEffect, useState, useRef } from 'react';
import {
  AccessibilityInfo,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { sensorSourceManager } from '../services/sensorSourceManager';
import { Ionicons } from '@expo/vector-icons';
import { CrashSoundDetectionService } from '../services/crashSoundDetectionService';
import { MultiModalFusionService } from '../services/multiModalFusionService';
import { colors, darkColors, tints } from '../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BleSensorDemoScreen() {
  const { connectionStatus, activeSource, latestReading } = useSelector(
    (state: RootState) => state.sensor
  );
  const insets = useSafeAreaInsets();

  const [rawPayload, setRawPayload] = useState<string>('No data received yet.');

  // Batch 7 Phase 4: Respect Reduce Motion accessibility setting
  const [reduceMotion, setReduceMotion] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Skip decorative entrance animation when Reduce Motion is enabled
    if (reduceMotion) {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, reduceMotion]);

  useEffect(() => {
    sensorSourceManager.onSensorEvent((reading) => {
      const simRaw = {
        accelX: (Math.random() * 0.05).toFixed(3),
        accelY: (Math.random() * 0.05).toFixed(3),
        accelZ: (0.98 + Math.random() * 0.04).toFixed(3),
        gyroX: (Math.random() * 2).toFixed(2),
        gyroY: (Math.random() * 2).toFixed(2),
        gyroZ: (Math.random() * 2).toFixed(2),
        speedKmh: (reading.gpsSpeedDropKmh > 0 ? 30.5 : 55.2).toFixed(2),
        gpsFix: true,
        timestamp: Date.now()
      };
      setRawPayload(JSON.stringify(simRaw, null, 2));
    });
  }, []);

  const handleForceReconnect = () => {
    sensorSourceManager.forceReconnect();
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return colors.success[500];
      case 'connecting': return colors.warning[500];
      case 'unavailable': return colors.danger[500];
      default: return darkColors.textTertiary;
    }
  };

  return (
    <View style={styles.outer}>
      <View style={StyleSheet.absoluteFillObject}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: darkColors.background }]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradTop]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradBottom]} />
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header" allowFontScaling={true} maxFontSizeMultiplier={1.5}>BLE Sensor Diagnostics</Text>
            <Text style={styles.subtitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              Monitor ResQDrive-Sensor connection, telemetry values, and fallback states.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardHeader} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Connection Status</Text>

            <View style={styles.row}>
              <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Hardware State:</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                <Text style={styles.statusText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{connectionStatus.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Active Data Source:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons
                  name={activeSource === 'ble' ? 'hardware-chip-outline' : activeSource === 'phone' ? 'phone-portrait-outline' : 'flask-outline'}
                  size={16}
                  color={colors.success[400]}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.valueText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                  {activeSource === 'ble'
                    ? 'ESP32 BLE Hardware'
                    : activeSource === 'phone'
                    ? 'Phone Sensors (Fallback)'
                    : 'Mock Simulator'}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.reconnectBtn} onPress={handleForceReconnect} accessibilityRole="button">
              <Ionicons name="refresh" size={18} color={darkColors.text} style={{ marginRight: 6 }} />
              <Text style={styles.reconnectBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Force Reconnect BLE</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardHeader} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Derived Telemetry</Text>

            <View style={styles.row}>
              <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Linear Acceleration (accelG):</Text>
              <Text style={styles.valueText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                {latestReading ? `${latestReading.accelG.toFixed(4)} g` : '—'}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Rotation Speed (gyroDegPerSec):</Text>
              <Text style={styles.valueText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                {latestReading ? `${latestReading.gyroDegPerSec.toFixed(2)} °/s` : '—'}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Sudden Speed Drop (gpsSpeedDrop):</Text>
              <Text style={styles.valueText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                {latestReading ? `${latestReading.gpsSpeedDropKmh.toFixed(1)} km/h` : '—'}
              </Text>
            </View>
          </View>

          {/* 🧪 DEV SIMULATION TRIGGER BUTTON */}
          <TouchableOpacity
            style={styles.simCrashBtn}
            onPress={() => {
              // Step 1: Fire a fake crash sound event (85% confidence)
              CrashSoundDetectionService.simulateManualCrash('Crash', 0.85);
              
              // Step 2: Fire a fake severe motion event 1 second later (within 10s window)
              setTimeout(() => {
                MultiModalFusionService.recordMotionEvent('severe', 5.0, 300);
              }, 1000);
            }} accessibilityRole="button"
          >
            <Ionicons name="flash" size={18} color={darkColors.text} style={{ marginRight: 8 }} />
            <Text style={styles.simCrashBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>DEV: Trigger Confirmed Accident</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.cardHeader} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Raw BLE JSON Broadcast Payload</Text>
            <View style={styles.codeBlock}>
              <Text style={styles.codeText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{rawPayload}</Text>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: darkColors.background },
  gradTop: { top: 0, height: 300, backgroundColor: tints.dangerSubtle },
  gradBottom: { bottom: 0, height: 400, backgroundColor: tints.infoSubtle },
  scrollContent: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: darkColors.text },
  subtitle: { fontSize: 14, color: darkColors.textSecondary, marginTop: 6, lineHeight: 20 },
  card: {
    backgroundColor: tints.glassCard, borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: tints.whiteBorder,
    shadowColor: colors.neutral[950], shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  cardHeader: {
    fontSize: 13, fontWeight: 'bold', color: colors.danger[500],
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  label: { fontSize: 14, color: darkColors.textSecondary },
  valueText: { fontSize: 15, fontWeight: 'bold', color: darkColors.text },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  statusText: { color: darkColors.text, fontSize: 11, fontWeight: 'bold' },
  reconnectBtn: {
    backgroundColor: colors.danger[500], flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 12, borderRadius: 14, marginTop: 10,
    shadowColor: colors.danger[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  reconnectBtnText: { color: darkColors.text, fontSize: 14, fontWeight: 'bold' },
  simCrashBtn: {
    backgroundColor: colors.danger[600], flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 16, borderRadius: 20, marginBottom: 20,
    shadowColor: colors.danger[600], shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
    borderWidth: 1, borderColor: tints.whiteBorderStrong,
  },
  simCrashBtnText: { color: darkColors.text, fontSize: 15, fontWeight: 'bold' },
  codeBlock: {
    backgroundColor: tints.overlayStrong, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: tints.whiteSubtle,
  },
  codeText: { color: colors.success[500], fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
});