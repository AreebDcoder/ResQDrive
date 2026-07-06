import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import * as Location from 'expo-location';
import api from '../api/axios';

interface Hospital {
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  durationText: string;
  durationSeconds: number;
}

export default function HospitalsScreen({ navigation }: { navigation: any }) {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchHospitals = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission is required to find nearby hospitals.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;

      const response = await api.get('/hospitals/nearest', {
        params: { lat: latitude, lng: longitude },
      });

      setHospitals(response.data.hospitals || []);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || 'Could not fetch nearby hospitals. Check your connection.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const openNavigation = (hospital: Hospital) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`;
    Linking.openURL(url);
  };

  const renderHospitalCard = ({ item, index }: { item: Hospital; index: number }) => (
    <View style={[styles.card, index === 0 && styles.cardNearest]}>
      {index === 0 && (
        <View style={styles.nearestBadge}>
          <Text style={styles.nearestBadgeText}>NEAREST</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>🏥</Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.hospitalName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.hospitalAddress} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatDistance(item.distanceMeters)}</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{item.durationText}</Text>
          <Text style={styles.statLabel}>ETA</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.navigateBtn}
        onPress={() => openNavigation(item)}
        activeOpacity={0.8}
      >
        <Text style={styles.navigateBtnText}>Navigate</Text>
        <Text style={styles.navigateBtnArrow}>→</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Nearest Hospitals</Text>
          <Text style={styles.subtitle}>Emergency medical care near you</Text>
        </View>
      </View>

      {isLoading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#d32f2f" />
          <Text style={styles.loadingText}>Locating nearby hospitals...</Text>
        </View>
      )}

      {!isLoading && errorMsg && (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchHospitals()}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !errorMsg && hospitals.length === 0 && (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>🔍</Text>
          <Text style={styles.errorText}>No hospitals found nearby.</Text>
        </View>
      )}

      {!isLoading && !errorMsg && hospitals.length > 0 && (
        <FlatList
          data={hospitals}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          renderItem={renderHospitalCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchHospitals(true)}
              tintColor="#d32f2f"
              colors={['#d32f2f']}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
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
  backBtnText: {
    color: '#ffffff',
    fontSize: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 13,
    color: '#888888',
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: '#888888',
    fontSize: 15,
    marginTop: 16,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorText: {
    color: '#cccccc',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardNearest: {
    borderColor: '#d32f2f',
    borderWidth: 1.5,
  },
  nearestBadge: {
    position: 'absolute',
    top: -1,
    right: 16,
    backgroundColor: '#d32f2f',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  nearestBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2a1414',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 22,
  },
  cardHeaderText: {
    flex: 1,
  },
  hospitalName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  hospitalAddress: {
    color: '#999999',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#141414',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    color: '#777777',
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#2a2a2a',
  },
  navigateBtn: {
    backgroundColor: '#d32f2f',
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#d32f2f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  navigateBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
    marginRight: 6,
  },
  navigateBtnArrow: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});