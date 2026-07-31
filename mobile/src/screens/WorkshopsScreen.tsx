// ═══════════════════════════════════════════════════════════════
// ResQDrive v2 — WORKSHOPS SCREEN (Modernized)
// All imports, logic, state, handlers preserved identically.
// Only JSX structure + StyleSheet updated: dark glassmorphism theme.
// ═══════════════════════════════════════════════════════════════
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

interface Workshop {
  name: string;
  address: string;
  phoneNumber: string;
  specialization: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  durationText: string;
  durationSeconds: number;
}

export default function WorkshopsScreen({ navigation, isInline }: { navigation: any; isInline?: boolean }) {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchWorkshops = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission is required to find nearby workshops.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;

      const response = await api.get('/workshops/nearest', {
        params: { lat: latitude, lng: longitude },
      });

      setWorkshops(response.data.workshops || []);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || 'Could not fetch nearby workshops. Check your connection.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkshops();
  }, [fetchWorkshops]);

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const openNavigation = (workshop: Workshop) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${workshop.lat},${workshop.lng}`;
    Linking.openURL(url);
  };

  const callWorkshop = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const renderWorkshopCard = ({ item, index }: { item: Workshop; index: number }) => (
    <View style={[styles.card, index === 0 && styles.cardNearest]}>
      {index === 0 && (
        <View style={styles.nearestBadge}>
          <Text style={styles.nearestBadgeText}>⚡ NEAREST</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>🔧</Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.workshopName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.workshopAddress} numberOfLines={1}>
            {item.address}
          </Text>
          <View style={styles.specializationBadge}>
            <Text style={styles.specializationText}>{item.specialization}</Text>
          </View>
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

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => callWorkshop(item.phoneNumber)}
          activeOpacity={0.8}
        >
          <Text style={styles.callBtnText}>📞 Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navigateBtn}
          onPress={() => openNavigation(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.navigateBtnText}>Navigate</Text>
          <Text style={styles.navigateBtnArrow}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        {!isInline && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.title}>🔧 Nearby Workshops</Text>
          <Text style={styles.subtitle}>Verified mechanics near you</Text>
        </View>
      </View>

      {isLoading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#E53935" />
          <Text style={styles.loadingText}>Finding nearby workshops...</Text>
        </View>
      )}

      {!isLoading && errorMsg && (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchWorkshops()}>
            <Text style={styles.retryBtnText}>🔄 Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !errorMsg && workshops.length === 0 && (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>🔍</Text>
          <Text style={styles.errorText}>No verified workshops found nearby yet.</Text>
        </View>
      )}

      {!isLoading && !errorMsg && workshops.length > 0 && (
        <FlatList
          data={workshops}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          renderItem={renderWorkshopCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchWorkshops(true)}
              tintColor="#E53935"
              colors={['#E53935']}
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
    backgroundColor: '#0A0A0F',
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
    borderRadius: 12,
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 13,
    color: '#A0A0B8',
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: '#A0A0B8',
    fontSize: 15,
    marginTop: 16,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#E53935',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  cardNearest: {
    borderColor: 'rgba(229, 57, 53, 0.35)',
    borderWidth: 1.5,
    backgroundColor: 'rgba(229, 57, 53, 0.04)',
  },
  nearestBadge: {
    position: 'absolute',
    top: -1,
    right: 16,
    backgroundColor: '#E53935',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  nearestBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(229, 57, 53, 0.12)',
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
  workshopName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  workshopAddress: {
    color: '#A0A0B8',
    fontSize: 13,
    marginBottom: 6,
  },
  specializationBadge: {
    backgroundColor: 'rgba(229, 57, 53, 0.12)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(229, 57, 53, 0.25)',
  },
  specializationText: {
    color: '#FF8A80',
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 10, 15, 0.5)',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    color: '#6B6B80',
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callBtn: {
    flex: 1,
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  callBtnText: {
    color: '#00E676',
    fontWeight: '700',
    fontSize: 15,
  },
  navigateBtn: {
    flex: 1,
    backgroundColor: '#E53935',
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  navigateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    marginRight: 6,
  },
  navigateBtnArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});