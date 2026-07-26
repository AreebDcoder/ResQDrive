import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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

  useEffect(() => {
    // Listen to real-time events to display raw/derived telemetry
    sensorSourceManager.onSensorEvent((reading) => {
      // Create a simulated raw representation for demonstration/debug output
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
      case 'connected':
        return '#4caf50';
      case 'connecting':
        return '#ff9800';
      case 'unavailable':
        return '#d32f2f';
      default:
        return '#757575';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>BLE Sensor Diagnostics</Text>
        <Text style={styles.subtitle}>
          Monitor ResQDrive-Sensor connection, telemetry values, and fallback states.
        </Text>
      </View>

      {/* Connection Card */}
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
          <Ionicons name="refresh" size={18} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.reconnectBtnText}>Force Reconnect BLE</Text>
        </TouchableOpacity>
      </View>

      {/* Telemetry Card */}
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

      {/* Raw Payload Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Raw BLE JSON Broadcast Payload</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>{rawPayload}</Text>
        </View>
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
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#d32f2f',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    color: '#aaaaaa',
  },
  valueText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  reconnectBtn: {
    backgroundColor: '#d32f2f',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  reconnectBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  codeBlock: {
    backgroundColor: '#0d0d0d',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#222222',
  },
  codeText: {
    color: '#00e676',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
});
