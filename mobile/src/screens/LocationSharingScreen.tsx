import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Linking, Alert, Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import api from '../api/axios';
import { connectSocket, disconnectSocket, emitLocationUpdate } from '../services/socketService';

const FAST_INTERVAL_MS = 5000;
const SLOW_INTERVAL_MS = 30000;
const BACKOFF_AFTER_MS = 10 * 60 * 1000;

export default function LocationSharingScreen({ navigation }: { navigation: any }) {
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [socketStatus, setSocketStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected'>('idle');
  const [permissionDenied, setPermissionDenied] = useState(false);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const backoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    fetchStatus();
    return () => {
      stopLocationTracking();
    };
  }, []);

  async function stopLocationTracking() {
    if (subscriptionRef.current) {
      try {
        await subscriptionRef.current.remove();
      } catch (err) {
        console.warn('[LocationSharing] Subscription.remove() failed (web shim bug) — ignoring:', err);
      }
      subscriptionRef.current = null;
    }
    if (backoffTimerRef.current !== null) {
      clearTimeout(backoffTimerRef.current);
      backoffTimerRef.current = null;
    }
    sessionIdRef.current = null;
    try {
      disconnectSocket();
    } catch (err) {
      console.warn('[LocationSharing] disconnectSocket failed — ignoring:', err);
    }
    setSocketStatus('idle');
  }

  async function startLocationTracking(sessionId: string) {
    sessionIdRef.current = sessionId;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setPermissionDenied(true);
      Alert.alert('Permission required', 'Location permission is needed to share your live location.');
      return;
    }
    setPermissionDenied(false);

    setSocketStatus('connecting');
    try {
      await connectSocket();
      setSocketStatus('connected');
    } catch (err) {
      console.error('[LocationSharing] Socket connect failed:', err);
      setSocketStatus('disconnected');
    }

    const sendLocation = (loc: Location.LocationObject) => {
      if (sessionIdRef.current !== sessionId) return;
      emitLocationUpdate(sessionId, loc.coords.latitude, loc.coords.longitude);
      setLastSent(new Date().toLocaleTimeString());
    };

    subscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: FAST_INTERVAL_MS,
        distanceInterval: 0,
      },
      sendLocation,
    );

    backoffTimerRef.current = setTimeout(() => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: SLOW_INTERVAL_MS,
          distanceInterval: 0,
        },
        sendLocation,
      ).then((sub) => {
        subscriptionRef.current = sub;
      });
    }, BACKOFF_AFTER_MS);
  }

  async function fetchStatus() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/location-sharing/status');
      if (res.data.active) {
        setSession(res.data);
        startLocationTracking(res.data.sessionId);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load status');
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    setIsStarting(true);
    setError(null);
    try {
      const res = await api.post('/location-sharing/start', {});
      setSession(res.data);
      startLocationTracking(res.data.sessionId);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to start session');
    } finally {
      setIsStarting(false);
    }
  }

  async function handleStop() {
    if (!session) return;
    setIsStopping(true);
    try {
      await api.post(`/location-sharing/${session.sessionId}/stop`, {});
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to stop session on server, but tracking stopped locally');
    } finally {
      await stopLocationTracking();
      setSession(null);
      setLastSent(null);
      setIsStopping(false);
    }
  }

  function getShareLink() {
    if (!session) return '';
    const baseUrl = Platform.OS === 'web'
      ? 'http://localhost:3000'
      : (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000');
    return `${baseUrl}${session.shareUrl}`;
  }

  async function copyShareLink() {
    const fullUrl = getShareLink();
    if (!fullUrl) return;
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(fullUrl);
        Alert.alert('Copied!', 'Share link copied to clipboard.');
      } catch {
        Alert.alert('Share Link', fullUrl);
      }
    } else {
      Alert.alert('Share Link', fullUrl);
    }
  }

  function openInBrowser() {
    const fullUrl = getShareLink();
    if (fullUrl) Linking.openURL(fullUrl);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#d32f2f" size="large" />
        <Text style={styles.loadingText}>Checking session status…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View style={styles.card}>
        <Text style={styles.title}>Real-Time Location Sharing</Text>
        <Text style={styles.subtitle}>
          Share your live location with emergency contacts via a simple link.
          No app install required for them.
        </Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {permissionDenied && (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>
            ⚠️ Location permission denied. Please enable it in your device settings to share your location.
          </Text>
        </View>
      )}

      {session && (
        <View style={styles.activeCard}>
          <View style={styles.activeHeader}>
            <View style={styles.liveDot} />
            <Text style={styles.activeTitle}>LIVE — Sharing</Text>
          </View>
          <Text style={styles.activeSince}>Started: {new Date(session.startedAt).toLocaleString()}</Text>
          <Text style={styles.socketStatus}>
            Socket: {socketStatus === 'connected' ? '🟢 Connected' : socketStatus === 'connecting' ? '🟡 Connecting…' : '🔴 Disconnected'}
          </Text>
          {lastSent ? (
            <Text style={styles.lastUpdate}>Last GPS ping: {lastSent}</Text>
          ) : (
            <Text style={styles.lastUpdate}>Waiting for first GPS fix…</Text>
          )}

          <TouchableOpacity style={styles.linkBtn} onPress={copyShareLink}>
            <Text style={styles.linkBtnText}>📋 Copy Share Link</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtnSecondary} onPress={openInBrowser}>
            <Text style={styles.linkBtnSecondaryText}>🌐 Open Tracking Page</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.stopBtn, isStopping && { opacity: 0.5 }]}
            onPress={handleStop}
            disabled={isStopping}
          >
            {isStopping ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.stopBtnText}>Stop Sharing</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {!session && (
        <TouchableOpacity
          style={[styles.startBtn, isStarting && { opacity: 0.5 }]}
          onPress={handleStart}
          disabled={isStarting}
        >
          {isStarting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.startBtnText}>Start Live Location Sharing</Text>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works</Text>
        <Text style={styles.infoText}>• Your phone sends GPS coordinates every 5 seconds</Text>
        <Text style={styles.infoText}>• After 10 minutes, backs off to every 30 seconds (battery saver)</Text>
        <Text style={styles.infoText}>• Emergency contacts open the link in any browser</Text>
        <Text style={styles.infoText}>• They see a live map with your moving location + trail</Text>
        <Text style={styles.infoText}>• Session auto-expires after 2 hours of inactivity</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  center: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: '#888888', marginTop: 12 },
  card: { backgroundColor: '#1e1e1e', borderRadius: 12, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#2e2e2e' },
  title: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#888888', fontSize: 14, lineHeight: 20 },
  errorBox: { backgroundColor: '#3a1313', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#d32f2f', marginBottom: 16 },
  errorText: { color: '#ff8a80', fontSize: 13, textAlign: 'center' },
  warnBox: { backgroundColor: '#3a2a13', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#f59e0b', marginBottom: 16 },
  warnText: { color: '#fbbf24', fontSize: 13 },
  activeCard: { backgroundColor: '#1e1e1e', borderRadius: 12, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#d32f2f' },
  activeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e', marginRight: 8 },
  activeTitle: { color: '#22c55e', fontSize: 16, fontWeight: 'bold' },
  activeSince: { color: '#cccccc', fontSize: 12, marginBottom: 4 },
  socketStatus: { color: '#999999', fontSize: 12, marginBottom: 4 },
  lastUpdate: { color: '#888888', fontSize: 12, marginBottom: 16 },
  linkBtn: { backgroundColor: '#2a2a2a', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#444' },
  linkBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  linkBtnSecondary: { backgroundColor: '#1e1e1e', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#2e2e2e' },
  linkBtnSecondaryText: { color: '#d32f2f', fontSize: 14, fontWeight: '600' },
  stopBtn: { backgroundColor: '#3a1313', paddingVertical: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#d32f2f' },
  stopBtnText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  startBtn: { backgroundColor: '#d32f2f', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  startBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  infoCard: { backgroundColor: '#1a1a1a', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#2a2a2a' },
  infoTitle: { color: '#d32f2f', fontSize: 12, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  infoText: { color: '#888888', fontSize: 12, lineHeight: 18 },
});