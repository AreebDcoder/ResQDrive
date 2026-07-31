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
import { sensorSourceManager } from '../services/sensorSourceManager';
import { Ionicons } from '@expo/vector-icons';

export default function BleSensorDemoScreen() {
  const { connectionStatus, activeSource, latestReading } = useSelector(
    (state: RootState) => state.sensor
  );

  const [rawPayload, setRawPayload] = useState<string>('No data received yet.');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

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
      case 'connected': return '#00E676';
      case 'connecting': return '#FF9100';
      case 'unavailable': return '#FF1744';
      default: return '#6B6B80';
    }
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
            <Text style={styles.title}>BLE Sensor Diagnostics</Text>
            <Text style={styles.subtitle}>
              Monitor ResQDrive-Sensor connection, telemetry values, and fallback states.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardHeader}>Connection Status</Text>

            <View style={styles.row}>
              <Text style={styles.label}>Hardware State:</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                <Text style={styles.statusText}>{connectionStatus.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Active Data Source:</Text>
              <Text style={styles.valueText}>
                {activeSource === 'ble'
                  ? '🔌 ESP32 BLE Hardware'
                  : activeSource === 'phone'
                  ? '📱 Phone Sensors (Fallback)'
                  : '🧪 Mock Simulator'}
              </Text>
            </View>

            <TouchableOpacity style={styles.reconnectBtn} onPress={handleForceReconnect}>
              <Ionicons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.reconnectBtnText}>Force Reconnect BLE</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardHeader}>Derived Telemetry</Text>

            <View style={styles.row}>
              <Text style={styles.label}>Linear Acceleration (accelG):</Text>
              <Text style={styles.valueText}>
                {latestReading ? `${latestReading.accelG.toFixed(4)} g` : '—'}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Rotation Speed (gyroDegPerSec):</Text>
              <Text style={styles.valueText}>
                {latestReading ? `${latestReading.gyroDegPerSec.toFixed(2)} °/s` : '—'}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Sudden Speed Drop (gpsSpeedDrop):</Text>
              <Text style={styles.valueText}>
                {latestReading ? `${latestReading.gpsSpeedDropKmh.toFixed(1)} km/h` : '—'}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardHeader}>Raw BLE JSON Broadcast Payload</Text>
            <View style={styles.codeBlock}>
              <Text style={styles.codeText}>{rawPayload}</Text>
            </View>
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
  card: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)', borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  cardHeader: {
    fontSize: 13, fontWeight: 'bold', color: '#E53935',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  label: { fontSize: 14, color: '#A0A0B8' },
  valueText: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  statusText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  reconnectBtn: {
    backgroundColor: '#E53935', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 12, borderRadius: 14, marginTop: 10,
    shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  reconnectBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  codeBlock: {
    backgroundColor: 'rgba(10, 10, 15, 0.8)', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  codeText: { color: '#00E676', fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
});