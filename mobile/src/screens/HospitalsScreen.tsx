// ═══════════════════════════════════════════════════════════════
// ResQDrive v2 — HOSPITALS SCREEN (Modernized)
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
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';
import { colors, darkColors, tints } from '../theme/tokens';

interface Hospital {
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  durationText: string;
  durationSeconds: number;
}

let memoryHospitalsCache: Hospital[] = [];

export default function HospitalsScreen({ navigation, isInline }: { navigation: any; isInline?: boolean }) {
  const [hospitals, setHospitals] = useState<Hospital[]>(memoryHospitalsCache);
  const [isLoading, setIsLoading] = useState(memoryHospitalsCache.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchHospitals = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else if (memoryHospitalsCache.length === 0) {
      setIsLoading(true);
    }
    setErrorMsg(null);

    try {
      let latitude = 33.6844;
      let longitude = 73.0479;

      // Ultra-fast non-blocking location race (max 1.2s)
      try {
        const getLocationQuick = async () => {
          try {
            const { status } = await Location.getForegroundPermissionsAsync();
            let hasPerm = status === 'granted';
            if (!hasPerm) {
              const req = await Location.requestForegroundPermissionsAsync();
              hasPerm = req.status === 'granted';
            }
            if (hasPerm) {
              const loc =
                (await Location.getLastKnownPositionAsync({})) ||
                (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
              if (loc?.coords) {
                return { lat: loc.coords.latitude, lng: loc.coords.longitude };
              }
            }
          } catch (e) {}
          return null;
        };

        const locResult = await Promise.race([
          getLocationQuick(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)),
        ]);

        if (locResult) {
          latitude = locResult.lat;
          longitude = locResult.lng;
        }
      } catch (locErr) {
      }

      const response = await api.get('/hospitals/nearest', {
        params: { lat: latitude, lng: longitude },
        timeout: 5000,
      });

      const items = response.data.hospitals || [];
      if (items.length > 0) {
        memoryHospitalsCache = items;
        setHospitals(items);
      } else if (memoryHospitalsCache.length > 0) {
        setHospitals(memoryHospitalsCache);
      }
    } catch (err: any) {
      if (memoryHospitalsCache.length > 0) {
        setHospitals(memoryHospitalsCache);
      } else {
        setErrorMsg(
          err.response?.data?.message || 'Could not fetch nearby hospitals. Check your connection.',
        );
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHospitals();
    const unsubscribe = navigation?.addListener?.('focus', () => {
      fetchHospitals();
    });
    return unsubscribe;
  }, [navigation, fetchHospitals]);

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
          <Text style={styles.nearestBadgeText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>NEAREST</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <View style={styles.iconCircle}>
          <Ionicons name="medical-outline" size={24} color={colors.danger[500]} />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.hospitalName} numberOfLines={2} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
            {item.name}
          </Text>
          <Text style={styles.hospitalAddress} numberOfLines={1} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
            {item.address}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{formatDistance(item.distanceMeters)}</Text>
          <Text style={styles.statLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Distance</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{item.durationText}</Text>
          <Text style={styles.statLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>ETA</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.navigateBtn}
        onPress={() => openNavigation(item)}
        activeOpacity={0.8} accessibilityRole="button"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="navigate-outline" size={16} color={darkColors.text} style={{ marginRight: 6 }} />
          <Text style={styles.navigateBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Navigate</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        {!isInline && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={20} color={darkColors.text} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.title} accessibilityRole="header" allowFontScaling={true} maxFontSizeMultiplier={1.5}>Nearest Hospitals</Text>
          <Text style={styles.subtitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Emergency medical care near you</Text>
        </View>
      </View>

      {isLoading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.danger[500]} />
          <Text style={styles.loadingText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Locating nearby hospitals...</Text>
        </View>
      )}

      {!isLoading && errorMsg && (
        <View style={styles.centerContainer}>
          <Ionicons name="warning-outline" size={48} color={colors.danger[400]} style={{ marginBottom: 12 }} />
          <Text style={styles.errorText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchHospitals()} accessibilityRole="button">
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="refresh-outline" size={16} color={darkColors.text} style={{ marginRight: 6 }} />
              <Text style={styles.retryBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Try Again</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !errorMsg && hospitals.length === 0 && (
        <View style={styles.centerContainer}>
          <Ionicons name="search-outline" size={48} color={darkColors.textTertiary} style={{ marginBottom: 12 }} />
          <Text style={styles.errorText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>No hospitals found nearby.</Text>
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
              tintColor={colors.danger[500]}
              colors={[colors.danger[500]]}
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
    backgroundColor: darkColors.background,
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
    backgroundColor: tints.glassCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
  },
  backBtnText: {
    color: darkColors.text,
    fontSize: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: darkColors.text,
  },
  subtitle: {
    fontSize: 13,
    color: darkColors.textSecondary,
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: darkColors.textSecondary,
    fontSize: 15,
    marginTop: 16,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorText: {
    color: darkColors.text,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: colors.danger[500],
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryBtnText: {
    color: darkColors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: tints.glassCard,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    shadowColor: darkColors.background,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  cardNearest: {
    borderColor: tints.dangerMedium,
    borderWidth: 1.5,
    backgroundColor: tints.dangerSubtle,
  },
  nearestBadge: {
    position: 'absolute',
    top: -1,
    right: 16,
    backgroundColor: colors.danger[500],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  nearestBadgeText: {
    color: darkColors.text,
    fontSize: 10,
    fontWeight: '700',
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
    backgroundColor: tints.dangerLight,
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
    color: darkColors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  hospitalAddress: {
    color: darkColors.textSecondary,
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: tints.overlayLight,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: darkColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    color: darkColors.textTertiary,
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: tints.whiteBorder,
  },
  navigateBtn: {
    backgroundColor: colors.danger[500],
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  navigateBtnText: {
    color: darkColors.text,
    fontWeight: '700',
    fontSize: 15,
    marginRight: 6,
  },
  navigateBtnArrow: {
    color: darkColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
});