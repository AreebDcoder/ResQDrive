// ═══════════════════════════════════════════════════════════════
// ResQDrive v2 — LOCATION SHARING SCREEN (Modernized)
// All imports, logic, state, handlers preserved identically.
// Only JSX structure + StyleSheet updated: dark glassmorphism theme.
// ═══════════════════════════════════════════════════════════════
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
        <ActivityIndicator color="#E53935" size="large" />
        <Text style={styles.loadingText}>Checking session status…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* ── Intro Card ── */}
      <View style={styles.card}>
        <Text style={styles.title}>📍 Real-Time Location Sharing</Text>
        <Text style={styles.subtitle}>
          Share your live location with emergency contacts via a simple link.
          No app install required for them.
        </Text>
      </View>

      {/* ── Error ── */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* ── Permission Warning ── */}
      {permissionDenied && (
        <View style={styles.warnBox}>
          <Text style={styles.warnEmoji}>🔒</Text>
          <Text style={styles.warnText}>
            Location permission denied. Please enable it in your device settings to share your location.
          </Text>
        </View>
      )}

      {/* ── Active Session Card ── */}
      {session && (
        <View style={styles.activeCard}>
          <View style={styles.activeHeader}>
            <View style={styles.liveDot} />
            <Text style={styles.activeTitle}>LIVE — Sharing</Text>
          </View>
          <Text style={styles.activeSince}>⏱️ Started: {new Date(session.startedAt).toLocaleString()}</Text>
          <Text style={styles.socketStatus}>
            🔌 Socket: {socketStatus === 'connected' ? '🟢 Connected' : socketStatus === 'connecting' ? '🟡 Connecting…' : '🔴 Disconnected'}
          </Text>
          {lastSent ? (
            <Text style={styles.lastUpdate}>📡 Last GPS ping: {lastSent}</Text>
          ) : (
            <Text style={styles.lastUpdate}>📡 Waiting for first GPS fix…</Text>
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
              <Text style={styles.stopBtnText}>⏹️ Stop Sharing</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── Start Button ── */}
      {!session && (
        <TouchableOpacity
          style={[styles.startBtn, isStarting && { opacity: 0.5 }]}
          onPress={handleStart}
          disabled={isStarting}
        >
          {isStarting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.startBtnText}>🚀 Start Live Location Sharing</Text>
          )}
        </TouchableOpacity>
      )}

      {/* ── Info Card ── */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ How it works</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  center: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#A0A0B8',
    marginTop: 12,
  },
  card: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#A0A0B8',
    fontSize: 14,
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 23, 68, 0.12)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.3)',
    marginBottom: 16,
  },
  errorEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    color: '#FF8A80',
    fontSize: 13,
    textAlign: 'center',
    flex: 1,
  },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 167, 38, 0.25)',
    marginBottom: 16,
  },
  warnEmoji: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  warnText: {
    color: '#FFB74D',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  activeCard: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00E676',
    marginRight: 8,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  activeTitle: {
    color: '#00E676',
    fontSize: 16,
    fontWeight: '700',
  },
  activeSince: {
    color: '#A0A0B8',
    fontSize: 12,
    marginBottom: 4,
  },
  socketStatus: {
    color: '#6B6B80',
    fontSize: 12,
    marginBottom: 4,
  },
  lastUpdate: {
    color: '#6B6B80',
    fontSize: 12,
    marginBottom: 16,
  },
  linkBtn: {
    backgroundColor: 'rgba(41, 121, 255, 0.1)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(41, 121, 255, 0.25)',
  },
  linkBtnText: {
    color: '#2979FF',
    fontSize: 14,
    fontWeight: '700',
  },
  linkBtnSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  linkBtnSecondaryText: {
    color: '#E53935',
    fontSize: 14,
    fontWeight: '700',
  },
  stopBtn: {
    backgroundColor: 'rgba(255, 23, 68, 0.12)',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.3)',
  },
  stopBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  startBtn: {
    backgroundColor: '#E53935',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: 'rgba(28, 28, 46, 0.4)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  infoTitle: {
    color: '#E53935',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    color: '#A0A0B8',
    fontSize: 13,
    lineHeight: 20,
  },
});