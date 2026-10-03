import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  AccessibilityInfo,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  ScrollView,
  Alert,
  Animated,
  Easing,
  StatusBar,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';
import { useSelector, useDispatch } from 'react-redux';
import { fetchContactsSuccess } from '../store/slices/contactsSlice';
import {
  useGetRegionalNumbersQuery,
  useLogEmergencyCallMutation,
} from '../store/api/emergencyApi';
import { makeDirectPhoneCall, isAutoDialable } from '../utils/directCall';
import { getSafeDeviceLocation } from '../utils/location';
import { useToast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui';
import { colors, darkColors, tints } from '../theme/tokens';

interface EmergencyNumberItem {
  id: string;
  regionName?: string;
  serviceName?: string;
  label?: string; // For user custom numbers
  phoneNumber: string;
  priorityOrder: number;
}

const FALLBACK_LAT = 33.6844;
const FALLBACK_LNG = 73.0479;

const DEFAULT_RESCUE_NUMBERS: EmergencyNumberItem[] = [
  {
    id: 'def-rescue-hotline',
    serviceName: 'Rescue 1122 (Emergency Hotline)',
    phoneNumber: '1122',
    priorityOrder: 1,
  },
  {
    id: 'def-rescue-hq',
    serviceName: 'Rescue 1122 Regional HQ (Direct)',
    phoneNumber: '0519290002',
    priorityOrder: 2,
  },
];

export default function SOSScreen({ route, navigation, isInline }: any) {
  const toast = useToast();
  const dispatch = useDispatch();
  // Extract params from countdown trigger if navigated dynamically
  const severity = route?.params?.severity || 'moderate';
  const incidentId = route?.params?.incidentId || null;

  const [regionalNumbers, setRegionalNumbers] = useState<EmergencyNumberItem[]>(DEFAULT_RESCUE_NUMBERS);
  const [regionName, setRegionName] = useState<string>('Pakistan (Nationwide)');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const personalContacts = useSelector((state: any) => state.contacts?.list || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Batch 11: Migrated regional numbers fetch to RTK Query.
  // The hook auto-fetches when `coords` change; skip until coords are resolved.
  const { data: regionalData } = useGetRegionalNumbersQuery(
    (coords || { lat: FALLBACK_LAT, lng: FALLBACK_LNG }) as { lat: number; lng: number },
    { skip: !coords }
  );
  const [logEmergencyCall] = useLogEmergencyCallMutation();

  // Sync RTK Query response into local state (preserves DEFAULT_RESCUE_NUMBERS fallback).
  useEffect(() => {
    if (regionalData?.regionName) {
      setRegionName(regionalData.regionName);
    }
    if (regionalData?.regionalNumbers && regionalData.regionalNumbers.length > 0) {
      setRegionalNumbers(regionalData.regionalNumbers);
    }
  }, [regionalData]);

  // Auto-escalation state & cycling
  const [escalationTimeLeft, setEscalationTimeLeft] = useState<number>(60);
  const [pendingCallTarget, setPendingCallTarget] = useState<{ name: string; phone: string } | null>(null);
  const [currentContactIndex, setCurrentContactIndex] = useState<number>(0);
  const [hasCycledThroughAll, setHasCycledThroughAll] = useState<boolean>(false);
  const [isEscalationActive, setIsEscalationActive] = useState<boolean>(
    !!incidentId && (severity === 'moderate' || severity === 'severe')
  );
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Phase 8: ConfirmDialog state for cautionary call confirm
  const [callDialogVisible, setCallDialogVisible] = useState(false);
  const [pendingCallContact, setPendingCallContact] = useState<{ name: string; phone: string } | null>(null);

  // Refresh personal contacts on mount to guarantee fresh priority
  useEffect(() => {
    const fetchFreshContacts = async () => {
      try {
        const res = await api.get('/emergency-contacts');
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          dispatch(fetchContactsSuccess(res.data));
        }
      } catch (err) {
      }
    };
    fetchFreshContacts();
  }, [dispatch]);

  // Keep target contact updated as personalContacts load
  useEffect(() => {
    if (personalContacts.length > 0) {
      const sorted = [...personalContacts].sort((a: any, b: any) => (a.priorityOrder ?? 999) - (b.priorityOrder ?? 999));
      if (currentContactIndex === 0) {
        setPendingCallTarget({ name: sorted[0].name, phone: sorted[0].phoneNumber });
      }
    } else if (personalContacts.length === 0 && regionalNumbers.length > 0 && !pendingCallTarget) {
      setPendingCallTarget({
        name: regionalNumbers[0]?.serviceName || 'Rescue 1122',
        phone: regionalNumbers[0]?.phoneNumber || '1122',
      });
    }
  }, [personalContacts, regionalNumbers, currentContactIndex]);

  // Animations
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const sosPulse = useRef(new Animated.Value(0)).current;
  const listOpacity = useRef(new Animated.Value(1)).current;
  const listTranslateY = useRef(new Animated.Value(0)).current;

  // Batch 7 Phase 4: Respect Reduce Motion accessibility setting
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Skip decorative header entrance animation when Reduce Motion is enabled.
    // The sosPulse Animated.loop is a functional pulse indicator and remains running.
    if (reduceMotion) {
      headerOpacity.setValue(1);
    } else {
      // Header fade in
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }

    // SOS pulse loop — continuous pulse effect, NOT skipped (functional indicator)
    Animated.loop(
      Animated.sequence([
        Animated.timing(sosPulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(sosPulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [reduceMotion]);

  const regionalNumbersRef = useRef(regionalNumbers);

  useEffect(() => {
    regionalNumbersRef.current = regionalNumbers;
  }, [regionalNumbers]);

  useEffect(() => {
    // Request CALL_PHONE permission early on screen mount for Android so auto-call is ready
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CALL_PHONE, {
        title: 'Emergency Direct Call Permission',
        message: 'ResQDrive requires permission to directly place emergency calls to Rescue 1122.',
        buttonPositive: 'Allow',
      }).catch((e) => {});
    }
  }, []);

  const animateListIn = () => {
    Animated.parallel([
      Animated.timing(listOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(listTranslateY, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Resolve device location once on mount, then feed coords to RTK Query.
  useEffect(() => {
    let cancelled = false;
    const getLoc = async () => {
      setIsLocating(true);
      try {
        const loc = await getSafeDeviceLocation();
        if (cancelled) return;
        const latitude = loc?.latitude ?? FALLBACK_LAT;
        const longitude = loc?.longitude ?? FALLBACK_LNG;
        setCoords({ lat: latitude, lng: longitude });
      } catch (err: any) {
        // Fall back to nationwide defaults; RTK Query will fetch with fallback coords.
        setCoords({ lat: FALLBACK_LAT, lng: FALLBACK_LNG });
      } finally {
        if (!cancelled) setIsLocating(false);
      }
    };
    getLoc();
    return () => { cancelled = true; };
  }, []);

  const escalationStartTimeRef = useRef<number>(0);

  // CRITICAL FIX: Use a ref to always call the LATEST triggerAutoEscalationCall.
  // Without this, the useEffect at line 240 captures a stale closure from the
  // first render — personalContacts would be empty (not yet loaded from API),
  // causing the auto-call to skip personal contacts and jump straight to
  // the regional emergency number.
  const triggerAutoEscalationRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!isEscalationActive) return;

    const startTime = Date.now();
    const intervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = 60 - elapsed;

      if (remaining <= 0) {
        clearInterval(intervalId);
        setEscalationTimeLeft(0);
        // CRITICAL FIX: Actually fire the auto-escalation call when timer hits 0.
        // Previously this function was defined but never invoked — the auto-call
        // to emergency contacts (and regional fallback) never actually happened.
        triggerAutoEscalationRef.current();
      } else {
        setEscalationTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isEscalationActive]);

  const triggerAutoEscalationCall = async () => {
    setIsEscalationActive(false);

    const sortedContacts = [...personalContacts].sort(
      (a: any, b: any) => (a.priorityOrder ?? 999) - (b.priorityOrder ?? 999)
    );

    let phone: string;
    let name: string;
    let autoDialed = false;

    if (currentContactIndex < sortedContacts.length) {
      // 1. Calling personal contact
      const contact = sortedContacts[currentContactIndex];
      phone = contact.phoneNumber;
      name = contact.name;
      autoDialed = true;
    } else {
      // 2. All personal contacts exhausted — call regional emergency service (prefer 11-digit landline)
      const targetService = regionalNumbers.find((r) => r.phoneNumber.length >= 5) || regionalNumbers[0];
      phone = targetService?.phoneNumber || '0519290002';
      name = targetService?.serviceName || 'Rescue 1122 HQ (Auto-Dial)';
      setHasCycledThroughAll(true);
      autoDialed = isAutoDialable(phone);
    }

    try {
      // Batch 11: RTK Query mutation — logs the emergency call attempt.
      await logEmergencyCall({
        serviceName: name,
        autoDialed,
      }).unwrap();
    } catch (err) {
    }

    // Place the direct call
    const dialed = await makeDirectPhoneCall(phone);

    if (dialed) {
    } else if (!isAutoDialable(phone)) {
      Alert.alert(
        `Call ${name}`,
        `${phone} is an emergency shortcode. Tap the green Call button to dial.`,
        [{ text: 'OK' }]
      );
    }

    // 🔄 SCHEDULE NEXT ESCALATION (FIXED LOGIC)
    if (!hasCycledThroughAll) {
      const nextIndex = currentContactIndex + 1;
      setCurrentContactIndex(nextIndex);

      if (nextIndex < sortedContacts.length) {
        // Next is another personal contact
        const nextContact = sortedContacts[nextIndex];
        setPendingCallTarget({ name: nextContact.name, phone: nextContact.phoneNumber });
        escalationStartTimeRef.current = 0;
        setEscalationTimeLeft(60);
        setIsEscalationActive(true);
      } else {
        // Next is Regional Rescue 1122 Landline!
        const regional = regionalNumbers.find((r) => r.phoneNumber.length >= 5) || regionalNumbers[0];
        setPendingCallTarget({
          name: regional?.serviceName || 'Rescue 1122 HQ (Auto-Dial)',
          phone: regional?.phoneNumber || '0519290002',
        });
        setEscalationTimeLeft(60);
        setIsEscalationActive(true);
      }
    }
  };

  // Keep the ref updated with the latest closure on every render
  // (so the timer useEffect always calls the freshest version)
  useEffect(() => {
    triggerAutoEscalationRef.current = triggerAutoEscalationCall;
  });

  const handleCallNumber = async (number: string, name: string) => {
    // Stop local countdown if active
    if (isEscalationActive) {
      setIsEscalationActive(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    // Phase 8: replaced destructive Alert.alert with ConfirmDialog primitive
    setPendingCallContact({ name, phone: number });
    setCallDialogVisible(true);
  };

  const handleConfirmCall = async () => {
    setCallDialogVisible(false);
    if (!pendingCallContact) return;
    try {
      // Batch 11: RTK Query mutation — logs the manual call.
      await logEmergencyCall({
        serviceName: pendingCallContact.name,
        autoDialed: false,
      }).unwrap();
    } catch (err) {
    }
    await makeDirectPhoneCall(pendingCallContact.phone);
    setPendingCallContact(null);
  };

  const sosGlow = sosPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.2],
  });

  const sosScale = sosPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.08],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={darkColors.background} />

      {/* Pulsing SOS background glow */}
      <Animated.View
        style={[
          styles.sosGlow,
          {
            opacity: sosGlow,
            transform: [{ scale: sosScale }],
          },
        ]}
      />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        {!isInline && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={darkColors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.title} accessibilityRole="header" allowFontScaling={true} maxFontSizeMultiplier={1.5}>Emergency SOS</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <Ionicons name="location-sharp" size={14} color={colors.danger[500]} />
            <Text style={styles.subtitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              {isLocating ? 'Detecting local services...' : regionName}
            </Text>
            {isLocating && <ActivityIndicator size="small" color={colors.danger[500]} style={{ marginLeft: 6 }} />}
          </View>
        </View>
      </Animated.View>

      {/* Escalation Countdown Indicator */}
      {isEscalationActive && (
        <View style={styles.countdownBanner}>
          <Ionicons name="warning" size={24} color={colors.warning[500]} style={{ marginRight: 8 }} />
          <Text style={styles.countdownText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
            Auto-dialing {pendingCallTarget?.name || 'rescue'} in {escalationTimeLeft}s if no response...
          </Text>
        </View>
      )}

      {/* Emergency Numbers List */}
      <Animated.View
        style={{
          flex: 1,
          opacity: listOpacity,
          transform: [{ translateY: listTranslateY }],
        }}
      >
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>REGIONAL EMERGENCY SERVICES</Text>
            {regionalNumbers.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.callCard, index === 0 && styles.callCardFirst]}
                onPress={() => handleCallNumber(item.phoneNumber, item.serviceName || 'Rescue')}
                activeOpacity={0.85} accessibilityRole="button"
              >
                <View style={styles.callIconCircle}>
                  <Ionicons name="call-outline" size={24} color={darkColors.text} />
                </View>
                <View style={styles.callCardText}>
                  <Text style={styles.callName} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{item.serviceName}</Text>
                  <Text style={styles.callNumber} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{item.phoneNumber}</Text>
                </View>
                <View style={styles.callNowBadge}>
                  <Text style={styles.callNowText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>CALL</Text>
                </View>
              </TouchableOpacity>
            ))}


            <View style={styles.noteBox}>
              <Text style={styles.noteIcon} allowFontScaling={true} maxFontSizeMultiplier={1.5}>ℹ️</Text>
              <Text style={styles.noteText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                These calls work as standard cellular calls and do not require internet access.
              </Text>
            </View>
          </ScrollView>
        </Animated.View>

      {/* Phase 8: ConfirmDialog replaces destructive Alert.alert */}
      <ConfirmDialog
        visible={callDialogVisible}
        title={pendingCallContact ? `Call ${pendingCallContact.name}?` : 'Call?'}
        description={pendingCallContact ? `This will dial ${pendingCallContact.phone} using your phone's dialer.` : undefined}
        confirmLabel="Call Now"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={handleConfirmCall}
        onCancel={() => { setCallDialogVisible(false); setPendingCallContact(null); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  sosGlow: {
    position: 'absolute',
    top: -60,
    left: '15%',
    right: '15%',
    height: 260,
    borderRadius: 130,
    backgroundColor: tints.dangerLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16,
    paddingBottom: 20,
    zIndex: 1,
  },
  backBtn: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: darkColors.text,
  },
  subtitle: {
    fontSize: 13,
    color: darkColors.textSecondary,
    marginTop: 3,
  },
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tints.warningSubtle,
    borderWidth: 1,
    borderColor: tints.warningMedium,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  countdownText: {
    flex: 1,
    color: colors.warning[500],
    fontSize: 14,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: tints.dangerSubtle,
    borderWidth: 2,
    borderColor: tints.dangerMedium,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    color: darkColors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  errorBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: tints.warningSubtle,
    borderWidth: 1.5,
    borderColor: tints.warningMedium,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorEmoji: {
    fontSize: 32,
  },
  errorText: {
    color: darkColors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryBtn: {
    backgroundColor: colors.danger[500],
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  retryBtnText: {
    color: darkColors.text,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionLabel: {
    color: darkColors.textTertiary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 14,
    marginTop: 16,
  },
  callCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tints.glassCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: tints.whiteBorderStrong,
  },
  callCardFirst: {
    borderColor: tints.dangerMedium,
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  callIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: tints.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  callIcon: {
    fontSize: 22,
  },
  callCardText: {
    flex: 1,
  },
  callName: {
    color: darkColors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  callNumber: {
    color: darkColors.textSecondary,
    fontSize: 14,
  },
  callNowBadge: {
    backgroundColor: colors.danger[500],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  callNowText: {
    color: darkColors.text,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tints.whiteSubtle,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    gap: 10,
  },
  noteIcon: {
    fontSize: 16,
  },
  noteText: {
    color: darkColors.textTertiary,
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  devSimRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
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
});