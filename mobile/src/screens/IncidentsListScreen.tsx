import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, SafeAreaView, StatusBar,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { useGetIncidentsQuery, useDeleteIncidentMutation } from '../store/api/incidentsApi';
import { clearCurrent } from '../store/slices/incidentsSlice';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../components/ui/Toast';
import { Button, ConfirmDialog, FAB, FilterChip, SkeletonList } from '../components/ui';
import { colors, darkColors, tints } from '../theme/tokens';

const SEVERITY_COLORS: Record<string, string> = {
  NONE: darkColors.textTertiary, MINOR: colors.warning[400], MODERATE: colors.warning[500], SEVERE: colors.danger[500],
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: colors.danger[500], RESOLVED: colors.success[500], FALSE_ALARM: darkColors.textTertiary, ARCHIVED: darkColors.textTertiary,
};
const SEVERITY_FILTERS = ['ALL', 'MINOR', 'MODERATE', 'SEVERE'];

export default function IncidentsListScreen({ navigation }: { navigation: any }) {
  const toast = useToast();
  const dispatch = useDispatch<any>();
  // Batch 11: Migrated list query to RTK Query. Delete was migrated in Half 1.
  // severity + page are now query params; auto-refetches when they change.
  const [currentPage, setCurrentPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState<string | undefined>(undefined);
  // Local accumulated list preserves the original "load more appends" UX.
  // RTK Query only returns the current page's data; we merge into local state.
  const [accumulatedList, setAccumulatedList] = useState<any[]>([]);
  const [accumulatedMeta, setAccumulatedMeta] = useState({ page: 1, totalPages: 0 });
  const { data: incidentsData, isLoading, isFetching, error, refetch } = useGetIncidentsQuery({
    page: currentPage,
    severity: severityFilter,
  });
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteIncident] = useDeleteIncidentMutation();

  useEffect(() => {
    dispatch(clearCurrent());
  }, [dispatch]);

  // Sync RTK Query response → local list (page 1 replaces, page >1 appends).
  useEffect(() => {
    const payload = incidentsData as any;
    if (payload?.data) {
      if (currentPage === 1) {
        setAccumulatedList(payload.data);
      } else {
        setAccumulatedList(prev => [...prev, ...payload.data]);
      }
      setAccumulatedMeta(payload.meta || { page: 1, totalPages: 0 });
    }
  }, [incidentsData, currentPage]);

  const list = accumulatedList;
  const meta = accumulatedMeta;
  const isRefreshing = isFetching && !isLoading;
  const filters = { severity: severityFilter };

  const onRefresh = useCallback(() => {
    setCurrentPage(1);
    refetch();
  }, [refetch]);

  const onLoadMore = useCallback(() => {
    if (meta.page < meta.totalPages && !isFetching) {
      setCurrentPage(p => p + 1);
    }
  }, [meta, isFetching]);

  const onFilterChange = (sev: string) => {
    setSeverityFilter(sev === 'ALL' ? undefined : sev);
    setCurrentPage(1);
  };

  const handleDeleteIncident = (id: string) => {
    setPendingDeleteId(id);
    setDeleteDialogVisible(true);
  };

  const handleConfirmDeleteIncident = async () => {
    setDeleteDialogVisible(false);
    if (!pendingDeleteId) return;
    try {
      // Batch 11: RTK Query mutation — invalidates 'IncidentList' tag + auto-refetch.
      // No manual `dispatch(fetchIncidents(...))` needed; tag invalidation triggers refetch.
      await deleteIncident(pendingDeleteId).unwrap();
    } catch (err) {
      toast.error('Failed to delete incident.');
    } finally {
      setPendingDeleteId(null);
    }
  };

  const renderItem = useCallback(({ item }: { item: any }) => {
    const date = new Date(item.occurredAt).toLocaleString();
    const isSevere = item.severity === 'SEVERE';
    return (
      <View style={[styles.card, isSevere && styles.cardSevere]}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => navigation.navigate('IncidentDetail', { id: item.id })}
          activeOpacity={0.7} accessibilityRole="button"
        >
          <View style={styles.cardHeader}>
            <View style={styles.badgesRow}>
              <View style={[styles.badge, { backgroundColor: SEVERITY_COLORS[item.severity] || darkColors.textTertiary }]}>
                <Text style={styles.badgeText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{item.severity}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] || darkColors.textTertiary }]}>
                <Text style={styles.badgeText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{item.status.replace('_', ' ')}</Text>
              </View>
            </View>
            <Text style={styles.cardType} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{item.type === 'AUTO' ? 'Auto' : 'Manual'}</Text>
          </View>
          <Text style={styles.cardDate} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{date}</Text>
          {item.address ? (
            <Text style={styles.cardAddress} numberOfLines={1} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{item.address}</Text>
          ) : null}
          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={2} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{item.description}</Text>
          ) : null}
        </TouchableOpacity>

        {item.status !== 'ARCHIVED' && (
          <TouchableOpacity
            style={styles.deleteCardBtn}
            onPress={() => handleDeleteIncident(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button"
          >
            <View style={styles.deleteIconBg}>
              <Ionicons name="trash-outline" size={16} color={colors.danger[400]} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [navigation, handleDeleteIncident]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={darkColors.background} />

      {/* Background glow */}
      <View style={styles.bgGlow} />

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {SEVERITY_FILTERS.map((sev) => {
          const active = (sev === 'ALL' && !filters.severity) || filters.severity === sev;
          return (
            <FilterChip
              key={sev}
              label={sev}
              selected={active}
              onPress={() => onFilterChange(sev)}
            />
          );
        })}
      </View>

      {error && !isLoading ? (
        <View style={styles.centerContent}>
          <View style={styles.errorBadge}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.danger[400]} />
          </View>
          <Text style={styles.errorText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{String((error as any)?.data?.message || (error as any)?.error || error)}</Text>
          <View style={styles.retryBtnWrap}>
            <Button
              label="Retry"
              variant="danger"
              size="md"
              onPress={onRefresh}
              accessibilityHint="Retry loading incidents"
            />
          </View>
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
              colors={[colors.danger[500]]}
              tintColor={colors.danger[500]}
            />
          }
          removeClippedSubviews={true}
          contentContainerStyle={list.length === 0 && !isLoading ? { flex: 1, justifyContent: 'center' } : { padding: 20 }}
          ListEmptyComponent={
            isLoading ? (
              <SkeletonList count={5} variant="card" />
            ) : (
              <View style={styles.centerContent}>
                <View style={styles.emptyIconBg}>
                  <Ionicons name="document-text-outline" size={48} color={darkColors.textTertiary} />
                </View>
                <Text style={styles.emptyText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>No incidents recorded yet.</Text>
                <Text style={styles.emptySubtext} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Tap the + button to log your first incident.</Text>
              </View>
            )
          }
          ListFooterComponent={
            meta.page < meta.totalPages ? (
              <View style={styles.loadMoreWrap}>
                <Button
                  label="Load More"
                  variant="secondary"
                  size="md"
                  onPress={onLoadMore}
                  loading={isFetching}
                  disabled={isFetching}
                  fullWidth
                  accessibilityHint="Load more incidents"
                />
              </View>
            ) : null
          }
        />
      )}

      {/* FAB */}
      <FAB
        icon="add"
        variant="danger"
        onPress={() => navigation.navigate('CreateIncident', { mode: 'create' })}
        label="New Incident"
      />

      {/* Phase 8: ConfirmDialog replaces destructive Alert.alert */}
      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Confirm Delete"
        description="Are you sure you want to delete this incident record?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDeleteIncident}
        onCancel={() => { setDeleteDialogVisible(false); setPendingDeleteId(null); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkColors.background },
  bgGlow: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: tints.dangerSubtle,
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
    backgroundColor: tints.whiteSubtle,
    borderWidth: 1,
    borderColor: tints.whiteBorderStrong,
  },
  filterChipActive: {
    backgroundColor: colors.danger[500],
    borderColor: colors.danger[500],
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  filterChipText: { color: darkColors.textSecondary, fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: darkColors.text },
  card: {
    backgroundColor: tints.glassCard,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.neutral[950],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  cardSevere: {
    borderColor: tints.dangerErrorBorder,
    shadowColor: colors.danger[500],
    shadowOpacity: 0.15,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  badgeText: { color: darkColors.text, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  cardType: { color: darkColors.textTertiary, fontSize: 11 },
  cardDate: { color: darkColors.text, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  cardAddress: { color: darkColors.textSecondary, fontSize: 12, marginBottom: 4 },
  cardDesc: { color: darkColors.textSecondary, fontSize: 13, lineHeight: 18 },
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
    backgroundColor: tints.dangerErrorBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: tints.dangerErrorBg,
    borderWidth: 1.5,
    borderColor: tints.dangerErrorBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: { color: colors.danger[400], fontSize: 14, textAlign: 'center', marginBottom: 20 },
  retryBtnWrap: {
    alignItems: 'center',
  },
  retryBtnText: { color: darkColors.text, fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },
  emptyIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: tints.whiteSubtle,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: { color: darkColors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptySubtext: { color: darkColors.textTertiary, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  loadMoreWrap: {
    marginTop: 8,
    marginBottom: 80,
    paddingHorizontal: 20,
  },
  loadMoreText: { color: colors.danger[500], fontSize: 14, fontWeight: '700' },
  fabGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.danger[500],
  },
  fabText: { color: darkColors.text, fontSize: 30, fontWeight: '700', zIndex: 1, marginTop: -2 },
});