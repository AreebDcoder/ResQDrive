import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';
import { VoiceCommandService } from '../services/voiceCommandService';

interface EmergencyNumberItem {
  id: string;
  regionName?: string;
  serviceName?: string;
  label?: string; // For user custom numbers
  phoneNumber: string;
  priorityOrder: number;
}

export default function SOSScreen({ route, navigation, isInline }: any) {
  // Extract params from countdown trigger if navigated dynamically
  const severity = route?.params?.severity || 'moderate';
  const incidentId = route?.params?.incidentId || null;

  const [regionalNumbers, setRegionalNumbers] = useState<EmergencyNumberItem[]>([]);
  const [customNumbers, setCustomNumbers] = useState<EmergencyNumberItem[]>([]);
  const [regionName, setRegionName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-escalation 60-second timer state
  const [escalationTimeLeft, setEscalationTimeLeft] = useState<number>(60);
  const [isEscalationActive, setIsEscalationActive] = useState<boolean>(
    !!incidentId && (severity === 'moderate' || severity === 'severe')
  );
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const sosPulse = useRef(new Animated.Value(0)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;
  const listTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Header fade in
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // SOS pulse loop
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
  }, []);

  const regionalNumbersRef = useRef(regionalNumbers);
  const customNumbersRef = useRef(customNumbers);

  useEffect(() => {
    regionalNumbersRef.current = regionalNumbers;
    customNumbersRef.current = customNumbers;
  }, [regionalNumbers, customNumbers]);

  useEffect(() => {
    // Start listening to voice commands when SOS Screen mounts
    VoiceCommandService.startListening();

    // Subscribe to callbacks
    VoiceCommandService.subscribeToCallbacks(
      () => {
        console.log('[SOS Voice Command]: CANCEL action detected. Stopping countdown.');
        setIsEscalationActive(false);
        if (timerRef.current) clearTimeout(timerRef.current);
        Alert.alert('System Action', 'Accident escalation timer cancelled via voice command.');
      },
      async () => {
        console.log('[SOS Voice Command]: SOS action detected. Dialing immediately!');
        setIsEscalationActive(false);
        if (timerRef.current) clearTimeout(timerRef.current);

        const target = regionalNumbersRef.current[0] || customNumbersRef.current[0];
        if (target) {
          try {
            await api.post('/emergency-sos/log-call', {
              serviceName: target.serviceName || target.label || 'Rescue',
              autoDialed: false,
            });
          } catch (err) {
            console.log('Failed to log voice call on SOSScreen:', err);
          }
          Linking.openURL(`tel:${target.phoneNumber}`);
        } else {
          Linking.openURL('tel:1122');
        }
      },
      () => {},
      () => {},
      () => {}
    );

    return () => {
      // Stop listening when SOS Screen unmounts
      VoiceCommandService.stopListening();
    };
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

  const fetchEmergencyNumbers = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission is required to show the correct emergency numbers.');
        return;
      }

      const location = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<any>((resolve) => setTimeout(() => resolve(null), 3000))
      ]);
      const latitude = location?.coords?.latitude ?? 33.6844;
      const longitude = location?.coords?.longitude ?? 73.0479;

      const response = await api.get('/emergency-sos/numbers', {
        params: { lat: latitude, lng: longitude },
      });

      setRegionName(response.data.regionName || '');
      setRegionalNumbers(response.data.regionalNumbers || []);
      setCustomNumbers(response.data.customNumbers || []);
      animateListIn();
    } catch (err: any) {
      setErrorMsg('Could not load emergency numbers. Check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmergencyNumbers();
  }, [fetchEmergencyNumbers]);

  // Handle 60s Escalation timer countdown tick
  useEffect(() => {
    if (isEscalationActive && escalationTimeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setEscalationTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isEscalationActive && escalationTimeLeft === 0) {
      // Trigger automatic escalation call
      triggerAutoEscalationCall();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isEscalationActive, escalationTimeLeft]);

  const triggerAutoEscalationCall = async () => {
    setIsEscalationActive(false);
    // Fetch top-priority number
    const targetService = regionalNumbers[0];
    const phone = targetService?.phoneNumber || '1122';
    const name = targetService?.serviceName || 'Rescue 1122';

    try {
      // Log the auto-escalated call to backend
      await api.post('/emergency-sos/log-call', {
        serviceName: name,
        autoDialed: true,
      });
    } catch (err) {
      console.log('Failed to log auto-dialed call:', err);
    }

    // Launch native dialer
    Linking.openURL(`tel:${phone}`);
  };

  const handleCallNumber = async (number: string, name: string) => {
    // Stop local countdown if active
    if (isEscalationActive) {
      setIsEscalationActive(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }

    Alert.alert(
      `Call ${name}?`,
      `This will dial ${number} using your phone's dialer.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          style: 'destructive',
          onPress: async () => {
            try {
              // Log manual call
              await api.post('/emergency-sos/log-call', {
                serviceName: name,
                autoDialed: false,
              });
            } catch (err) {
              console.log('Failed to log emergency call:', err);
            }
            Linking.openURL(`tel:${number}`);
          },
        },
      ]
    );
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
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.title}>Emergency SOS</Text>
          <Text style={styles.subtitle}>
            {regionName ? `Region: ${regionName}` : 'Detecting your location...'}
          </Text>
        </View>
      </Animated.View>

      {/* Escalation Countdown Indicator */}
      {isEscalationActive && (
        <View style={styles.countdownBanner}>
          <Ionicons name="warning" size={24} color="#ff9800" style={{ marginRight: 8 }} />
          <Text style={styles.countdownText}>
            Auto-dialing rescue in {escalationTimeLeft}s if no contact response...
          </Text>
        </View>
      )}

      {/* Loading */}
      {isLoading && (
        <View style={styles.centerContainer}>
          <View style={styles.loadingRing}>
            <ActivityIndicator size="large" color="#E53935" />
          </View>
          <Text style={styles.loadingText}>Finding emergency services near you...</Text>
        </View>
      )}

      {/* Error */}
      {!isLoading && errorMsg && (
        <View style={styles.centerContainer}>
          <View style={styles.errorBadge}>
            <Text style={styles.errorEmoji}>⚠️</Text>
          </View>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchEmergencyNumbers}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Emergency Numbers List */}
      {!isLoading && !errorMsg && (
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
            <Text style={styles.sectionLabel}>REGIONAL EMERGENCY SERVICES</Text>
            {regionalNumbers.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.callCard, index === 0 && styles.callCardFirst]}
                onPress={() => handleCallNumber(item.phoneNumber, item.serviceName || 'Rescue')}
                activeOpacity={0.85}
              >
                <View style={styles.callIconCircle}>
                  <Text style={styles.callIcon}>📞</Text>
                </View>
                <View style={styles.callCardText}>
                  <Text style={styles.callName}>{item.serviceName}</Text>
                  <Text style={styles.callNumber}>{item.phoneNumber}</Text>
                </View>
                <View style={styles.callNowBadge}>
                  <Text style={styles.callNowText}>CALL</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Custom Numbers Section */}
            {customNumbers.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>YOUR CUSTOM OVERRIDES</Text>
                {customNumbers.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.callCard}
                    onPress={() => handleCallNumber(item.phoneNumber, item.label || 'Override')}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.callIconCircle, { backgroundColor: 'rgba(255,152,0,0.12)' }]}>
                      <Text style={styles.callIcon}>👤</Text>
                    </View>
                    <View style={styles.callCardText}>
                      <Text style={styles.callName}>{item.label}</Text>
                      <Text style={styles.callNumber}>{item.phoneNumber}</Text>
                    </View>
                    <View style={[styles.callNowBadge, { backgroundColor: '#ff9800' }]}>
                      <Text style={styles.callNowText}>CALL</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

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

            <View style={styles.noteBox}>
              <Text style={styles.noteIcon}>ℹ️</Text>
              <Text style={styles.noteText}>
                These calls work as standard cellular calls and do not require internet access.
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  sosGlow: {
    position: 'absolute',
    top: -60,
    left: '15%',
    right: '15%',
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
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
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 13,
    color: '#A0A0B8',
    marginTop: 3,
  },
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  countdownText: {
    flex: 1,
    color: '#ff9800',
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
    backgroundColor: 'rgba(229, 57, 53, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(229, 57, 53, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    color: '#A0A0B8',
    fontSize: 15,
    textAlign: 'center',
  },
  errorBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 214, 0, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 214, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorEmoji: {
    fontSize: 32,
  },
  errorText: {
    color: '#A0A0B8',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryBtn: {
    backgroundColor: '#E53935',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionLabel: {
    color: '#6B6B80',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 14,
    marginTop: 16,
  },
  callCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  callCardFirst: {
    borderColor: 'rgba(229, 57, 53, 0.45)',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  callIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(229, 57, 53, 0.12)',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  callNumber: {
    color: '#A0A0B8',
    fontSize: 14,
  },
  callNowBadge: {
    backgroundColor: '#E53935',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  callNowText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 10,
  },
  noteIcon: {
    fontSize: 16,
  },
  noteText: {
    color: '#6B6B80',
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