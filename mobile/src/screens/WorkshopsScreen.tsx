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
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';
import { useToast } from '../components/ui/Toast';
import { colors, darkColors, tints } from '../theme/tokens';

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
  isVerifiedPartner?: boolean;
}

let memoryWorkshopsCache: Workshop[] = [];

export default function WorkshopsScreen({ navigation, isInline }: { navigation: any; isInline?: boolean }) {
  const toast = useToast();
  const [workshops, setWorkshops] = useState<Workshop[]>(memoryWorkshopsCache);
  const [isLoading, setIsLoading] = useState(memoryWorkshopsCache.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchWorkshops = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else if (memoryWorkshopsCache.length === 0) {
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
        console.log('Location acquisition fallback in WorkshopsScreen:', locErr);
      }

      const response = await api.get('/workshops/nearest', {
        params: { lat: latitude, lng: longitude },
        timeout: 5000,
      });

      const items = response.data.workshops || [];
      if (items.length > 0) {
        memoryWorkshopsCache = items;
        setWorkshops(items);
      } else if (memoryWorkshopsCache.length > 0) {
        setWorkshops(memoryWorkshopsCache);
      }
    } catch (err: any) {
      if (memoryWorkshopsCache.length > 0) {
        setWorkshops(memoryWorkshopsCache);
      } else {
        setErrorMsg(
          err.response?.data?.message || 'Could not fetch nearby workshops. Check your connection.',
        );
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkshops();
    const unsubscribe = navigation?.addListener?.('focus', () => {
      fetchWorkshops();
    });
    return unsubscribe;
  }, [navigation, fetchWorkshops]);

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const openNavigation = (workshop: Workshop) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${workshop.lat},${workshop.lng}`;
    Linking.openURL(url);
  };

  const callWorkshop = (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.includes('Navigation') || phoneNumber.includes('N/A')) {
      toast.error('Direct phone number is not listed for this public garage. Please tap Navigate for directions.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const renderWorkshopCard = ({ item, index }: { item: Workshop; index: number }) => (
    <View style={[styles.card, item.isVerifiedPartner && styles.cardPartner, index === 0 && !item.isVerifiedPartner && styles.cardNearest]}>
      {item.isVerifiedPartner ? (
        <View style={styles.partnerBadge}>
          <Text style={styles.partnerBadgeText}>⭐ VERIFIED PARTNER</Text>
        </View>
      ) : index === 0 ? (
        <View style={styles.nearestBadge}>
          <Text style={styles.nearestBadgeText}>NEAREST</Text>
        </View>
      ) : null}

      <View style={styles.cardHeader}>
        <View style={[styles.iconCircle, item.isVerifiedPartner && styles.iconCirclePartner]}>
          <Ionicons name="construct-outline" size={24} color={item.isVerifiedPartner ? colors.success[400] : colors.danger[500]} />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.workshopName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.workshopAddress} numberOfLines={1}>
            {item.address}
          </Text>
          <View style={[styles.specializationBadge, item.isVerifiedPartner && styles.specializationBadgePartner]}>
            <Text style={[styles.specializationText, item.isVerifiedPartner && styles.specializationTextPartner]}>
              {item.specialization}
            </Text>
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
        {item.phoneNumber && !item.phoneNumber.includes('Navigation') && !item.phoneNumber.includes('N/A') ? (
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => callWorkshop(item.phoneNumber)}
            activeOpacity={0.8} accessibilityRole="button"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="call-outline" size={16} color={colors.success[400]} style={{ marginRight: 6 }} />
              <Text style={styles.callBtnText}>Call</Text>
            </View>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.navigateBtn, (!item.phoneNumber || item.phoneNumber.includes('Navigation') || item.phoneNumber.includes('N/A')) && { flex: 1 }]}
          onPress={() => openNavigation(item)}
          activeOpacity={0.8} accessibilityRole="button"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="navigate-outline" size={16} color={darkColors.text} style={{ marginRight: 6 }} />
            <Text style={styles.navigateBtnText}>Navigate</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        {!isInline && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={20} color={darkColors.text} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.title} accessibilityRole="header">Nearby Workshops</Text>
          <Text style={styles.subtitle}>Verified mechanics near you</Text>
        </View>
      </View>

      {isLoading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.danger[500]} />
          <Text style={styles.loadingText}>Finding nearby workshops...</Text>
        </View>
      )}

      {!isLoading && errorMsg && (
        <View style={styles.centerContainer}>
          <Ionicons name="warning-outline" size={48} color={colors.danger[400]} style={{ marginBottom: 12 }} />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchWorkshops()} accessibilityRole="button">
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="refresh-outline" size={16} color={darkColors.text} style={{ marginRight: 6 }} />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !errorMsg && workshops.length === 0 && (
        <View style={styles.centerContainer}>
          <Ionicons name="search-outline" size={48} color={darkColors.textTertiary} style={{ marginBottom: 12 }} />
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
  cardPartner: {
    borderColor: tints.successMedium,
    borderWidth: 1.5,
    backgroundColor: tints.successSubtle,
  },
  partnerBadge: {
    position: 'absolute',
    top: -1,
    right: 16,
    backgroundColor: colors.success[500],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  partnerBadgeText: {
    color: darkColors.background,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
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
    alignItems: 'flex-start',
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
  iconCirclePartner: {
    backgroundColor: tints.successSubtle,
  },
  iconText: {
    fontSize: 22,
  },
  cardHeaderText: {
    flex: 1,
  },
  workshopName: {
    color: darkColors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  workshopAddress: {
    color: darkColors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
  },
  specializationBadge: {
    backgroundColor: tints.dangerLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: tints.dangerMedium,
  },
  specializationBadgePartner: {
    backgroundColor: tints.successSubtle,
    borderColor: tints.successMedium,
  },
  specializationText: {
    color: colors.danger[300],
    fontSize: 11,
    fontWeight: '700',
  },
  specializationTextPartner: {
    color: colors.success[500],
    fontSize: 11,
    fontWeight: '700',
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callBtn: {
    flex: 1,
    backgroundColor: tints.successSubtle,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tints.successMedium,
  },
  callBtnText: {
    color: colors.success[500],
    fontWeight: '700',
    fontSize: 15,
  },
  navigateBtn: {
    flex: 1,
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