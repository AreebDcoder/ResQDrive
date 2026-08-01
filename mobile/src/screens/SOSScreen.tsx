import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  SafeAreaView,
  ScrollView,
  Alert,
  Animated,
  Easing,
  StatusBar,
} from 'react-native';
import * as Location from 'expo-location';
import api from '../api/axios';

interface EmergencyNumberItem {
  id: string;
  name: string;
  number: string;
}

export default function SOSScreen({ navigation, isInline }: { navigation: any; isInline?: boolean }) {
  const [numbers, setNumbers] = useState<EmergencyNumberItem[]>([]);
  const [region, setRegion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;

      const response = await api.get('/emergency-numbers/for-location', {
        params: { lat: latitude, lng: longitude },
      });

      setRegion(response.data.region || '');
      setNumbers(response.data.numbers || []);
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

  const formatRegionLabel = (r: string) => {
    switch (r) {
      case 'PUNJAB_ISLAMABAD':
        return 'Punjab / Islamabad';
      case 'KARACHI':
        return 'Karachi';
      case 'KPK':
        return 'Khyber Pakhtunkhwa';
      default:
        return r;
    }
  };

  const callNumber = (number: string, name: string) => {
    Alert.alert(
      `Call ${name}?`,
      `This will dial ${number} using your phone's dialer.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Now', style: 'destructive', onPress: () => Linking.openURL(`tel:${number}`) },
      ],
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
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.title}>Emergency SOS</Text>
          <Text style={styles.subtitle}>
            {region ? formatRegionLabel(region) : 'Detecting your location...'}
          </Text>
        </View>
      </Animated.View>

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
            {numbers.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.callCard, index === 0 && styles.callCardFirst]}
                onPress={() => callNumber(item.number, item.name)}
                activeOpacity={0.85}
              >
                <View style={styles.callIconCircle}>
                  <Text style={styles.callIcon}>📞</Text>
                </View>
                <View style={styles.callCardText}>
                  <Text style={styles.callName}>{item.name}</Text>
                  <Text style={styles.callNumber}>{item.number}</Text>
                </View>
                <View style={styles.callNowBadge}>
                  <Text style={styles.callNowText}>CALL</Text>
                </View>
              </TouchableOpacity>
            ))}

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
    paddingTop: 16,
    paddingBottom: 20,
    zIndex: 1,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
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
    marginTop: 6,
  },
  callCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 57, 53, 0.2)',
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
    marginTop: 8,
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
});