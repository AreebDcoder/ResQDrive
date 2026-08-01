import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, Linking, StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { fetchIncident, deleteIncident } from '../store/slices/incidentsSlice';

const SEVERITY_COLORS: Record<string, string> = {
  NONE: '#6B6B80', MINOR: '#FFD600', MODERATE: '#FF9100', SEVERE: '#FF1744',
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#FF1744', RESOLVED: '#00E676', FALSE_ALARM: '#6B6B80', ARCHIVED: '#4A4A5A',
};

export default function IncidentDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const { id } = route.params;
  const dispatch = useDispatch<any>();
  const { current, isLoading, isSubmitting } = useSelector((state: RootState) => state.incidents);

  useEffect(() => {
    dispatch(fetchIncident(id));
  }, [dispatch, id]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Incident',
      'Are you sure you want to delete this incident? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await dispatch(deleteIncident(id));
            navigation.navigate('IncidentsList');
          },
        },
      ]
    );
  };

  const openInMaps = () => {
    if (current?.latitude && current?.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${current.latitude},${current.longitude}`;
      Linking.openURL(url);
    }
  };

  if (isLoading || !current) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
        <View style={styles.loadingRing}>
          <ActivityIndicator color="#E53935" size="large" />
        </View>
        <Text style={styles.loadingLabel}>Loading incident...</Text>
      </View>
    );
  }

  const fmtDate = (iso: string) => new Date(iso).toLocaleString();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      {/* Background glow */}
      <View style={styles.bgGlow} />

      {/* Badges Section */}
      <View style={styles.badgesCard}>
        <View style={styles.badgesRow}>
          <View style={[styles.badge, { backgroundColor: SEVERITY_COLORS[current.severity] || '#6B6B80' }]}>
            <View style={[styles.badgeDot, { backgroundColor: '#FFFFFF' }]} />
            <Text style={styles.badgeText}>{current.severity}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[current.status] || '#4A4A5A' }]}>
            <Text style={styles.badgeText}>{current.status.replace('_', ' ')}</Text>
          </View>
          <Text style={styles.typeText}>
            {current.type === 'AUTO' ? '🤖 Auto-detected' : '✍️ Manually logged'}
          </Text>
        </View>
      </View>

      {/* Occurred At */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>🕐</Text>
          <Text style={styles.label}>Occurred At</Text>
        </View>
        <Text style={styles.value}>{fmtDate(current.occurredAt)}</Text>
      </View>

      {/* Address */}
      {current.address ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📍</Text>
            <Text style={styles.label}>Address</Text>
          </View>
          <Text style={styles.value}>{current.address}</Text>
          {current.latitude && current.longitude ? (
            <TouchableOpacity style={styles.mapsBtn} onPress={openInMaps} activeOpacity={0.7}>
              <Text style={styles.mapsBtnIcon}>🗺️</Text>
              <Text style={styles.mapsBtnText}>Open in Google Maps</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Coordinates */}
      {current.latitude != null && current.longitude != null ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🌐</Text>
            <Text style={styles.label}>Coordinates</Text>
          </View>
          <Text style={styles.value}>{current.latitude.toFixed(6)}, {current.longitude.toFixed(6)}</Text>
        </View>
      ) : null}

      {/* Description */}
      {current.description ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📝</Text>
            <Text style={styles.label}>Description</Text>
          </View>
          <Text style={styles.value}>{current.description}</Text>
        </View>
      ) : null}

      {/* Sensor Snapshot */}
      {current.sensorSnapshot ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📡</Text>
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
            <Text style={styles.sectionIcon}>🚨</Text>
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
            <Text style={styles.sectionIcon}>🔍</Text>
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
          <Text style={styles.sectionIcon}>📊</Text>
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
          <Text style={styles.editBtnIcon}>✏️</Text>
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDelete}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteBtnIcon}>🗑️</Text>
          <Text style={styles.actionBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F', paddingHorizontal: 20, paddingTop: 16 },
  center: { flex: 1, backgroundColor: '#0A0A0F', justifyContent: 'center', alignItems: 'center' },
  loadingRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(229, 57, 53, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(229, 57, 53, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingLabel: { color: '#A0A0B8', fontSize: 14 },
  bgGlow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(229, 57, 53, 0.06)',
  },
  badgesCard: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000000',
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
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  typeText: { color: '#6B6B80', fontSize: 12, marginLeft: 'auto' },
  section: {
    backgroundColor: 'rgba(28, 28, 46, 0.4)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIcon: { fontSize: 14 },
  label: {
    color: '#6B6B80',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: { color: '#FFFFFF', fontSize: 15, lineHeight: 22 },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  timelineLabel: { color: '#6B6B80', fontSize: 13 },
  timelineValue: { color: '#A0A0B8', fontSize: 13 },
  timelineDivider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  jsonBox: {
    backgroundColor: 'rgba(10, 10, 15, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  jsonText: { color: '#69F0AE', fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(41, 121, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(41, 121, 255, 0.2)',
    alignSelf: 'flex-start',
  },
  mapsBtnIcon: { fontSize: 16 },
  mapsBtnText: { color: '#2979FF', fontSize: 13, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    backgroundColor: 'rgba(255, 23, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.3)',
  },
  deleteBtnIcon: { fontSize: 16 },
  actionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});