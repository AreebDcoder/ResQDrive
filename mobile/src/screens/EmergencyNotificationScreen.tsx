import { API_URL } from '../api/axios';
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Linking, Alert, Platform, Animated,
} from 'react-native';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import {
  triggerEmergency, cancelEmergency, fetchEmergencyStatus, clearEmergency,
} from '../store/slices/emergencySlice';
import { connectSocket, disconnectSocket, emitLocationUpdate } from '../services/socketService';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui';
import { colors, darkColors, tints } from '../theme/tokens';

const POLL_INTERVAL_MS = 5000;

const CHANNEL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  PUSH: 'phone-portrait-outline',
  SMS: 'chatbubble-outline',
  EMAIL: 'mail-outline',
  PHONE_CALL: 'call-outline',
};

const STATUS_COLORS: Record<string, string> = {
  SENT: colors.success[500],
  DELIVERED: colors.success[500],
  ACKNOWLEDGED: colors.info[500],
  PENDING: colors.warning[400],
  FAILED: colors.danger[500],
};

export default function EmergencyNotificationScreen({ navigation }: { navigation: any }) {
  const toast = useToast();
  const dispatch = useDispatch<any>();
  const emergency = useSelector((state: RootState) => state.emergency);
  const [pollTimer, setPollTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');

  // Phase 8: ConfirmDialog state for destructive emergency actions (replaces Promise-based Alert.alert)
  const [triggerDialogVisible, setTriggerDialogVisible] = useState(false);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const trackingSessionIdRef = useRef<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Start GPS tracking for the emergency location session
  async function startEmergencyLocationTracking(locationSessionId: string) {
    trackingSessionIdRef.current = locationSessionId;
    setGpsStatus('connecting');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsStatus('error');
        console.warn('[Emergency] Location permission denied');
        return;
      }

      await connectSocket();

      const sendLocation = (loc: Location.LocationObject) => {
        if (trackingSessionIdRef.current !== locationSessionId) return;
        emitLocationUpdate(locationSessionId, loc.coords.latitude, loc.coords.longitude);
      };

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 0,
        },
        sendLocation,
      );

      setGpsStatus('active');
      console.log('[Emergency] GPS tracking started for location session:', locationSessionId);
    } catch (err) {
      console.error('[Emergency] Failed to start GPS tracking:', err);
      setGpsStatus('error');
    }
  }

  async function stopEmergencyLocationTracking() {
    trackingSessionIdRef.current = null;
    if (subscriptionRef.current) {
      try {
        await subscriptionRef.current.remove();
      } catch (err) {
        console.warn('[Emergency] Subscription.remove() failed (web shim bug) — ignoring:', err);
      }
      subscriptionRef.current = null;
    }
    try {
      disconnectSocket();
    } catch (err) {
      console.warn('[Emergency] disconnectSocket failed:', err);
    }
    setGpsStatus('idle');
  }

  // Start tracking when emergency becomes active with a locationSessionId
  useEffect(() => {
    if (emergency.active && emergency.locationSessionId && emergency.status === 'ACTIVE') {
      if (trackingSessionIdRef.current !== emergency.locationSessionId) {
        startEmergencyLocationTracking(emergency.locationSessionId);
      }
    } else {
      if (trackingSessionIdRef.current) {
        stopEmergencyLocationTracking();
      }
    }
  }, [emergency.active, emergency.locationSessionId, emergency.status]);

  // Poll for status updates while active
  useEffect(() => {
    dispatch(fetchEmergencyStatus());
    return () => {
      if (pollTimer) clearInterval(pollTimer);
      stopEmergencyLocationTracking();
    };
  }, []);

  useEffect(() => {
    if (emergency.active && emergency.status === 'ACTIVE') {
      if (!pollTimer) {
        const t = setInterval(() => {
          dispatch(fetchEmergencyStatus());
        }, POLL_INTERVAL_MS);
        setPollTimer(t);
      }
    } else {
      if (pollTimer) {
        clearInterval(pollTimer);
        setPollTimer(null);
      }
    }
  }, [emergency.active, emergency.status]);

  function getAcknowledgeLink() {
    if (!emergency.acknowledgeUrl) return '';
    const baseUrl = API_URL; // Use centralized API_URL from axios.ts // was: Platform.OS === 'web'
    return `${baseUrl}${emergency.acknowledgeUrl}`;
  }

  async function performEmergencyTrigger() {
    const payload: any = { message: 'Emergency alert triggered from mobile app' };
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        payload.latitude = loc.coords.latitude;
        payload.longitude = loc.coords.longitude;
      }
    } catch (err) {
      console.warn('Could not get location for emergency trigger:', err);
    }

    console.log('[Emergency] Triggering alert with payload:', payload);
    const result = await dispatch(triggerEmergency(payload));
    if (result.error) {
      toast.error(result.payload || 'Could not trigger alert');
    } else {
      console.log('[Emergency] Trigger successful:', result.payload);
    }
  }

  async function handleTrigger() {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'TRIGGER EMERGENCY ALERT?\n\nThis will immediately notify your emergency contacts with your live location. Only use in real emergencies.\n\nClick OK to trigger, or Cancel to abort.'
      );
      if (!confirmed) return;
      await performEmergencyTrigger();
    } else {
      // Phase 8: replaced destructive Alert.alert with ConfirmDialog primitive
      setTriggerDialogVisible(true);
    }
  }

  async function handleConfirmTrigger() {
    setTriggerDialogVisible(false);
    await performEmergencyTrigger();
  }

  async function performEmergencyCancel(sessionId: string) {
    const result = await dispatch(cancelEmergency(sessionId));
    if (result.error) {
      toast.error(result.payload || 'Could not cancel alert');
    } else {
      console.log('[Emergency] Cancel successful');
    }
  }

  async function handleCancel() {
    const sessionId = emergency.sessionId;
    if (!sessionId) return;

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'CANCEL EMERGENCY ALERT?\n\nThis will stop the escalation and mark the alert as cancelled. Your contacts will see "alert cancelled — they are safe".\n\nClick OK to cancel, or Cancel to keep the alert active.'
      );
      if (!confirmed) return;
      await performEmergencyCancel(sessionId);
    } else {
      // Phase 8: replaced destructive Alert.alert with ConfirmDialog primitive
      setCancelDialogVisible(true);
    }
  }

  async function handleConfirmCancel() {
    setCancelDialogVisible(false);
    const sessionId = emergency.sessionId;
    if (!sessionId) return;
    await performEmergencyCancel(sessionId);
  }

  async function copyAcknowledgeLink() {
    const url = getAcknowledgeLink();
    if (!url) return;
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(url);
        Alert.alert('Copied!', 'Acknowledge link copied to clipboard.');
      } catch {
        Alert.alert('Acknowledge Link', url);
      }
    } else {
      Alert.alert('Acknowledge Link', url);
    }
  }

  function openAcknowledgePage() {
    const url = getAcknowledgeLink();
    if (url) Linking.openURL(url);
  }

  const attemptsByPriority = emergency.attempts.reduce((acc: any, attempt) => {
    if (!acc[attempt.priorityOrder]) acc[attempt.priorityOrder] = [];
    acc[attempt.priorityOrder].push(attempt);
    return acc;
  }, {});

  const priorityKeys = Object.keys(attemptsByPriority).sort((a, b) => Number(a) - Number(b));

  const gpsStatusText = {
    idle: '',
    connecting: 'Connecting GPS…',
    active: 'GPS active — location sharing',
    error: 'GPS error — location not sharing',
  }[gpsStatus];

  return (
    <View style={styles.container}>
      {/* Background gradient layers */}
      <View style={StyleSheet.absoluteFillObject}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: darkColors.background }]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradTop]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradBottom]} />
      </View>

      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={styles.glassCard}>
            <Text style={styles.headerTitle} accessibilityRole="header">Emergency Alert</Text>
            <Text style={styles.headerSubtitle}>
              Triggers multi-channel alerts (push, SMS, email, phone call) to your emergency contacts.
              Escalates every 30 seconds until someone acknowledges.
            </Text>
          </View>

          {emergency.error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger[400]} style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{emergency.error}</Text>
            </View>
          )}

          {!emergency.active && emergency.status !== 'ACKNOWLEDGED' && emergency.status !== 'CANCELLED' && (
            <TouchableOpacity
              style={[styles.triggerBtn, emergency.isTriggering && { opacity: 0.6 }]}
              onPress={handleTrigger}
              disabled={emergency.isTriggering} accessibilityRole="button"
            >
              {emergency.isTriggering ? (
                <ActivityIndicator color={darkColors.text} size="large" />
              ) : (
                <>
                  <Ionicons name="alert-circle" size={36} color={darkColors.text} style={{ marginBottom: 4 }} />
                  <Text style={styles.triggerBtnText}>TRIGGER EMERGENCY ALERT</Text>
                  <Text style={styles.triggerBtnSubtext}>Tap to notify all contacts</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {emergency.active && emergency.status === 'ACTIVE' && (
            <View style={styles.activeCard}>
              <View style={styles.activeHeader}>
                <View style={styles.pulseDot} />
                <Text style={styles.activeTitle}>ALERT ACTIVE</Text>
              </View>
              <Text style={styles.activeSince}>
                Triggered: {new Date(emergency.triggeredAt || '').toLocaleString()}
              </Text>
              {emergency.nextEscalationAt && (
                <Text style={styles.nextEscalation}>
                  Next escalation: {new Date(emergency.nextEscalationAt).toLocaleTimeString()}
                </Text>
              )}
              <Text style={styles.currentPriority}>
                Currently notifying: Priority {emergency.currentPriority}
              </Text>
              {gpsStatusText ? (
                <Text style={styles.gpsStatus}>{gpsStatusText}</Text>
              ) : null}

              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.linkBtn} onPress={copyAcknowledgeLink} accessibilityRole="button">
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="copy-outline" size={16} color={darkColors.text} style={{ marginRight: 6 }} />
                    <Text style={styles.linkBtnText}>Copy Link</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkBtn} onPress={openAcknowledgePage} accessibilityRole="button">
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="globe-outline" size={16} color={darkColors.text} style={{ marginRight: 6 }} />
                    <Text style={styles.linkBtnText}>Open Page</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.cancelBtn, emergency.isCancelling && { opacity: 0.5 }]}
                onPress={handleCancel}
                disabled={emergency.isCancelling} accessibilityRole="button"
              >
                {emergency.isCancelling ? (
                  <ActivityIndicator color={darkColors.text} />
                ) : (
                  <Text style={styles.cancelBtnText}>Cancel Alert (False Alarm)</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {emergency.status === 'ACKNOWLEDGED' && (
            <View style={styles.acknowledgedCard}>
              <Ionicons name="checkmark-circle-outline" size={40} color={colors.success[400]} style={{ marginBottom: 8 }} />
              <Text style={styles.acknowledgedTitle}>Alert Acknowledged</Text>
              <Text style={styles.acknowledgedText}>
                Your emergency contact has acknowledged the alert. Escalation has stopped.
                Your live location is still being shared.
              </Text>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => dispatch(clearEmergency())} accessibilityRole="button"
              >
                <Text style={styles.resetBtnText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}

          {emergency.status === 'CANCELLED' && (
            <View style={styles.cancelledCard}>
              <Ionicons name="checkmark-circle-outline" size={40} color={colors.success[400]} style={{ marginBottom: 8 }} />
              <Text style={styles.cancelledTitle}>Alert Cancelled</Text>
              <Text style={styles.cancelledText}>
                The emergency alert has been cancelled. Your contacts have been notified.
              </Text>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => dispatch(clearEmergency())} accessibilityRole="button"
              >
                <Text style={styles.resetBtnText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}

          {priorityKeys.length > 0 && (
            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>Escalation Progress</Text>
              {priorityKeys.map((priority) => {
                const attempts = attemptsByPriority[priority];
                const firstAttempt = attempts[0];
                const isCurrent = Number(priority) === emergency.currentPriority;
                return (
                  <View
                    key={priority}
                    style={[styles.priorityBlock, isCurrent && styles.priorityBlockCurrent]}
                  >
                    <View style={styles.priorityHeader}>
                      <Text style={styles.priorityLabel}>Priority {priority}</Text>
                      <Text style={styles.priorityName}>{firstAttempt.contactName}</Text>
                      {isCurrent && <Text style={styles.currentBadge}>● CURRENT</Text>}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Ionicons name="call-outline" size={14} color={darkColors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={styles.priorityPhone}>{firstAttempt.contactPhone}</Text>
                    </View>
                    <View style={styles.channelsRow}>
                      {attempts.map((a: any, i: number) => (
                        <View key={i} style={styles.channelChip}>
                          <Ionicons name={CHANNEL_ICONS[a.channel] || "mail-outline"} size={14} color={darkColors.textSecondary} style={{ marginRight: 4 }} />
                          <Text style={[styles.channelStatus, { color: STATUS_COLORS[a.status] || darkColors.textTertiary }]}>
                            {a.status}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {!emergency.active && emergency.status !== 'ACKNOWLEDGED' && emergency.status !== 'CANCELLED' && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>How escalation works</Text>
              <Text style={styles.infoText}>• Priority 1 contact notified immediately via all channels</Text>
              <Text style={styles.infoText}>• If no acknowledgement in 30s, escalates to Priority 2</Text>
              <Text style={styles.infoText}>• Continues every 30s until someone acknowledges</Text>
              <Text style={styles.infoText}>• Live location is shared automatically via tracking link</Text>
              <Text style={styles.infoText}>• Contact opens link → sees your location + can acknowledge</Text>
              <Text style={styles.infoText}>• You can cancel anytime if it was a false alarm</Text>
              <Text style={styles.infoText}>• Auto-expires after 30 minutes of no acknowledgement</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Phase 8: ConfirmDialog replaces destructive Alert.alert (trigger) */}
      <ConfirmDialog
        visible={triggerDialogVisible}
        title="Trigger Emergency Alert?"
        description="This will immediately notify your emergency contacts with your live location. Only use in real emergencies."
        confirmLabel="Trigger Alert"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmTrigger}
        onCancel={() => setTriggerDialogVisible(false)}
      />

      {/* Phase 8: ConfirmDialog replaces destructive Alert.alert (cancel) */}
      <ConfirmDialog
        visible={cancelDialogVisible}
        title="Cancel Emergency Alert?"
        description={'This will stop the escalation and mark the alert as cancelled. Your contacts will see "alert cancelled".'}
        confirmLabel="Cancel Alert"
        cancelLabel="Keep Alert Active"
        variant="danger"
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelDialogVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkColors.background },
gradTop: { top: 0, height: 300, backgroundColor: tints.dangerSubtle },
  gradBottom: { bottom: 0, height: 400, backgroundColor: tints.infoSubtle },
  glassCard: {
    backgroundColor: tints.glassCard,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    shadowColor: colors.neutral[950],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  headerTitle: { color: darkColors.text, fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  headerSubtitle: { color: darkColors.textSecondary, fontSize: 13, lineHeight: 18 },
  errorBox: {
    backgroundColor: tints.dangerErrorBg,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tints.dangerErrorBorder,
    marginBottom: 16,
  },
  errorText: { color: colors.danger[300], fontSize: 13, textAlign: 'center' },
  triggerBtn: {
    backgroundColor: colors.danger[500],
    borderRadius: 20,
    paddingVertical: 36,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: tints.dangerErrorBorder,
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  triggerBtnIcon: { fontSize: 48, marginBottom: 8 },
  triggerBtnText: { color: darkColors.text, fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
  triggerBtnSubtext: { color: tints.whiteBorderStrong, fontSize: 12, marginTop: 4 },
  activeCard: {
    backgroundColor: tints.glassCard,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: tints.dangerMedium,
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  activeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  pulseDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success[500], marginRight: 8, shadowColor: colors.success[500], shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 4 },
  activeTitle: { color: colors.success[500], fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  activeSince: { color: darkColors.textSecondary, fontSize: 12, marginBottom: 4 },
  nextEscalation: { color: colors.warning[400], fontSize: 12, marginBottom: 4 },
  currentPriority: { color: darkColors.text, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  gpsStatus: { color: darkColors.textSecondary, fontSize: 12, marginBottom: 16 },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  linkBtn: {
    flex: 1,
    backgroundColor: tints.glassCard,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    shadowColor: colors.neutral[950],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  linkBtnText: { color: darkColors.text, fontSize: 13, fontWeight: '600' },
  cancelBtn: {
    backgroundColor: tints.dangerErrorBg,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tints.dangerErrorBorder,
  },
  cancelBtnText: { color: colors.danger[300], fontSize: 14, fontWeight: 'bold' },
  acknowledgedCard: {
    backgroundColor: tints.successSubtle,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: tints.successMedium,
    alignItems: 'center',
    shadowColor: colors.success[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  acknowledgedIcon: { fontSize: 48, color: colors.success[500], marginBottom: 8 },
  acknowledgedTitle: { color: colors.success[500], fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  acknowledgedText: { color: darkColors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  cancelledCard: {
    backgroundColor: tints.glassCard,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: tints.whiteBorder,
    alignItems: 'center',
    shadowColor: colors.neutral[950],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  cancelledIcon: { fontSize: 48, color: darkColors.textTertiary, marginBottom: 8 },
  cancelledTitle: { color: darkColors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  cancelledText: { color: darkColors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  resetBtn: {
    backgroundColor: tints.glassCard,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    shadowColor: colors.neutral[950],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  resetBtnText: { color: darkColors.text, fontSize: 14, fontWeight: '600' },
  progressCard: {
    backgroundColor: tints.glassCard,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    shadowColor: colors.neutral[950],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  progressTitle: { color: colors.danger[500], fontSize: 13, fontWeight: 'bold', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  priorityBlock: {
    backgroundColor: tints.overlayStrong,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: tints.whiteSubtle,
  },
  priorityBlockCurrent: {
    borderColor: tints.dangerMedium,
    borderWidth: 2,
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  priorityHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  priorityLabel: { color: darkColors.textSecondary, fontSize: 11, fontWeight: 'bold', marginRight: 8 },
  priorityName: { color: darkColors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  currentBadge: { color: colors.danger[500], fontSize: 10, fontWeight: 'bold' },
  priorityPhone: { color: darkColors.textSecondary, fontSize: 12, marginBottom: 8 },
  channelsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tints.glassCard,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
  },
  channelIcon: { fontSize: 12, marginRight: 4 },
  channelStatus: { fontSize: 10, fontWeight: 'bold' },
  infoCard: {
    backgroundColor: tints.glassCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    shadowColor: colors.neutral[950],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  infoTitle: { color: colors.danger[500], fontSize: 12, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  infoText: { color: darkColors.textSecondary, fontSize: 12, lineHeight: 18 },
});
