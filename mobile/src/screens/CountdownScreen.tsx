import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  SafeAreaView,
  BackHandler,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import api from '../api/axios';
import { dispatchEmergencyAlert } from '../utils/emergencyFallback';

const COUNTDOWN_SECONDS = 10;

export default function CountdownScreen({ navigation, route }: any) {
  const { latitude, longitude, severity = 'Moderate' } = route.params || {};
  const contacts = useSelector((state: RootState) => state.contacts.list);
  const user = useSelector((state: RootState) => state.auth.user);

  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        await api.post('/incidents', {
          type: 'AUTO',
          severity: status === 'FALSE_ALARM' ? 'NONE' : severity.toUpperCase(),
          status,
          occurredAt: new Date().toISOString(),
          latitude,
          longitude,
          description:
            status === 'FALSE_ALARM'
              ? 'Countdown cancelled by user — false alarm'
              : 'Countdown reached zero — emergency alert dispatched',
          alertDispatchStatus: dispatchStatus,
        });
      } catch (err) {
        console.log('Failed to log incident:', err);
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

    await logIncident('ACTIVE', { dispatchMode: result.mode });

    navigation.replace('Home');
  }, [contacts, user, severity, latitude, longitude, logIncident, navigation]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
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
        <Text style={styles.cancelledIcon}>✅</Text>
        <Text style={styles.cancelledText}>Marked as false alarm</Text>
      </SafeAreaView>
    );
  }

  if (isDispatching) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.dispatchingIcon}>📡</Text>
        <Text style={styles.dispatchingText}>Sending emergency alert...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.warningLabel}>POSSIBLE ACCIDENT DETECTED</Text>

      <Animated.View style={[styles.numberCircle, { transform: [{ scale: pulseAnim }] }]}>
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
        <Text style={styles.cancelBtnText}>I AM OK — CANCEL</Text>
      </TouchableOpacity>

      <Text style={styles.voiceHint}>💬 You can also say "I am OK" or "Cancel"</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  warningLabel: {
    color: '#ff8a80',
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
    backgroundColor: '#d32f2f',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#d32f2f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 10,
  },
  countdownNumber: {
    fontSize: 96,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subLabel: {
    color: '#ffcdd2',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  cancelBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 20,
    paddingHorizontal: 48,
    borderRadius: 16,
    marginBottom: 24,
  },
  cancelBtnText: {
    color: '#1a0000',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  voiceHint: {
    color: '#ff8a8080',
    fontSize: 13,
    textAlign: 'center',
  },
  dispatchingIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  dispatchingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelledContainer: {
    flex: 1,
    backgroundColor: '#0d2818',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelledIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  cancelledText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});