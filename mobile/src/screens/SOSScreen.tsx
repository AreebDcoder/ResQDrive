import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import * as Location from 'expo-location';
import api from '../api/axios';

interface EmergencyNumberItem {
  id: string;
  name: string;
  number: string;
}

export default function SOSScreen({ navigation }: { navigation: any }) {
  const [numbers, setNumbers] = useState<EmergencyNumberItem[]>([]);
  const [region, setRegion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Emergency SOS</Text>
          <Text style={styles.subtitle}>
            {region ? formatRegionLabel(region) : 'Detecting your location...'}
          </Text>
        </View>
      </View>

      {isLoading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#d32f2f" />
          <Text style={styles.loadingText}>Finding emergency services near you...</Text>
        </View>
      )}

      {!isLoading && errorMsg && (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchEmergencyNumbers}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !errorMsg && (
        <ScrollView contentContainerStyle={styles.listContent}>
          <Text style={styles.sectionLabel}>REGIONAL EMERGENCY SERVICES</Text>
          {numbers.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.callCard}
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
            <Text style={styles.noteText}>
              These calls work as standard cellular calls and do not require internet access.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  backBtnText: { color: '#ffffff', fontSize: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 13, color: '#888888', marginTop: 2 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  loadingText: { color: '#888888', fontSize: 15, marginTop: 16, textAlign: 'center' },
  errorIcon: { fontSize: 40, marginBottom: 12 },
  errorText: { color: '#cccccc', fontSize: 15, textAlign: 'center', marginBottom: 20 },
  retryBtn: { backgroundColor: '#d32f2f', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 8 },
  retryBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  sectionLabel: {
    color: '#777777',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 14,
    marginTop: 6,
  },
  callCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#d32f2f',
  },
  callIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2a1414',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  callIcon: { fontSize: 22 },
  callCardText: { flex: 1 },
  callName: { color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  callNumber: { color: '#999999', fontSize: 14 },
  callNowBadge: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  callNowText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13, letterSpacing: 0.5 },
  noteBox: {
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
  },
  noteText: { color: '#777777', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});