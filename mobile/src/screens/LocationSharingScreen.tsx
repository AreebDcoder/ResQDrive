import { API_URL } from '../api/axios';
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
import api, { getCurrentServerUrl } from '../api/axios';
import { connectSocket, disconnectSocket, emitLocationUpdate } from '../services/socketService';
import { useToast } from '../components/ui/Toast';
import { colors, darkColors, tints } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FAST_INTERVAL_MS = 5000;
const SLOW_INTERVAL_MS = 30000;
const BACKOFF_AFTER_MS = 10 * 60 * 1000;

export default function LocationSharingScreen({ navigation }: { navigation: any }) {
  const toast = useToast();
  const insets = useSafeAreaInsets();
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
      : getCurrentServerUrl();
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
        <ActivityIndicator color={colors.danger[500]} size="large" />
        <Text style={styles.loadingText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Checking session status…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}>
      {/* ── Intro Card ── */}
      <View style={styles.card}>
        <Text style={styles.title} accessibilityRole="header" allowFontScaling={true} maxFontSizeMultiplier={1.5}>Real-Time Location Sharing</Text>
        <Text style={styles.subtitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
          Share your live location with emergency contacts via a simple link.
          No app install required for them.
        </Text>
      </View>

      {/* ── Error ── */}
      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="warning-outline" size={24} color={darkColors.text} />
          <Text style={styles.errorText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{error}</Text>
        </View>
      )}

      {/* ── Permission Warning ── */}
      {permissionDenied && (
        <View style={styles.warnBox}>
          <Ionicons name="lock-closed-outline" size={24} color={darkColors.text} />
          <Text style={styles.warnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
            Location permission denied. Please enable it in your device settings to share your location.
          </Text>
        </View>
      )}

      {/* ── Active Session Card ── */}
      {session && (
        <View style={styles.activeCard}>
          <View style={styles.activeHeader}>
            <View style={styles.liveDot} />
            <Text style={styles.activeTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>LIVE — Sharing</Text>
          </View>
          <Text style={styles.activeSince} allowFontScaling={true} maxFontSizeMultiplier={1.5}>⏱️ Started: {new Date(session.startedAt).toLocaleString()}</Text>
          <Text style={styles.socketStatus} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Socket: {socketStatus === 'connected' ? 'Connected' : socketStatus === 'connecting' ? 'Connecting…' : 'Disconnected'}
          </Text>
          {lastSent ? (
            <Text style={styles.lastUpdate} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Last GPS ping: {lastSent}</Text>
          ) : (
            <Text style={styles.lastUpdate} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Waiting for first GPS fix…</Text>
          )}

          <TouchableOpacity style={styles.linkBtn} onPress={copyShareLink} accessibilityRole="button">
            <Text style={styles.linkBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Copy Share Link</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtnSecondary} onPress={openInBrowser} accessibilityRole="button">
            <Text style={styles.linkBtnSecondaryText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Open Tracking Page</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.stopBtn, isStopping && { opacity: 0.5 }]}
            onPress={handleStop}
            disabled={isStopping} accessibilityRole="button"
          >
            {isStopping ? (
              <ActivityIndicator color={darkColors.text} />
            ) : (
              <Text style={styles.stopBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>⏹️ Stop Sharing</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── Start Button ── */}
      {!session && (
        <TouchableOpacity
          style={[styles.startBtn, isStarting && { opacity: 0.5 }]}
          onPress={handleStart}
          disabled={isStarting} accessibilityRole="button"
        >
          {isStarting ? (
            <ActivityIndicator color={darkColors.text} />
          ) : (
            <Text style={styles.startBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Start Live Location Sharing</Text>
          )}
        </TouchableOpacity>
      )}

      {/* ── Info Card ── */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>ℹ️ How it works</Text>
        <Text style={styles.infoText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>• Your phone sends GPS coordinates every 5 seconds</Text>
        <Text style={styles.infoText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>• After 10 minutes, backs off to every 30 seconds (battery saver)</Text>
        <Text style={styles.infoText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>• Emergency contacts open the link in any browser</Text>
        <Text style={styles.infoText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>• They see a live map with your moving location + trail</Text>
        <Text style={styles.infoText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>• Session auto-expires after 2 hours of inactivity</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  center: {
    flex: 1,
    backgroundColor: darkColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: darkColors.textSecondary,
    marginTop: 12,
  },
  card: {
    backgroundColor: tints.glassCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    shadowColor: darkColors.background,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    color: darkColors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: darkColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tints.dangerErrorBg,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tints.dangerErrorBorder,
    marginBottom: 16,
  },
  errorEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    color: colors.danger[300],
    fontSize: 13,
    textAlign: 'center',
    flex: 1,
  },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: tints.warningSubtle,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tints.warningMedium,
    marginBottom: 16,
  },
  warnEmoji: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  warnText: {
    color: colors.warning[300],
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  activeCard: {
    backgroundColor: tints.glassCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: tints.successMedium,
    shadowColor: colors.success[500],
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
    backgroundColor: colors.success[500],
    marginRight: 8,
    shadowColor: colors.success[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  activeTitle: {
    color: colors.success[500],
    fontSize: 16,
    fontWeight: '700',
  },
  activeSince: {
    color: darkColors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  socketStatus: {
    color: darkColors.textTertiary,
    fontSize: 12,
    marginBottom: 4,
  },
  lastUpdate: {
    color: darkColors.textTertiary,
    fontSize: 12,
    marginBottom: 16,
  },
  linkBtn: {
    backgroundColor: tints.infoSubtle,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: tints.infoMedium,
  },
  linkBtnText: {
    color: colors.info[500],
    fontSize: 14,
    fontWeight: '700',
  },
  linkBtnSecondary: {
    backgroundColor: tints.whiteSubtle,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
  },
  linkBtnSecondaryText: {
    color: colors.danger[500],
    fontSize: 14,
    fontWeight: '700',
  },
  stopBtn: {
    backgroundColor: tints.dangerErrorBg,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tints.dangerErrorBorder,
  },
  stopBtnText: {
    color: darkColors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  startBtn: {
    backgroundColor: colors.danger[500],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  startBtnText: {
    color: darkColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: tints.glassCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
  },
  infoTitle: {
    color: colors.danger[500],
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    color: darkColors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
});