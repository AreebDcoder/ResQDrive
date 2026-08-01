import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, SafeAreaView, Alert, StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import {
  fetchIncidents, setFilters, clearFilters, clearCurrent,
} from '../store/slices/incidentsSlice';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';

const SEVERITY_COLORS: Record<string, string> = {
  NONE: '#6B6B80', MINOR: '#FFD600', MODERATE: '#FF9100', SEVERE: '#FF1744',
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#FF1744', RESOLVED: '#00E676', FALSE_ALARM: '#6B6B80', ARCHIVED: '#4A4A5A',
};
const SEVERITY_FILTERS = ['ALL', 'MINOR', 'MODERATE', 'SEVERE'];

export default function IncidentsListScreen({ navigation }: { navigation: any }) {
  const dispatch = useDispatch<any>();
  const { list, isLoading, isRefreshing, error, meta, filters } = useSelector(
    (state: RootState) => state.incidents
  );

  useEffect(() => {
    dispatch(clearCurrent());
    dispatch(fetchIncidents({ page: 1, refresh: true }));
  }, [dispatch, filters]);

  const onRefresh = useCallback(() => {
    dispatch(fetchIncidents({ page: 1, refresh: true }));
  }, [dispatch]);

  const onLoadMore = useCallback(() => {
    if (meta.page < meta.totalPages && !isLoading) {
      dispatch(fetchIncidents({ page: meta.page + 1 }));
    }
  }, [dispatch, meta, isLoading]);

  const onFilterChange = (sev: string) => {
    if (sev === 'ALL') dispatch(clearFilters());
    else dispatch(setFilters({ severity: sev }));
  };

  const handleDeleteIncident = (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this incident record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/incidents/${id}`);
              dispatch(fetchIncidents({ page: 1, refresh: true }));
            } catch (err) {
              Alert.alert('Error', 'Failed to delete incident.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const date = new Date(item.occurredAt).toLocaleString();
    const isSevere = item.severity === 'SEVERE';
    return (
      <View style={[styles.card, isSevere && styles.cardSevere]}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => navigation.navigate('IncidentDetail', { id: item.id })}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View style={styles.badgesRow}>
              <View style={[styles.badge, { backgroundColor: SEVERITY_COLORS[item.severity] || '#6B6B80' }]}>
                <Text style={styles.badgeText}>{item.severity}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] || '#4A4A5A' }]}>
                <Text style={styles.badgeText}>{item.status.replace('_', ' ')}</Text>
              </View>
            </View>
            <Text style={styles.cardType}>{item.type === 'AUTO' ? '🤖 Auto' : '✍️ Manual'}</Text>
          </View>
          <Text style={styles.cardDate}>{date}</Text>
          {item.address ? (
            <Text style={styles.cardAddress} numberOfLines={1}>📍 {item.address}</Text>
          ) : null}
          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
        </TouchableOpacity>

        {item.status !== 'ARCHIVED' && (
          <TouchableOpacity
            style={styles.deleteCardBtn}
            onPress={() => handleDeleteIncident(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.deleteIconBg}>
              <Ionicons name="trash-outline" size={16} color="#FF5252" />
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      {/* Background glow */}
      <View style={styles.bgGlow} />

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {SEVERITY_FILTERS.map((sev) => {
          const active = (sev === 'ALL' && !filters.severity) || filters.severity === sev;
          return (
            <TouchableOpacity
              key={sev}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => onFilterChange(sev)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{sev}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error && !isLoading ? (
        <View style={styles.centerContent}>
          <View style={styles.errorBadge}>
            <Ionicons name="alert-circle-outline" size={40} color="#FF5252" />
          </View>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#E53935']}
              tintColor="#E53935"
            />
          }
          contentContainerStyle={list.length === 0 ? { flex: 1, justifyContent: 'center' } : { padding: 20 }}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.centerContent}>
                <View style={styles.emptyIconBg}>
                  <Ionicons name="document-text-outline" size={48} color="#6B6B80" />
                </View>
                <Text style={styles.emptyText}>No incidents recorded yet.</Text>
                <Text style={styles.emptySubtext}>Tap the + button to log your first incident.</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            meta.page < meta.totalPages ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={onLoadMore} disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color="#E53935" />
                ) : (
                  <Text style={styles.loadMoreText}>Load More</Text>
                )}
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateIncident', { mode: 'create' })}
        activeOpacity={0.85}
      >
        <View style={styles.fabGradient} />
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  bgGlow: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(229, 57, 53, 0.06)',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
    zIndex: 1,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterChipActive: {
    backgroundColor: '#E53935',
    borderColor: '#E53935',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  filterChipText: { color: '#A0A0B8', fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: '#FFFFFF' },
  card: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  cardSevere: {
    borderColor: 'rgba(255, 23, 68, 0.3)',
    shadowColor: '#FF1744',
    shadowOpacity: 0.15,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  cardType: { color: '#6B6B80', fontSize: 11 },
  cardDate: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  cardAddress: { color: '#A0A0B8', fontSize: 12, marginBottom: 4 },
  cardDesc: { color: '#A0A0B8', fontSize: 13, lineHeight: 18 },
  deleteCardBtn: {
    padding: 6,
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 82, 82, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: { color: '#FF5252', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  retryBtn: {
    backgroundColor: '#E53935',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },
  emptyIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptySubtext: { color: '#6B6B80', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  loadMoreBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  loadMoreText: { color: '#E53935', fontSize: 14, fontWeight: '700' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    overflow: 'hidden',
  },
  fabGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E53935',
  },
  fabText: { color: '#FFFFFF', fontSize: 30, fontWeight: '700', zIndex: 1, marginTop: -2 },
});