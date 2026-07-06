import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Linking, Alert, Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import {
  triggerEmergency, cancelEmergency, fetchEmergencyStatus, clearEmergency,
} from '../store/slices/emergencySlice';
import { connectSocket, disconnectSocket, emitLocationUpdate } from '../services/socketService';

const POLL_INTERVAL_MS = 5000;

const CHANNEL_ICONS: Record<string, string> = {
  PUSH: '📱',
  SMS: '💬',
  EMAIL: '📧',
  PHONE_CALL: '📞',
};

const STATUS_COLORS: Record<string, string> = {
  SENT: '#22c55e',
  DELIVERED: '#22c55e',
  ACKNOWLEDGED: '#3b82f6',
  PENDING: '#f59e0b',
  FAILED: '#ef4444',
};

export default function EmergencyNotificationScreen({ navigation }: { navigation: any }) {
  const dispatch = useDispatch<any>();
  const emergency = useSelector((state: RootState) => state.emergency);
  const [pollTimer, setPollTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const trackingSessionIdRef = useRef<string | null>(null);

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
    const baseUrl = Platform.OS === 'web'
      ? 'http://localhost:3000'
      : (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000');
    return `${baseUrl}${emergency.acknowledgeUrl}`;
  }

  async function handleTrigger() {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(
          'TRIGGER EMERGENCY ALERT?\n\nThis will immediately notify your emergency contacts with your live location. Only use in real emergencies.\n\nClick OK to trigger, or Cancel to abort.'
        )
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Trigger Emergency Alert?',
            'This will immediately notify your emergency contacts with your live location. Only use in real emergencies.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Trigger Alert', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) return;

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
      Alert.alert('Failed', result.payload || 'Could not trigger alert');
    } else {
      console.log('[Emergency] Trigger successful:', result.payload);
    }
  }

  async function handleCancel() {
    const sessionId = emergency.sessionId;
    if (!sessionId) return;

    const confirmed = Platform.OS === 'web'
      ? window.confirm(
          'CANCEL EMERGENCY ALERT?\n\nThis will stop the escalation and mark the alert as cancelled. Your contacts will see "alert cancelled — they are safe".\n\nClick OK to cancel, or Cancel to keep the alert active.'
        )
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Cancel Emergency Alert?',
            'This will stop the escalation and mark the alert as cancelled. Your contacts will see "alert cancelled".',
            [
              { text: 'Keep Alert Active', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Cancel Alert', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) return;

    const result = await dispatch(cancelEmergency(sessionId));
    if (result.error) {
      Alert.alert('Failed', result.payload || 'Could not cancel alert');
    } else {
      console.log('[Emergency] Cancel successful');
    }
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
    connecting: '🟡 Connecting GPS…',
    active: '🟢 GPS active — location sharing',
    error: '🔴 GPS error — location not sharing',
  }[gpsStatus];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Emergency Alert</Text>
        <Text style={styles.headerSubtitle}>
          Triggers multi-channel alerts (push, SMS, email, phone call) to your emergency contacts.
          Escalates every 30 seconds until someone acknowledges.
        </Text>
      </View>

      {emergency.error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{emergency.error}</Text>
        </View>
      )}

      {!emergency.active && emergency.status !== 'ACKNOWLEDGED' && emergency.status !== 'CANCELLED' && (
        <TouchableOpacity
          style={[styles.triggerBtn, emergency.isTriggering && { opacity: 0.6 }]}
          onPress={handleTrigger}
          disabled={emergency.isTriggering}
        >
          {emergency.isTriggering ? (
            <ActivityIndicator color="#ffffff" size="large" />
          ) : (
            <>
              <Text style={styles.triggerBtnIcon}>🚨</Text>
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
            <TouchableOpacity style={styles.linkBtn} onPress={copyAcknowledgeLink}>
              <Text style={styles.linkBtnText}>📋 Copy Link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={openAcknowledgePage}>
              <Text style={styles.linkBtnText}>🌐 Open Page</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.cancelBtn, emergency.isCancelling && { opacity: 0.5 }]}
            onPress={handleCancel}
            disabled={emergency.isCancelling}
          >
            {emergency.isCancelling ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.cancelBtnText}>Cancel Alert (False Alarm)</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {emergency.status === 'ACKNOWLEDGED' && (
        <View style={styles.acknowledgedCard}>
          <Text style={styles.acknowledgedIcon}>✓</Text>
          <Text style={styles.acknowledgedTitle}>Alert Acknowledged</Text>
          <Text style={styles.acknowledgedText}>
            Your emergency contact has acknowledged the alert. Escalation has stopped.
            Your live location is still being shared.
          </Text>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => dispatch(clearEmergency())}
          >
            <Text style={styles.resetBtnText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {emergency.status === 'CANCELLED' && (
        <View style={styles.cancelledCard}>
          <Text style={styles.cancelledIcon}>✓</Text>
          <Text style={styles.cancelledTitle}>Alert Cancelled</Text>
          <Text style={styles.cancelledText}>
            The emergency alert has been cancelled. Your contacts have been notified.
          </Text>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => dispatch(clearEmergency())}
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
                <Text style={styles.priorityPhone}>📞 {firstAttempt.contactPhone}</Text>
                <View style={styles.channelsRow}>
                  {attempts.map((a: any, i: number) => (
                    <View key={i} style={styles.channelChip}>
                      <Text style={styles.channelIcon}>{CHANNEL_ICONS[a.channel] || '📨'}</Text>
                      <Text style={[styles.channelStatus, { color: STATUS_COLORS[a.status] || '#888' }]}>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  headerCard: { backgroundColor: '#1e1e1e', borderRadius: 12, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#2e2e2e' },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  headerSubtitle: { color: '#888888', fontSize: 13, lineHeight: 18 },
  errorBox: { backgroundColor: '#3a1313', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#d32f2f', marginBottom: 16 },
  errorText: { color: '#ff8a80', fontSize: 13, textAlign: 'center' },
  triggerBtn: {
    backgroundColor: '#d32f2f', borderRadius: 16, paddingVertical: 36, alignItems: 'center',
    marginBottom: 16, borderWidth: 2, borderColor: '#ff5252',
    shadowColor: '#d32f2f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  triggerBtnIcon: { fontSize: 48, marginBottom: 8 },
  triggerBtnText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
  triggerBtnSubtext: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },
  activeCard: { backgroundColor: '#1e1e1e', borderRadius: 12, padding: 20, marginBottom: 16, borderWidth: 2, borderColor: '#d32f2f' },
  activeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  pulseDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', marginRight: 8 },
  activeTitle: { color: '#22c55e', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  activeSince: { color: '#cccccc', fontSize: 12, marginBottom: 4 },
  nextEscalation: { color: '#f59e0b', fontSize: 12, marginBottom: 4 },
  currentPriority: { color: '#ffffff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  gpsStatus: { color: '#999999', fontSize: 12, marginBottom: 16 },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  linkBtn: { flex: 1, backgroundColor: '#2a2a2a', paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#444' },
  linkBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  cancelBtn: { backgroundColor: '#3a1313', paddingVertical: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#d32f2f' },
  cancelBtnText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  acknowledgedCard: { backgroundColor: '#0f2917', borderRadius: 12, padding: 24, marginBottom: 16, borderWidth: 2, borderColor: '#22c55e', alignItems: 'center' },
  acknowledgedIcon: { fontSize: 48, color: '#22c55e', marginBottom: 8 },
  acknowledgedTitle: { color: '#22c55e', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  acknowledgedText: { color: '#cccccc', fontSize: 13, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  cancelledCard: { backgroundColor: '#1e1e1e', borderRadius: 12, padding: 24, marginBottom: 16, borderWidth: 2, borderColor: '#6b7280', alignItems: 'center' },
  cancelledIcon: { fontSize: 48, color: '#6b7280', marginBottom: 8 },
  cancelledTitle: { color: '#cccccc', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  cancelledText: { color: '#888888', fontSize: 13, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  resetBtn: { backgroundColor: '#2a2a2a', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  resetBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  progressCard: { backgroundColor: '#1e1e1e', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#2e2e2e' },
  progressTitle: { color: '#d32f2f', fontSize: 13, fontWeight: 'bold', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  priorityBlock: { backgroundColor: '#0f0f0f', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#2a2a2a' },
  priorityBlockCurrent: { borderColor: '#d32f2f', borderWidth: 2 },
  priorityHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  priorityLabel: { color: '#888888', fontSize: 11, fontWeight: 'bold', marginRight: 8 },
  priorityName: { color: '#ffffff', fontSize: 14, fontWeight: '600', flex: 1 },
  currentBadge: { color: '#d32f2f', fontSize: 10, fontWeight: 'bold' },
  priorityPhone: { color: '#cccccc', fontSize: 12, marginBottom: 8 },
  channelsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  channelChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, borderWidth: 1, borderColor: '#2a2a2a' },
  channelIcon: { fontSize: 12, marginRight: 4 },
  channelStatus: { fontSize: 10, fontWeight: 'bold' },
  infoCard: { backgroundColor: '#1a1a1a', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#2a2a2a' },
  infoTitle: { color: '#d32f2f', fontSize: 12, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  infoText: { color: '#888888', fontSize: 12, lineHeight: 18 },
});