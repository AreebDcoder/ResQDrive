import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Linking,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import {
  fetchAnalyticsSummary, fetchAnalyticsTrends, fetchAnalyticsHotspots,
  refreshAllAnalytics,
} from '../../store/slices/adminSlice';

const SEVERITY_COLORS: Record<string, string> = {
  NONE: '#666666', MINOR: '#fbc02d', MODERATE: '#f57c00', SEVERE: '#d32f2f',
};

export default function AdminDashboardScreen() {
  const dispatch = useDispatch<any>();
  const { summary, trends, hotspots, isLoading, isRefreshing, error } = useSelector(
    (state: RootState) => state.admin
  );

  useEffect(() => {
    dispatch(fetchAnalyticsSummary());
    dispatch(fetchAnalyticsTrends());
    dispatch(fetchAnalyticsHotspots());
  }, [dispatch]);

  const onRefresh = useCallback(() => { dispatch(refreshAllAnalytics()); }, [dispatch]);

  const maxTrend = Math.max(...trends.map(t => t.count), 1);

  if (isLoading && !summary) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#d32f2f" size="large" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error && !summary) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => onRefresh()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#d32f2f']} tintColor="#d32f2f" />}
    >
      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.cardsRow}>
        <View style={[styles.card, { borderLeftColor: '#d32f2f' }]}>
          <Text style={styles.cardValue}>{summary?.totalIncidents ?? 0}</Text>
          <Text style={styles.cardLabel}>Total</Text>
        </View>
        <View style={[styles.card, { borderLeftColor: '#f57c00' }]}>
          <Text style={styles.cardValue}>{summary?.activeIncidents ?? 0}</Text>
          <Text style={styles.cardLabel}>Active</Text>
        </View>
        <View style={[styles.card, { borderLeftColor: '#388e3c' }]}>
          <Text style={styles.cardValue}>{summary?.resolvedIncidents ?? 0}</Text>
          <Text style={styles.cardLabel}>Resolved</Text>
        </View>
        <View style={[styles.card, { borderLeftColor: '#666666' }]}>
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
                      { height: `${Math.max(heightPct, t.count > 0 ? 8 : 2)}%`, backgroundColor: t.count > 0 ? '#d32f2f' : '#2e2e2e' },
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
              <View style={[styles.recentBadge, { backgroundColor: SEVERITY_COLORS[inc.severity] || '#666' }]}>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  center: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: '#888888', marginTop: 12 },
  errorText: { color: '#ff8a80', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#d32f2f', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 6 },
  retryBtnText: { color: '#ffffff', fontWeight: 'bold' },
  sectionTitle: { color: '#d32f2f', fontSize: 14, fontWeight: 'bold', marginTop: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: {
    flex: 1, minWidth: '47%', backgroundColor: '#1e1e1e', borderRadius: 8, padding: 14,
    borderWidth: 1, borderColor: '#2e2e2e', borderLeftWidth: 4,
  },
  cardValue: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  cardLabel: { color: '#888888', fontSize: 11, marginTop: 4, textTransform: 'uppercase' },
  panel: { backgroundColor: '#1e1e1e', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#2e2e2e' },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barLabel: { width: 70, fontSize: 11, fontWeight: 'bold' },
  barTrack: { flex: 1, height: 12, backgroundColor: '#0a0a0a', borderRadius: 6, marginRight: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6 },
  barCount: { width: 70, fontSize: 11, color: '#cccccc', textAlign: 'right' },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 2 },
  chartBarWrap: { flex: 1, height: '100%' },
  chartBarTrack: { flex: 1, justifyContent: 'flex-end', height: '100%' },
  chartBar: { width: '100%', minHeight: 2, borderRadius: 2 },
  chartLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  chartLegendText: { color: '#666666', fontSize: 10 },
  hotspotCard: { backgroundColor: '#1e1e1e', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2e2e2e' },
  hotspotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  hotspotRank: { color: '#d32f2f', fontSize: 18, fontWeight: 'bold' },
  hotspotCount: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  hotspotCoords: { color: '#cccccc', fontSize: 12, marginBottom: 4 },
  hotspotAddr: { color: '#888888', fontSize: 11, marginBottom: 8 },
  mapsBtn: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#2a2a2a', borderRadius: 6 },
  mapsBtnText: { color: '#d32f2f', fontSize: 12, fontWeight: '600' },
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  recentBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4, marginRight: 10 },
  recentBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },
  recentInfo: { flex: 1 },
  recentDate: { color: '#cccccc', fontSize: 12 },
  recentAddr: { color: '#888888', fontSize: 11, marginTop: 2 },
  recentStatus: { color: '#888888', fontSize: 11, textTransform: 'capitalize' },
  emptyText: { color: '#666666', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
});