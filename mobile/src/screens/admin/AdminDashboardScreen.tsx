import React, { useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Linking, Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import {
  fetchAnalyticsSummary, fetchAnalyticsTrends, fetchAnalyticsHotspots,
  refreshAllAnalytics,
} from '../../store/slices/adminSlice';

const SEVERITY_COLORS: Record<string, string> = {
  NONE: '#6B6B80', MINOR: '#FFD600', MODERATE: '#FF9100', SEVERE: '#FF1744',
};

export default function AdminDashboardScreen() {
  const dispatch = useDispatch<any>();
  const { summary, trends, hotspots, isLoading, isRefreshing, error } = useSelector(
    (state: RootState) => state.admin
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    dispatch(fetchAnalyticsSummary());
    dispatch(fetchAnalyticsTrends());
    dispatch(fetchAnalyticsHotspots());
  }, [dispatch]);

  const onRefresh = useCallback(() => { dispatch(refreshAllAnalytics()); }, [dispatch]);

  const maxTrend = Math.max(...trends.map(t => t.count), 1);

  if (isLoading && !summary) {
    return (
      <View style={styles.outer}>
        <View style={StyleSheet.absoluteFillObject}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0A0A0F' }]} />
          <View style={[StyleSheet.absoluteFillObject, styles.gradTop]} />
          <View style={[StyleSheet.absoluteFillObject, styles.gradBottom]} />
        </View>
        <View style={styles.center}>
          <View style={styles.glassCard}>
            <ActivityIndicator color="#E53935" size="large" />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (error && !summary) {
    return (
      <View style={styles.outer}>
        <View style={StyleSheet.absoluteFillObject}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0A0A0F' }]} />
          <View style={[StyleSheet.absoluteFillObject, styles.gradTop]} />
        </View>
        <View style={styles.center}>
          <View style={styles.glassCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => onRefresh()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.outer}>
      <View style={StyleSheet.absoluteFillObject}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0A0A0F' }]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradTop]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradBottom]} />
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#E53935']} tintColor="#E53935" />}
        >
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.cardsRow}>
            <View style={[styles.card, { borderLeftColor: '#E53935' }]}>
              <Text style={styles.cardValue}>{summary?.totalIncidents ?? 0}</Text>
              <Text style={styles.cardLabel}>Total</Text>
            </View>
            <View style={[styles.card, { borderLeftColor: '#FF9100' }]}>
              <Text style={styles.cardValue}>{summary?.activeIncidents ?? 0}</Text>
              <Text style={styles.cardLabel}>Active</Text>
            </View>
            <View style={[styles.card, { borderLeftColor: '#00E676' }]}>
              <Text style={styles.cardValue}>{summary?.resolvedIncidents ?? 0}</Text>
              <Text style={styles.cardLabel}>Resolved</Text>
            </View>
            <View style={[styles.card, { borderLeftColor: '#6B6B80' }]}>
              <Text style={styles.cardValue}>{summary?.falseAlarms ?? 0}</Text>
              <Text style={styles.cardLabel}>False Alarms</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Severity Breakdown</Text>
          <View style={styles.panel}>
            {['NONE', 'MINOR', 'MODERATE', 'SEVERE'].map((sev) => {
              const pct = summary?.severityPercentages?.[sev as keyof typeof summary.severityPercentages] ?? 0;
              const count = summary?.severityBreakdown?.[sev as keyof typeof summary.severityBreakdown] ?? 0;
              return (
                <View key={sev} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: SEVERITY_COLORS[sev] }]}>{sev}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: SEVERITY_COLORS[sev] }]} />
                  </View>
                  <Text style={styles.barCount}>{count} ({pct}%)</Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Incident Trends (Last 30 Days)</Text>
          <View style={styles.panel}>
            <View style={styles.chartRow}>
              {trends.map((t, i) => {
                const heightPct = (t.count / maxTrend) * 100;
                return (
                  <View key={i} style={styles.chartBarWrap}>
                    <View style={styles.chartBarTrack}>
                      <View
                        style={[
                          styles.chartBar,
                          { height: `${Math.max(heightPct, t.count > 0 ? 8 : 2)}%`, backgroundColor: t.count > 0 ? '#E53935' : 'rgba(255, 255, 255, 0.04)' },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={styles.chartLegend}>
              <Text style={styles.chartLegendText}>
                {trends[0]?.date.slice(5)} → {trends[trends.length - 1]?.date.slice(5)}
              </Text>
              <Text style={styles.chartLegendText}>Peak: {maxTrend}/day</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Top Incident Hotspots</Text>
          {hotspots.length === 0 ? (
            <View style={styles.panel}>
              <Text style={styles.emptyText}>No geotagged incidents yet.</Text>
            </View>
          ) : (
            hotspots.map((h, i) => (
              <View key={i} style={styles.hotspotCard}>
                <View style={styles.hotspotHeader}>
                  <Text style={styles.hotspotRank}>#{i + 1}</Text>
                  <Text style={styles.hotspotCount}>{h.incidentCount} incidents</Text>
                </View>
                <Text style={styles.hotspotCoords}>
                  📍 {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}
                </Text>
                {h.sampleAddresses.length > 0 && (
                  <Text style={styles.hotspotAddr} numberOfLines={2}>
                    {h.sampleAddresses.join(' • ')}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.mapsBtn}
                  onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}`)}
                >
                  <Text style={styles.mapsBtnText}>Open in Google Maps</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.panel}>
            {summary?.recentIncidents.length === 0 ? (
              <Text style={styles.emptyText}>No recent incidents.</Text>
            ) : (
              summary?.recentIncidents.map((inc) => (
                <View key={inc.id} style={styles.recentRow}>
                  <View style={[styles.recentBadge, { backgroundColor: SEVERITY_COLORS[inc.severity] || '#6B6B80' }]}>
                    <Text style={styles.recentBadgeText}>{inc.severity}</Text>
                  </View>
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentDate}>{new Date(inc.occurredAt).toLocaleString()}</Text>
                    {inc.address ? <Text style={styles.recentAddr} numberOfLines={1}>{inc.address}</Text> : null}
                  </View>
                  <Text style={styles.recentStatus}>{inc.status.replace('_', ' ')}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#0A0A0F' },
  gradTop: { top: 0, height: 300, backgroundColor: 'rgba(229, 57, 53, 0.08)' },
  gradBottom: { bottom: 0, height: 400, backgroundColor: 'rgba(41, 121, 255, 0.06)' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  glassCard: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)', borderRadius: 20, padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  loadingText: { color: '#A0A0B8', marginTop: 12 },
  errorText: { color: '#FF8A80', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    backgroundColor: '#E53935', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12,
    shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: 'bold' },
  sectionTitle: { color: '#E53935', fontSize: 14, fontWeight: 'bold', marginTop: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: {
    flex: 1, minWidth: '47%', backgroundColor: 'rgba(28, 28, 46, 0.6)', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', borderLeftWidth: 4,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  cardValue: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' },
  cardLabel: { color: '#A0A0B8', fontSize: 11, marginTop: 4, textTransform: 'uppercase' },
  panel: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barLabel: { width: 70, fontSize: 11, fontWeight: 'bold' },
  barTrack: { flex: 1, height: 12, backgroundColor: 'rgba(10, 10, 15, 0.6)', borderRadius: 6, marginRight: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6 },
  barCount: { width: 70, fontSize: 11, color: '#A0A0B8', textAlign: 'right' },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 2 },
  chartBarWrap: { flex: 1, height: '100%' },
  chartBarTrack: { flex: 1, justifyContent: 'flex-end', height: '100%' },
  chartBar: { width: '100%', minHeight: 2, borderRadius: 2 },
  chartLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  chartLegendText: { color: '#6B6B80', fontSize: 10 },
  hotspotCard: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)', borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  hotspotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  hotspotRank: { color: '#E53935', fontSize: 18, fontWeight: 'bold' },
  hotspotCount: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  hotspotCoords: { color: '#A0A0B8', fontSize: 12, marginBottom: 4 },
  hotspotAddr: { color: '#6B6B80', fontSize: 11, marginBottom: 8 },
  mapsBtn: {
    alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: 'rgba(41, 121, 255, 0.12)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(41, 121, 255, 0.3)',
  },
  mapsBtnText: { color: '#2979FF', fontSize: 12, fontWeight: '600' },
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.04)' },
  recentBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, marginRight: 10 },
  recentBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  recentInfo: { flex: 1 },
  recentDate: { color: '#A0A0B8', fontSize: 12 },
  recentAddr: { color: '#6B6B80', fontSize: 11, marginTop: 2 },
  recentStatus: { color: '#6B6B80', fontSize: 11, textTransform: 'capitalize' },
  emptyText: { color: '#6B6B80', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
});