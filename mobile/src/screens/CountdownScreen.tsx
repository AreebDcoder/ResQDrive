import { hapticLight, hapticSuccess } from '../utils/haptics';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  AccessibilityInfo,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { fetchContactsSuccess } from '../store/slices/contactsSlice';
import { useCreateIncidentMutation } from '../store/api/incidentsApi';
import {
  useTriggerEmergencyMutation,
  useDispatchAlertMutation,
} from '../store/api/emergencyApi';
import api from '../api/axios';
import * as Notifications from 'expo-notifications';
import { dispatchEmergencyAlert } from '../utils/emergencyFallback';
import * as Sms from 'expo-sms';
import * as Location from 'expo-location';
import { VoiceCommandService } from '../services/voiceCommandService';
import { CrashSoundDetectionService } from '../services/crashSoundDetectionService';
import { sendBulkBackgroundSMS } from '../utils/directSms';
import { MultiModalFusionService } from '../services/multiModalFusionService';
import { colors, darkColors, tints } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { makeDirectPhoneCall } from '../utils/directCall';

const COUNTDOWN_SECONDS = 10;

export default function CountdownScreen({ navigation, route }: any) {
  const dispatch = useDispatch();
  const { latitude, longitude, severity = 'Moderate', countdownSeconds } = route.params || {};
  const initialCountdown = countdownSeconds || (severity === 'Severe' ? 10 : 20);
  const contacts = useSelector((state: RootState) => state.contacts.list);
  const user = useSelector((state: RootState) => state.auth.user);

  // Batch 11: Migrated emergency-dispatch mutations to RTK Query.
  // These are component-level hooks invoked inside handleTimeout (async callback).
  // Note: the api.get('/emergency-contacts') one-off fetch in handleTimeout
  // is intentionally kept as `api.get` — RTK Query hooks can't be called
  // conditionally inside callbacks, and we need the LATEST contacts before dispatch.
  const [createIncident] = useCreateIncidentMutation();
  const [triggerEmergency] = useTriggerEmergencyMutation();
  const [dispatchAlert] = useDispatchAlertMutation();

  const [secondsLeft, setSecondsLeft] = useState(initialCountdown);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [dispatchComplete, setDispatchComplete] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  const [backendChannels, setBackendChannels] = useState<any>(null);
  const [dispatchStatus, setDispatchStatus] = useState<{
    backend: 'pending' | 'sending' | 'sent' | 'failed';
    sms: 'pending' | 'sending' | 'sent' | 'sent-via-device' | 'failed';
    push: 'pending' | 'sent' | 'failed';
    email: 'pending' | 'sent' | 'failed';
    whatsapp: 'pending' | 'sent' | 'failed';
    module68: 'pending' | 'triggered' | 'failed';
    incident: 'pending' | 'logged' | 'failed';
  }>({
    backend: 'pending', sms: 'pending', push: 'pending',
    email: 'pending', whatsapp: 'pending', module68: 'pending', incident: 'pending',
  });
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // CRITICAL FIX: Guard ref to prevent duplicate emergency dispatch.
  // When handleTimeout runs, it updates Redux state (contacts), which
  // causes handleTimeout to be recreated, which causes the interval
  // useEffect to re-run, which creates a new interval that immediately
  // fires handleTimeout again — infinite loop of SMS/WhatsApp/Email.
  const hasDispatchedRef = useRef(false);

  // Batch 7 Phase 4: Respect Reduce Motion accessibility setting
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Skip decorative entrance fade-in when Reduce Motion is enabled
    if (reduceMotion) {
      fadeAnim.setValue(1);
      return;
    }
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim, reduceMotion]);

  // Refresh emergency contacts list from backend on mount to guarantee fresh priority order
  useEffect(() => {
    const syncContacts = async () => {
      try {
        const res = await api.get('/emergency-contacts');
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          dispatch(fetchContactsSuccess(res.data));
        }
      } catch (err) {
      }
    };
    syncContacts();
  }, [dispatch]);

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
        // Batch 11: RTK Query mutation — invalidates 'IncidentList' tag.
        // Cast to any: incidentsApi Incident type doesn't include alertDispatchStatus,
        // but the backend accepts it (it's part of the DB schema).
        const result = await createIncident({
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
        } as any).unwrap();
        return result;
      } catch (err) {
        return null;
      }
    },
    [severity, latitude, longitude, createIncident],
  );

  const handleCancel = useCallback(
    async (method: 'BUTTON' | 'VOICE' = 'BUTTON') => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsCancelled(true);
      MultiModalFusionService.reset(); // Clear 3-minute cooldown lockout so user can re-test immediately
      await logIncident('FALSE_ALARM');
      setTimeout(() => navigation.goBack(), 1200);
    },
    [logIncident, navigation],
  );

  const handleTimeout = useCallback(async () => {
    // CRITICAL FIX: Guard against duplicate dispatch.
    // Without this guard, handleTimeout is called in an INFINITE LOOP:
    // 1. Timer hits 0 → handleTimeout() runs
    // 2. handleTimeout calls dispatch(fetchContactsSuccess(...)) → contacts changes
    // 3. handleTimeout is recreated (useCallback dep on contacts)
    // 4. The interval useEffect [handleTimeout] re-runs → creates NEW interval
    // 5. secondsLeft is 0 → new interval's first tick: prev=0, prev<=1 → handleTimeout() AGAIN
    // 6. Loop repeats, sending 9+ SMS, multiple WhatsApp, multiple emails
    if (hasDispatchedRef.current) return;
    hasDispatchedRef.current = true;

    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsDispatching(true);

    // 0. Ensure contacts are strictly ordered by priority (Priority 1 first, Priority 2 second...)
    let currentContacts = contacts || [];
    try {
      const freshRes = await api.get('/emergency-contacts');
      if (freshRes.data && Array.isArray(freshRes.data) && freshRes.data.length > 0) {
        currentContacts = freshRes.data;
        dispatch(fetchContactsSuccess(freshRes.data));
      }
    } catch (e) {
    }

    const sortedContacts = [...currentContacts].sort(
      (a: any, b: any) => (a.priorityOrder ?? 999) - (b.priorityOrder ?? 999)
    );

    const dispatchContacts = sortedContacts
      .map((c: any) => ({
        name: c.name || 'Emergency Contact',
        phoneNumber: c.phoneNumber,
        email: c.email || undefined,
        priorityOrder: c.priorityOrder ?? 1,
      }))
      .filter((c: any) => Boolean(c.phoneNumber));

    // 0. Ensure high-accuracy current GPS location before dispatch
    let realLat = latitude;
    let realLng = longitude;
    let resolvedAddress: string | undefined;
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (pos?.coords?.latitude && pos?.coords?.longitude) {
        realLat = pos.coords.latitude;
        realLng = pos.coords.longitude;
      }
    } catch (locErr) {
    }

    const mapsLink = `https://www.google.com/maps?q=${realLat},${realLng}`;

    setDispatchStatus({
      backend: 'sending', sms: 'pending', push: 'pending',
      email: 'pending', whatsapp: 'pending', module68: 'pending', incident: 'pending',
    });

// ═══ STEP 1: Log incident in database ═══
    let incident = null;

    // Reverse geocode address from coordinates
    let address: string | undefined;
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${realLat}&lon=${realLng}`,
        { headers: { 'User-Agent': 'ResQDrive/1.0' } }
      );
      const geoData = await geoRes.json();
      address = geoData?.display_name;
    } catch (err) {
    }

    try {
      // Batch 11: RTK Query mutation. Auto-invalidates 'IncidentList' tag.
      const result = await createIncident({
        type: 'AUTO',
        severity: severity.toUpperCase(),
        status: 'ACTIVE',
        occurredAt: new Date().toISOString(),
        latitude: realLat,
        longitude: realLng,
        address, // ← NEW: stores real street/city name in database
        description: 'Countdown reached zero — emergency alert dispatched',
      }).unwrap();
      incident = result;
      setDispatchStatus(prev => ({ ...prev, incident: 'logged' }));
    } catch (err) {
      setDispatchStatus(prev => ({ ...prev, incident: 'failed' }));
    }

    // ═══ STEP 2: Trigger Module 6.8 (RoboCall voice call + RoboSMS) ═══
    let acknowledgeUrl: string | undefined;
    let emergencyNotificationResult: any = null;
    try {
      // Batch 11: RTK Query mutation. Invalidates 'Emergency' tag.
      const response = await triggerEmergency({
        incidentId: incident?.id,
        message: `Accident detected (${severity})`,
        latitude: realLat,
        longitude: realLng,
        address: incident?.address,
      }).unwrap();
      emergencyNotificationResult = response;
      acknowledgeUrl = response?.acknowledgeUrl;
      setDispatchStatus(prev => ({ ...prev, module68: 'triggered' }));
    } catch (err: any) {
      setDispatchStatus(prev => ({ ...prev, module68: 'failed' }));
    }

    // ═══ STEP 3: Multi-channel dispatch (WhatsApp Cloud API + Email + Push) ═══
    let backendSucceeded = false;
    try {
      // Batch 11: RTK Query mutation. Invalidates 'Emergency' tag.
      const response = await dispatchAlert({
        userId: user?.id,
        userName: user?.fullName,
        incidentId: incident?.id,
        acknowledgeUrl,
        latitude: realLat,
        longitude: realLng,
        address: resolvedAddress || incident?.address,
        severity,
        contacts: dispatchContacts,
      }).unwrap();
      setBackendChannels(response?.channels);
      setIsDevMode(response?.devMode ?? true);
      const respChannels = response?.channels;

      const anySent = respChannels &&
        (respChannels.push.status === 'SENT' ||
         respChannels.sms.status === 'SENT' ||
         respChannels.email.status === 'SENT' ||
         respChannels.whatsapp?.status === 'SENT');

      if (anySent) {
        backendSucceeded = true;
        setDispatchStatus(prev => ({
          ...prev,
          backend: 'sent',
          push: respChannels.push.status === 'SENT' ? 'sent' : 'failed',
          sms: respChannels.sms.status === 'SENT' ? 'sent' : (respChannels.sms.devMode ? 'pending' : 'failed'),
          email: respChannels.email.status === 'SENT' ? 'sent' : (respChannels.email.devMode ? 'failed' : 'failed'),
          whatsapp: respChannels.whatsapp?.status === 'SENT' ? 'sent' : (respChannels.whatsapp?.devMode ? 'pending' : 'failed'),
        }));
      } else {
        setDispatchStatus(prev => ({
          ...prev, backend: 'failed', push: 'failed', email: 'failed', sms: 'pending', whatsapp: 'failed',
        }));
      }
    } catch (err) {
      setDispatchStatus(prev => ({
        ...prev, backend: 'failed', push: 'failed', email: 'failed', sms: 'pending', whatsapp: 'failed',
      }));
    }

    // ═══ STEP 4: Direct background SMS (device-side fallback) ═══
    // FIX: Only send device-side SMS if the backend SMS channel FAILED.
    // Previously, this ALWAYS sent device-side SMS to ALL contacts — even when
    // the backend had already successfully sent RoboSMS via the API. This caused
    // each contact to receive DUPLICATE SMS (one from backend, one from device).
let autoSmsSent = false;
const backendSmsFailed = !backendSucceeded ||
  (backendSucceeded && dispatchStatus.sms !== 'sent');

if (dispatchContacts.length > 0 && backendSmsFailed) {
  const backendBase = (api.defaults.baseURL || 'http://192.168.18.186:3000')
    .replace(/\/api\/?$/, '')
    .replace(/\/$/, '');

  const fullAckUrl = acknowledgeUrl
    ? (acknowledgeUrl.startsWith('http') ? acknowledgeUrl : `${backendBase}${acknowledgeUrl}`)
    : null;

  const ackLine = fullAckUrl ? `\nTrack/Ack: ${fullAckUrl}` : '';

  const smsMessage = `[ResQDrive ALERT] ${user?.fullName || 'Driver'} may have had a ${severity} accident.\nLocation: https://maps.google.com/?q=${realLat},${realLng}${ackLine}\nPlease respond immediately.`;
      // Try background auto-SMS first (react-native-direct-sms)
      try {
        const smsResult = await sendBulkBackgroundSMS(dispatchContacts, smsMessage);
        autoSmsSent = smsResult.sent > 0;
        if (autoSmsSent) {
          setDispatchStatus(prev => ({ ...prev, sms: 'sent' }));
        }
      } catch (err) {
      }

      // If auto-SMS failed AND backend also failed → open SMS app as last resort
      if (!autoSmsSent && !backendSucceeded) {
        try {
          const isAvailable = await Sms.isAvailableAsync();
          if (isAvailable && dispatchContacts.length > 0) {
            setDispatchStatus(prev => ({ ...prev, sms: 'sending' }));
            const phoneNumbers = dispatchContacts.map(c => c.phoneNumber);
            await Sms.sendSMSAsync(phoneNumbers, smsMessage);
            setDispatchStatus(prev => ({ ...prev, sms: 'sent-via-device' }));
          } else {
            setDispatchStatus(prev => ({ ...prev, sms: 'failed' }));
          }
        } catch (err) {
          setDispatchStatus(prev => ({ ...prev, sms: 'failed' }));
        }
      } else if (!autoSmsSent && backendSucceeded) {
        setDispatchStatus(prev => ({ ...prev, sms: 'failed' }));
      }
    }

    // ═══ STEP 4.5: Direct Phone Call from driver device to primary emergency contact ═══
    if (dispatchContacts.length > 0 && dispatchContacts[0]?.phoneNumber) {
      const primaryTarget = dispatchContacts[0];
      console.log(`[Countdown] Auto-calling primary emergency contact in 1000ms: ${primaryTarget.name} (${primaryTarget.phoneNumber})`);
      setTimeout(() => {
        try {
          makeDirectPhoneCall(primaryTarget.phoneNumber);
        } catch (callErr) {
          console.log('[Countdown] Direct phone call error:', callErr);
        }
      }, 1000);
    }

    // ═══ STEP 5: Local push notification on device ═══
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'ResQDrive Emergency Alert',
          body: `Emergency alert dispatched! Live GPS tracking active. Acknowledgement link sent to contacts.`,
          sound: true,
          data: { mapsLink, severity },
        },
        trigger: null,
      });
    } catch (e) {
    }

    // ═══ STEP 6: Show dispatch summary for 3 seconds, then navigate to SOS ═══
    setDispatchComplete(true);
    hapticSuccess();
    setTimeout(() => {
      navigation.replace('SOS', {
        severity: severity.toLowerCase(),
        incidentId: incident?.id || null,
        sessionId: emergencyNotificationResult?.sessionId || null,
        initialContactIndex: 1,
      });
    }, 3000);
  }, [contacts, user, severity, latitude, longitude, navigation, dispatch, createIncident, triggerEmergency, dispatchAlert]);


  const cancelCallbackRef = useRef(handleCancel);
  const timeoutCallbackRef = useRef(handleTimeout);

  useEffect(() => {
    cancelCallbackRef.current = handleCancel;
    timeoutCallbackRef.current = handleTimeout;
  }, [handleCancel, handleTimeout]);

  useEffect(() => {
    // Release the microphone from crash detection so speech recognizer gets exclusive access
    CrashSoundDetectionService.stopMonitoring();

    // Small delay to let the native mic resource fully release before starting speech recognition
    const startDelay = setTimeout(() => {
      VoiceCommandService.startListening();
    }, 600);

    VoiceCommandService.subscribeToCallbacks(
      () => {
        cancelCallbackRef.current('VOICE');
      },
      () => {
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
      CrashSoundDetectionService.startMonitoring();
    };
  }, []);

  useEffect(() => {
    // CRITICAL FIX: Use empty deps [] so the interval is only created ONCE on mount.
    // Previously deps were [handleTimeout], which caused the interval to be
    // recreated every time handleTimeout changed (every render after contacts
    // update). When the timer hit 0 and handleTimeout ran, it updated contacts
    // → handleTimeout recreated → useEffect re-ran → new interval created →
    // secondsLeft was 0 → new interval's first tick immediately called
    // handleTimeout again → infinite loop of duplicate dispatches.
    //
    // Now we use timeoutCallbackRef.current() which always points to the
    // latest handleTimeout (updated by the ref-syncing useEffect below).
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev: number) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          timeoutCallbackRef.current();
          return 0;
        }
        hapticLight();
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (isCancelled) {
    return (
      <SafeAreaView style={styles.cancelledContainer}>
        <View style={StyleSheet.absoluteFillObject}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: darkColors.background }]} />
          <View style={[StyleSheet.absoluteFillObject, styles.cancelledGrad]} />
        </View>
        <Animated.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', opacity: fadeAnim }}>
          <Text style={styles.cancelledIcon} allowFontScaling={true} maxFontSizeMultiplier={1.5}>\u2705</Text>
          <Text style={styles.cancelledText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Marked as false alarm</Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (isDispatching && !dispatchComplete) {
    const statusIcon = (s: string) => {
      if (s === 'sent' || s === 'sent-via-device' || s === 'triggered' || s === 'logged') return 'checkmark-circle';
      if (s === 'sending') return 'hourglass-outline';
      if (s === 'failed') return 'close-circle';
      return 'pause-circle-outline';
    };
    const statusText = (s: string, devMode?: boolean) => {
      if (s === 'sent') return 'Sent';
      if (s === 'sent-via-device') return 'App opened — tap Send';
      if (s === 'triggered') return 'Escalation started';
      if (s === 'logged') return 'Logged';
      if (s === 'sending') return 'Sending...';
      if (s === 'failed') return devMode ? 'Dev mode (not configured)' : 'Failed';
      return 'Pending';
    };

    return (
      <SafeAreaView style={styles.container}>
        <View style={StyleSheet.absoluteFillObject}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: darkColors.background }]} />
          <View style={[StyleSheet.absoluteFillObject, styles.gradTop]} />
          <View style={[StyleSheet.absoluteFillObject, styles.gradBottom]} />
        </View>
        <Animated.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', opacity: fadeAnim, paddingHorizontal: 24 }}>
          <Ionicons name="warning-outline" size={24} color={darkColors.text} />
          <Text style={styles.dispatchingText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Dispatching Emergency Alert</Text>
                    {isDevMode && (
            <Text style={styles.devModeBanner} allowFontScaling={true} maxFontSizeMultiplier={1.5}>DEV MODE: Some channels not configured. Real delivery limited.
            </Text>
          )}

          <View style={styles.statusList}>
            <Text style={styles.statusRow} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              <Ionicons name={statusIcon(dispatchStatus.backend)} size={14} color={darkColors.text} /> Backend Dispatch: {statusText(dispatchStatus.backend)}
            </Text>
            <Text style={styles.statusRow} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              <Ionicons name={statusIcon(dispatchStatus.push)} size={14} color={darkColors.text} /> Push Notification: {statusText(dispatchStatus.push, backendChannels?.push?.devMode)}
            </Text>
            <Text style={styles.statusRow} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              <Ionicons name={statusIcon(dispatchStatus.sms)} size={14} color={darkColors.text} /> SMS: {statusText(dispatchStatus.sms, backendChannels?.sms?.devMode)}
            </Text>
                        <Text style={styles.statusRow} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              <Ionicons name={statusIcon(dispatchStatus.whatsapp)} size={14} color={darkColors.text} /> WhatsApp: {statusText(dispatchStatus.whatsapp, backendChannels?.whatsapp?.devMode)}
            </Text>
            <Text style={styles.statusRow} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              <Ionicons name={statusIcon(dispatchStatus.email)} size={14} color={darkColors.text} /> Email: {statusText(dispatchStatus.email, backendChannels?.email?.devMode)}
            </Text>
            <Text style={styles.statusRow} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              <Ionicons name={statusIcon(dispatchStatus.incident)} size={14} color={darkColors.text} /> Incident Log: {statusText(dispatchStatus.incident)}
            </Text>
            <Text style={styles.statusRow} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              <Ionicons name={statusIcon(dispatchStatus.module68)} size={14} color={darkColors.text} /> Contact Escalation: {statusText(dispatchStatus.module68)}
            </Text>
          </View>

          {dispatchStatus.sms === 'sent-via-device' && (
            <Text style={styles.smsHint} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Your SMS app opened. Tap "Send" to deliver the alert to your contacts.
            </Text>
          )}
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (isDispatching && dispatchComplete) {
    const allGood = dispatchStatus.backend === 'sent' || dispatchStatus.sms === 'sent-via-device';
    return (
      <SafeAreaView style={styles.container}>
        <View style={StyleSheet.absoluteFillObject}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: darkColors.background }]} />
          <View style={[StyleSheet.absoluteFillObject, styles.gradBottom]} />
        </View>
        <Animated.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', opacity: fadeAnim, paddingHorizontal: 24 }}>
          <Ionicons name={allGood ? "checkmark-circle" : "warning-outline"} size={48} color={darkColors.text} />
          <Text style={styles.completeTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
            {allGood ? 'Alert Dispatched' : 'Partially Dispatched'}
          </Text>
          <Text style={styles.completeSubtext} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
            {allGood
              ? 'Emergency contacts have been notified. Live GPS tracking is active. Escalation started.'
              : 'Some channels failed. Your contacts may still receive the alert via other channels.'}
          </Text>
          <Text style={styles.redirectHint} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Redirecting to SOS screen...</Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Background gradient layers */}
      <View style={StyleSheet.absoluteFillObject}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: darkColors.background }]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradTop]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradBottom]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradCenter]} />
      </View>

      <Animated.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, opacity: fadeAnim }}>
        <Text style={styles.warningLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>POSSIBLE ACCIDENT DETECTED</Text>

        <Animated.View style={[styles.numberCircle, { transform: [{ scale: pulseAnim }] }]}>
          <View style={[StyleSheet.absoluteFillObject, styles.numberCircleGrad]} />
          <Text style={styles.countdownNumber} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{secondsLeft}</Text>
        </Animated.View>

        <Text style={styles.subLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
          Emergency alert will be sent automatically in {secondsLeft} second{secondsLeft !== 1 ? 's' : ''}
        </Text>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => handleCancel('BUTTON')}
          activeOpacity={0.85} accessibilityRole="button"
        >
          <Text style={styles.cancelBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>I AM OK CANCEL</Text>
        </TouchableOpacity>

        <Text style={styles.voiceHint} allowFontScaling={true} maxFontSizeMultiplier={1.5}>You can also say "I am OK" or "Cancel"</Text>

        {__DEV__ && (
          <View style={styles.devSimRow}>
            <TouchableOpacity
              style={styles.devSimBtn}
              onPress={() => VoiceCommandService.simulateSpeechInput('Cancel')} accessibilityRole="button"
            >
              <Text style={styles.devSimText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Simulate Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.devSimBtn, { borderColor: colors.danger[600] }]}
              onPress={() => VoiceCommandService.simulateSpeechInput('SOS')} accessibilityRole="button"
            >
              <Text style={[styles.devSimText, { color: colors.danger[500] }]} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Simulate SOS</Text>
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
    backgroundColor: darkColors.background,
  },
  gradTop: { top: 0, height: 400, backgroundColor: tints.dangerSubtle },
  gradBottom: { bottom: 0, height: 400, backgroundColor: tints.dangerSubtle },
  gradCenter: { top: '30%', height: 300, backgroundColor: tints.dangerSubtle },
  warningLabel: {
    color: colors.danger[300],
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
    backgroundColor: colors.danger[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 40,
    elevation: 12,
    borderWidth: 2,
    borderColor: tints.dangerErrorBorder,
  },
  numberCircleGrad: {
    borderRadius: 100,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  countdownNumber: {
    fontSize: 96,
    fontWeight: 'bold',
    color: darkColors.text,
  },
  subLabel: {
    color: tints.dangerErrorBorder,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  cancelBtn: {
    backgroundColor: tints.whiteBorderStrong,
    paddingVertical: 20,
    paddingHorizontal: 48,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: darkColors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cancelBtnText: {
    color: darkColors.background,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  voiceHint: {
    color: tints.dangerErrorBorder,
    fontSize: 13,
    textAlign: 'center',
  },
  dispatchingIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  dispatchingText: {
    color: darkColors.text,
    fontSize: 18,
    fontWeight: '600',
  },
    statusList: {
    marginTop: 32,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: tints.glassCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    width: '100%',
  },
  statusRow: {
    color: darkColors.text,
    fontSize: 14,
    paddingVertical: 6,
    fontFamily: 'monospace',
  },
  smsHint: {
    color: colors.warning[300],
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  completeIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  completeTitle: {
    color: darkColors.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  completeSubtext: {
    color: darkColors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  redirectHint: {
    color: darkColors.textTertiary,
    fontSize: 12,
  },
  cancelledContainer: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  cancelledGrad: { top: 0, height: '100%', backgroundColor: tints.successSubtle },
  cancelledIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  cancelledText: {
    color: darkColors.text,
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
    backgroundColor: darkColors.surfaceElevated,
    borderColor: darkColors.surfaceElevated,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  devSimText: {
    color: darkColors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
    devModeBanner: {
    color: colors.warning[300],
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
});
