import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import api from '../api/axios';
import * as Notifications from 'expo-notifications';
import { dispatchEmergencyAlert } from '../utils/emergencyFallback';
import * as Sms from 'expo-sms';
import { VoiceCommandService } from '../services/voiceCommandService';
import { CrashSoundDetectionService } from '../services/crashSoundDetectionService';

const COUNTDOWN_SECONDS = 10;

export default function CountdownScreen({ navigation, route }: any) {
  const { latitude, longitude, severity = 'Moderate', countdownSeconds } = route.params || {};
  const initialCountdown = countdownSeconds || (severity === 'Severe' ? 10 : 20);
  const contacts = useSelector((state: RootState) => state.contacts.list);
  const user = useSelector((state: RootState) => state.auth.user);

  const [secondsLeft, setSecondsLeft] = useState(initialCountdown);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  // Prevent Android back button from silently escaping the countdown
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => backHandler.remove();
  }, []);

  // Pulse animation for the big number
  useEffect(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 400, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    Vibration.vibrate(100);
  }, [secondsLeft]);

  const logIncident = useCallback(
    async (status: 'FALSE_ALARM' | 'ACTIVE', dispatchStatus?: Record<string, any>) => {
      try {
        const response = await api.post('/incidents', {
          type: 'AUTO',
          severity: status === 'FALSE_ALARM' ? 'NONE' : severity.toUpperCase(),
          status,
          occurredAt: new Date().toISOString(),
          latitude,
          longitude,
          description:
            status === 'FALSE_ALARM'
              ? 'Countdown cancelled by user false alarm'
              : 'Countdown reached zero emergency alert dispatched',
          alertDispatchStatus: dispatchStatus,
        });
        return response.data;
      } catch (err) {
        console.log('Failed to log incident:', err);
        return null;
      }
    },
    [severity, latitude, longitude],
  );

  const handleCancel = useCallback(
    async (method: 'BUTTON' | 'VOICE' = 'BUTTON') => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsCancelled(true);
      await logIncident('FALSE_ALARM');
      setTimeout(() => navigation.goBack(), 1200);
    },
    [logIncident, navigation],
  );

  const handleTimeout = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsDispatching(true);

    const dispatchContacts = (contacts || []).map((c: any) => ({
      name: c.name,
      phoneNumber: c.phoneNumber,
      email: c.email,
    }));

    // 1. Try sending SMS directly from the phone (100% Free)
    try {
      const isAvailable = await Sms.isAvailableAsync();
      if (isAvailable) {
        const phoneNumbers = dispatchContacts.map(c => c.phoneNumber);
        const messageBody = `ResQDrive ALERT: ${user?.fullName || 'Unknown'} may have been in a ${severity} accident. Location: https://www.google.com/maps?q=${latitude},${longitude}`;

        await Sms.sendSMSAsync(phoneNumbers, messageBody);
        console.log('SMS sent successfully via device SIM!');
      } else {
        console.log('SMS not available on this device');
      }
    } catch (err) {
      console.log('Device SMS failed, relying on backend fallback:', err);
    }

    // 2. Also fire the backend API for Push, Email, and Database logging
    let result;
    try {
      result = await dispatchEmergencyAlert(
        dispatchContacts,
        {
          userName: user?.fullName || 'Unknown Driver',
          userPhone: user?.phoneNumber || '',
          severity,
          latitude,
          longitude,
        },
        async () => {
          await api.post('/alert-dispatch', {
            userId: user?.id,
            userName: user?.fullName,
            latitude,
            longitude,
            severity,
            contacts: dispatchContacts,
          });
        },
      );
    } catch (err) {
      result = { mode: 'failed' };
    }

    const incident = await logIncident('ACTIVE', { dispatchMode: result.mode, smsSentViaDevice: true });

    // Instantly present local Emergency Push Notification on device
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 ResQDrive Emergency Alert',
          body: `Multi-channel emergency alert dispatched to contacts! Live GPS tracking active.`,
          sound: true,
          data: { mapsLink: `https://www.google.com/maps?q=${latitude},${longitude}`, severity },
        },
        trigger: null,
      });
    } catch (e) {
      console.log('Local emergency notification trigger failed:', e);
    }

    navigation.replace('SOS', {
      severity: severity.toLowerCase(),
      incidentId: incident?.id || null,
    });
  }, [contacts, user, severity, latitude, longitude, logIncident, navigation]);

  const cancelCallbackRef = useRef(handleCancel);
  const timeoutCallbackRef = useRef(handleTimeout);

  useEffect(() => {
    cancelCallbackRef.current = handleCancel;
    timeoutCallbackRef.current = handleTimeout;
  }, [handleCancel, handleTimeout]);

  useEffect(() => {
    // Release the microphone from crash detection so speech recognizer gets exclusive access
    console.log('[Countdown]: Stopping crash audio monitoring to free microphone for voice commands.');
    CrashSoundDetectionService.stopMonitoring();

    // Small delay to let the native mic resource fully release before starting speech recognition
    const startDelay = setTimeout(() => {
      VoiceCommandService.startListening();
    }, 600);

    VoiceCommandService.subscribeToCallbacks(
      () => {
        console.log('[Countdown Voice Command]: CANCEL action detected.');
        cancelCallbackRef.current('VOICE');
      },
      () => {
        console.log('[Countdown Voice Command]: SOS action detected. Bypassing countdown!');
        timeoutCallbackRef.current();
      },
      () => {},
      () => {},
      () => {}
    );

    return () => {
      clearTimeout(startDelay);
      // Stop voice, restart crash monitoring
      VoiceCommandService.stopListening();
      console.log('[Countdown]: Restarting crash audio monitoring.');
      CrashSoundDetectionService.startMonitoring();
    };
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev: number) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [handleTimeout]);

  if (isCancelled) {
    return (
      <SafeAreaView style={styles.cancelledContainer}>
        <View style={StyleSheet.absoluteFillObject}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0A0A0F' }]} />
          <View style={[StyleSheet.absoluteFillObject, styles.cancelledGrad]} />
        </View>
        <Animated.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', opacity: fadeAnim }}>
          <Text style={styles.cancelledIcon}>\u2705</Text>
          <Text style={styles.cancelledText}>Marked as false alarm</Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (isDispatching) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={StyleSheet.absoluteFillObject}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0A0A0F' }]} />
          <View style={[StyleSheet.absoluteFillObject, styles.gradTop]} />
          <View style={[StyleSheet.absoluteFillObject, styles.gradBottom]} />
        </View>
        <Animated.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', opacity: fadeAnim }}>
          <Text style={styles.dispatchingIcon}></Text>
          <Text style={styles.dispatchingText}>Sending emergency alert...</Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Background gradient layers */}
      <View style={StyleSheet.absoluteFillObject}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0A0A0F' }]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradTop]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradBottom]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradCenter]} />
      </View>

      <Animated.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, opacity: fadeAnim }}>
        <Text style={styles.warningLabel}>POSSIBLE ACCIDENT DETECTED</Text>

        <Animated.View style={[styles.numberCircle, { transform: [{ scale: pulseAnim }] }]}>
          <View style={[StyleSheet.absoluteFillObject, styles.numberCircleGrad]} />
          <Text style={styles.countdownNumber}>{secondsLeft}</Text>
        </Animated.View>

        <Text style={styles.subLabel}>
          Emergency alert will be sent automatically in {secondsLeft} second{secondsLeft !== 1 ? 's' : ''}
        </Text>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => handleCancel('BUTTON')}
          activeOpacity={0.85}
        >
          <Text style={styles.cancelBtnText}>I AM OK CANCEL</Text>
        </TouchableOpacity>

        <Text style={styles.voiceHint}>You can also say "I am OK" or "Cancel"</Text>

        {__DEV__ && (
          <View style={styles.devSimRow}>
            <TouchableOpacity
              style={styles.devSimBtn}
              onPress={() => VoiceCommandService.simulateSpeechInput('Cancel')}
            >
              <Text style={styles.devSimText}>🗣️ Simulate Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.devSimBtn, { borderColor: '#d32f2f' }]}
              onPress={() => VoiceCommandService.simulateSpeechInput('SOS')}
            >
              <Text style={[styles.devSimText, { color: '#ff1744' }]}>🗣️ Simulate SOS</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  gradTop: { top: 0, height: 400, backgroundColor: 'rgba(229, 57, 53, 0.08)' },
  gradBottom: { bottom: 0, height: 400, backgroundColor: 'rgba(229, 57, 53, 0.06)' },
  gradCenter: { top: '30%', height: 300, backgroundColor: 'rgba(229, 57, 53, 0.05)' },
  warningLabel: {
    color: '#FF8A80',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 40,
    textAlign: 'center',
  },
  numberCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 40,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 138, 128, 0.3)',
  },
  numberCircleGrad: {
    borderRadius: 100,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  countdownNumber: {
    fontSize: 96,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subLabel: {
    color: 'rgba(255, 205, 210, 0.8)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  cancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 20,
    paddingHorizontal: 48,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cancelBtnText: {
    color: '#0A0A0F',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  voiceHint: {
    color: 'rgba(255, 138, 128, 0.5)',
    fontSize: 13,
    textAlign: 'center',
  },
  dispatchingIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  dispatchingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelledContainer: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  cancelledGrad: { top: 0, height: '100%', backgroundColor: 'rgba(0, 230, 118, 0.06)' },
  cancelledIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  cancelledText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  devSimRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  devSimBtn: {
    backgroundColor: '#1c1c2e',
    borderColor: '#3e3e3e',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  devSimText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
