import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, Linking, StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { fetchIncident, deleteIncident } from '../store/slices/incidentsSlice';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../components/ui/Toast';
import { colors, darkColors, tints } from '../theme/tokens';

const SEVERITY_COLORS: Record<string, string> = {
  NONE: darkColors.textTertiary, MINOR: colors.warning[400], MODERATE: colors.warning[500], SEVERE: colors.danger[500],
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: colors.danger[500], RESOLVED: colors.success[500], FALSE_ALARM: darkColors.textTertiary, ARCHIVED: darkColors.textTertiary,
};

export default function IncidentDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const toast = useToast();
  const { id } = route.params;
  const dispatch = useDispatch<any>();
  const { current, isLoading, isSubmitting } = useSelector((state: RootState) => state.incidents);

  useEffect(() => {
    dispatch(fetchIncident(id));
  }, [dispatch, id]);

  const handleDelete = () => {
    Alert.alert('Delete Incident', 'Are you sure you want to delete this incident record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await dispatch(deleteIncident(id)).unwrap();
            navigation.goBack();
          } catch (err: any) {
            toast.error(err.message || 'Failed to delete incident');
          }
        },
      },
    ]);
  };

  const openInMaps = () => {
    if (!current?.latitude || !current?.longitude) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${current.latitude},${current.longitude}`;
    Linking.openURL(url);
  };

  const fmtDate = (d?: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleString();
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.danger[500]} />
      </View>
    );
  }

  if (!current) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Incident record not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      {/* Top Banner */}
      <View style={styles.heroCard}>
        <Text style={styles.heroId}>Incident #{current.id.slice(0, 8)}</Text>
        <View style={styles.badgesRow}>
          <View style={[styles.badge, { backgroundColor: SEVERITY_COLORS[current.severity] || darkColors.textTertiary }]}>
            <View style={[styles.badgeDot, { backgroundColor: darkColors.text }]} />
            <Text style={styles.badgeText}>{current.severity}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[current.status] || darkColors.textTertiary }]}>
            <Text style={styles.badgeText}>{current.status.replace('_', ' ')}</Text>
          </View>
          <Text style={styles.typeText}>
            {current.type === 'AUTO' ? 'Auto-detected' : 'Manually logged'}
          </Text>
        </View>
      </View>

      {/* Occurred At */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time-outline" size={18} color={colors.danger[500]} style={{ marginRight: 8 }} />
          <Text style={styles.label}>Occurred At</Text>
        </View>
        <Text style={styles.value}>{fmtDate(current.occurredAt)}</Text>
      </View>

      {/* Address */}
      {current.address ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={18} color={colors.danger[500]} style={{ marginRight: 8 }} />
            <Text style={styles.label}>Address</Text>
          </View>
          <Text style={styles.value}>{current.address}</Text>
          {current.latitude && current.longitude ? (
            <TouchableOpacity style={styles.mapsBtn} onPress={openInMaps} activeOpacity={0.7}>
              <Ionicons name="map-outline" size={16} color={darkColors.text} style={{ marginRight: 6 }} />
              <Text style={styles.mapsBtnText}>Open in Google Maps</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Coordinates */}
      {current.latitude != null && current.longitude != null ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="globe-outline" size={18} color={colors.danger[500]} style={{ marginRight: 8 }} />
            <Text style={styles.label}>Coordinates</Text>
          </View>
          <Text style={styles.value}>{current.latitude.toFixed(6)}, {current.longitude.toFixed(6)}</Text>
        </View>
      ) : null}

      {/* Description */}
      {current.description ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={18} color={colors.danger[500]} style={{ marginRight: 8 }} />
            <Text style={styles.label}>Description</Text>
          </View>
          <Text style={styles.value}>{current.description}</Text>
        </View>
      ) : null}

      {/* Sensor Snapshot */}
      {current.sensorSnapshot ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="hardware-chip-outline" size={18} color={colors.danger[500]} style={{ marginRight: 8 }} />
            <Text style={styles.label}>Sensor Snapshot</Text>
          </View>
          <View style={styles.jsonBox}>
            <Text style={styles.jsonText}>{JSON.stringify(current.sensorSnapshot, null, 2)}</Text>
          </View>
        </View>
      ) : null}

      {/* Alert Dispatch Status */}
      {current.alertDispatchStatus ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger[500]} style={{ marginRight: 8 }} />
            <Text style={styles.label}>Alert Dispatch Status</Text>
          </View>
          <View style={styles.jsonBox}>
            <Text style={styles.jsonText}>{JSON.stringify(current.alertDispatchStatus, null, 2)}</Text>
          </View>
        </View>
      ) : null}

      {/* Damage Assessment */}
      {current.damageAssessmentResult ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="search-outline" size={18} color={colors.danger[500]} style={{ marginRight: 8 }} />
            <Text style={styles.label}>Damage Assessment</Text>
          </View>
          <View style={styles.jsonBox}>
            <Text style={styles.jsonText}>{JSON.stringify(current.damageAssessmentResult, null, 2)}</Text>
          </View>
        </View>
      ) : null}

      {/* Timestamps */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar-outline" size={18} color={colors.danger[500]} style={{ marginRight: 8 }} />
          <Text style={styles.label}>Record Timeline</Text>
        </View>
        <View style={styles.timelineRow}>
          <Text style={styles.timelineLabel}>Created</Text>
          <Text style={styles.timelineValue}>{fmtDate(current.createdAt)}</Text>
        </View>
        <View style={styles.timelineDivider} />
        <View style={styles.timelineRow}>
          <Text style={styles.timelineLabel}>Updated</Text>
          <Text style={styles.timelineValue}>{fmtDate(current.updatedAt)}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('CreateIncident', { mode: 'edit', id: current.id })}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ionicons name="pencil-outline" size={18} color={darkColors.text} />
            <Text style={styles.actionBtnText}>Edit</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDelete}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ionicons name="trash-outline" size={18} color={colors.danger[400]} />
            <Text style={styles.actionBtnText}>Delete</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkColors.background, paddingHorizontal: 20, paddingTop: 16 },
  center: { flex: 1, backgroundColor: darkColors.background, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.danger[400], fontSize: 16, textAlign: 'center' },
  heroCard: {
    backgroundColor: tints.glassCard,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    shadowColor: colors.neutral[950],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  heroId: { fontSize: 16, fontWeight: 'bold', color: darkColors.text, marginBottom: 12 },
  loadingRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: tints.dangerSubtle,
    borderWidth: 2,
    borderColor: tints.dangerMedium,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingLabel: { color: darkColors.textSecondary, fontSize: 14 },
  bgGlow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: tints.dangerSubtle,
  },
  badgesCard: {
    backgroundColor: tints.glassCard,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    shadowColor: colors.neutral[950],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { color: darkColors.text, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  typeText: { color: darkColors.textTertiary, fontSize: 12, marginLeft: 'auto' },
  section: {
    backgroundColor: tints.glassCard,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: tints.whiteSubtle,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIcon: { fontSize: 14 },
  label: {
    color: darkColors.textTertiary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: { color: darkColors.text, fontSize: 15, lineHeight: 22 },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  timelineLabel: { color: darkColors.textTertiary, fontSize: 13 },
  timelineValue: { color: darkColors.textSecondary, fontSize: 13 },
  timelineDivider: { height: 1, backgroundColor: tints.whiteSubtle },
  jsonBox: {
    backgroundColor: tints.overlayStrong,
    borderRadius: 12,
    padding: 16,
    marginTop: 6,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
  },
  jsonText: { color: colors.success[300], fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: tints.infoSubtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tints.infoMedium,
    alignSelf: 'flex-start',
  },
  mapsBtnIcon: { fontSize: 16 },
  mapsBtnText: { color: colors.info[500], fontSize: 13, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: tints.whiteSubtle,
    borderWidth: 1,
    borderColor: tints.whiteBorderStrong,
  },
  editBtnIcon: { fontSize: 16 },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: tints.dangerErrorBg,
    borderWidth: 1,
    borderColor: tints.dangerErrorBorder,
  },
  deleteBtnIcon: { fontSize: 16 },
  actionBtnText: { color: darkColors.text, fontSize: 14, fontWeight: '700' },
});