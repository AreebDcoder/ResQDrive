import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, {
  getCurrentServerUrl,
  setCustomServerHost,
  clearCustomServerHost,
  testServerConnection,
  detectMetroHostIp,
} from '../api/axios';

interface HealthStatus {
  devMode: boolean;
  channels: {
    push: { configured: boolean; label: string };
    sms: { configured: boolean; label: string };
    email: { configured: boolean; label: string };
  };
}

export default function DevModeBanner() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [serverUrl, setServerUrl] = useState<string>(getCurrentServerUrl());
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [statusMessage, setStatusMessage] = useState<string>('Testing connection...');
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [inputIp, setInputIp] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setConnectionStatus('checking');
    const current = getCurrentServerUrl();
    setServerUrl(current);

    try {
      const res = await api.get('/alert-dispatch/health', { timeout: 4000 });
      setHealth(res.data);
      setConnectionStatus('connected');
      setStatusMessage('Connected');
    } catch (err: any) {
      setConnectionStatus('error');
      setStatusMessage(err?.message || 'Cannot reach server');
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const handleOpenModal = () => {
    setInputIp(serverUrl);
    setTestResult(null);
    setModalVisible(true);
  };

  const handleAutoDetect = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const detectedIp = detectMetroHostIp();
      if (detectedIp) {
        const newUrl = await clearCustomServerHost();
        setServerUrl(newUrl);
        setInputIp(newUrl);
        const test = await testServerConnection(newUrl);
        setTestResult(test.ok ? `✅ Auto-detected ${newUrl} (${test.latencyMs}ms)` : `⚠️ Auto-detected ${newUrl} but ping failed: ${test.message}`);
        checkHealth();
      } else {
        setTestResult('⚠️ Could not detect Metro host. Please enter your laptop IP manually.');
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveCustomIp = async () => {
    if (!inputIp.trim()) return;
    setIsTesting(true);
    try {
      const newUrl = await setCustomServerHost(inputIp.trim());
      setServerUrl(newUrl);
      const test = await testServerConnection(newUrl);
      setTestResult(test.ok ? `✅ Successfully connected to ${newUrl} (${test.latencyMs}ms)` : `⚠️ Saved, but test ping failed: ${test.message}`);
      checkHealth();
    } catch (err: any) {
      setTestResult(`❌ Error saving IP: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestPing = async () => {
    setIsTesting(true);
    try {
      const test = await testServerConnection(inputIp || serverUrl);
      setTestResult(test.ok ? `✅ Connection OK! (${test.latencyMs}ms)` : `❌ Failed: ${test.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const unconfigured = health?.channels
    ? Object.entries(health.channels)
        .filter(([_, v]) => !v.configured)
        .map(([k, v]) => v.label)
    : [];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.banner,
          connectionStatus === 'connected' ? styles.bannerConnected : (connectionStatus === 'checking' ? styles.bannerChecking : styles.bannerError),
        ]}
        onPress={handleOpenModal}
        activeOpacity={0.8}
      >
        <View style={styles.headerRow}>
          <View style={styles.leftRow}>
            <View style={[
              styles.statusDot,
              connectionStatus === 'connected' ? styles.dotGreen : (connectionStatus === 'checking' ? styles.dotYellow : styles.dotRed)
            ]} />
            <Text style={styles.serverText} numberOfLines={1}>
              {serverUrl}
            </Text>
          </View>
          <View style={styles.editBadge}>
            <Ionicons name="settings-outline" size={13} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.editBadgeText}>Change IP</Text>
          </View>
        </View>

        {connectionStatus === 'error' && (
          <Text style={styles.errorText}>
            ⚠️ Offline ({statusMessage}). Tap to auto-detect or enter your laptop IP.
          </Text>
        )}

        {connectionStatus === 'connected' && health?.devMode && unconfigured.length > 0 && (
          <Text style={styles.hintText}>
            Dev Mode fallback active: {unconfigured.join(', ')}
          </Text>
        )}
      </TouchableOpacity>

      {/* Modal for Setting IP */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="server-outline" size={22} color="#E53935" style={{ marginRight: 8 }} />
              <Text style={styles.modalTitle}>Backend Server Connection</Text>
            </View>

            <Text style={styles.modalSub}>
              Enter your laptop LAN IP or tap "Auto-Detect" to sync with Metro bundler automatically.
            </Text>

            <Text style={styles.inputLabel}>Server URL or IP:</Text>
            <TextInput
              style={styles.input}
              value={inputIp}
              onChangeText={setInputIp}
              placeholder="e.g. 192.168.1.50 or http://192.168.1.50:3000"
              placeholderTextColor="#888"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {testResult && (
              <View style={styles.resultBox}>
                <Text style={styles.resultText}>{testResult}</Text>
              </View>
            )}

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={handleAutoDetect}
                disabled={isTesting}
              >
                {isTesting ? <ActivityIndicator size="small" color="#FFF" /> : (
                  <>
                    <Ionicons name="scan-outline" size={15} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={styles.btnText}>Auto-Detect</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={handleTestPing}
                disabled={isTesting}
              >
                <Ionicons name="pulse-outline" size={15} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.btnText}>Test Ping</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={handleSaveCustomIp}
                disabled={isTesting}
              >
                <Ionicons name="checkmark-outline" size={15} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  banner: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  bannerConnected: {
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  bannerChecking: {
    backgroundColor: 'rgba(255, 193, 7, 0.08)',
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  bannerError: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderColor: 'rgba(244, 67, 54, 0.4)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotGreen: { backgroundColor: '#4CAF50' },
  dotYellow: { backgroundColor: '#FFC107' },
  dotRed: { backgroundColor: '#F44336' },
  serverText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DDD',
    flex: 1,
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  editBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  errorText: {
    fontSize: 11,
    color: '#FF8A80',
    marginTop: 4,
  },
  hintText: {
    fontSize: 10,
    color: '#AAA',
    marginTop: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1E1E24',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  modalSub: {
    fontSize: 12,
    color: '#AAA',
    marginBottom: 16,
    lineHeight: 17,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CCC',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#2A2A32',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFF',
    fontSize: 14,
    marginBottom: 12,
  },
  resultBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  resultText: {
    fontSize: 12,
    color: '#FFF',
    lineHeight: 16,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnSecondary: {
    backgroundColor: '#37474F',
  },
  btnPrimary: {
    backgroundColor: '#E53935',
  },
  btnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  closeBtnText: {
    color: '#CCC',
    fontSize: 13,
    fontWeight: '600',
  },
});