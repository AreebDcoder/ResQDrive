import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, SafeAreaView, Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import {
  fetchIncidents, setFilters, clearFilters, clearCurrent,
} from '../store/slices/incidentsSlice';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';

const SEVERITY_COLORS: Record<string, string> = {
  NONE: '#666666', MINOR: '#fbc02d', MODERATE: '#f57c00', SEVERE: '#d32f2f',
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#d32f2f', RESOLVED: '#388e3c', FALSE_ALARM: '#666666', ARCHIVED: '#444444',
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
    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => navigation.navigate('IncidentDetail', { id: item.id })}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: SEVERITY_COLORS[item.severity] || '#666' }]}>
              <Text style={styles.badgeText}>{item.severity}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] || '#444' }]}>
              <Text style={styles.badgeText}>{item.status.replace('_', ' ')}</Text>
            </View>
            <Text style={styles.cardType}>{item.type === 'AUTO' ? '🤖 Auto' : '✍️ Manual'}</Text>
          </View>
          <Text style={styles.cardDate}>{date}</Text>
          {item.address ? <Text style={styles.cardAddress} numberOfLines={1}>📍 {item.address}</Text> : null}
          {item.description ? <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
        </TouchableOpacity>

        {item.status !== 'ARCHIVED' && (
          <TouchableOpacity 
            style={styles.deleteCardBtn}
            onPress={() => handleDeleteIncident(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#ef5350" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.filterRow}>
        {SEVERITY_FILTERS.map((sev) => {
          const active = (sev === 'ALL' && !filters.severity) || filters.severity === sev;
          return (
            <TouchableOpacity
              key={sev}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => onFilterChange(sev)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{sev}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error && !isLoading ? (
        <View style={styles.centerContent}>
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
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#d32f2f']} tintColor="#d32f2f" />}
          contentContainerStyle={list.length === 0 ? { flex: 1, justifyContent: 'center' } : { padding: 16 }}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.centerContent}>
                <Text style={styles.emptyText}>No incidents recorded yet.</Text>
                <Text style={styles.emptySubtext}>Tap the + button to log your first incident.</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            meta.page < meta.totalPages ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={onLoadMore} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#d32f2f" /> : <Text style={styles.loadMoreText}>Load More</Text>}
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateIncident', { mode: 'create' })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16,
    backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#2e2e2e',
  },
  filterChipActive: { backgroundColor: '#d32f2f', borderColor: '#d32f2f' },
  filterChipText: { color: '#cccccc', fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: '#ffffff' },
  card: {
    backgroundColor: '#1e1e1e', borderRadius: 10, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#2e2e2e', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  badge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4 },
  badgeText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },
  cardType: { color: '#888888', fontSize: 11, marginLeft: 'auto' },
  cardDate: { color: '#cccccc', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  cardAddress: { color: '#888888', fontSize: 12, marginBottom: 4 },
  cardDesc: { color: '#aaaaaa', fontSize: 13 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#ff8a80', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#d32f2f', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 6 },
  retryBtnText: { color: '#ffffff', fontWeight: 'bold' },
  emptyText: { color: '#cccccc', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  emptySubtext: { color: '#888888', fontSize: 13, textAlign: 'center' },
  loadMoreBtn: {
    paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 80,
    backgroundColor: '#1e1e1e', borderRadius: 8, borderWidth: 1, borderColor: '#2e2e2e',
  },
  loadMoreText: { color: '#d32f2f', fontSize: 14, fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 20, right: 20, width: 56, height: 56,
    borderRadius: 28, backgroundColor: '#d32f2f', justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5,
  },
  fabText: { color: '#ffffff', fontSize: 28, fontWeight: 'bold', marginTop: -2 },
  deleteCardBtn: {
    padding: 8,
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});