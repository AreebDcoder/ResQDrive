import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { fetchIncident, deleteIncident } from '../store/slices/incidentsSlice';

const SEVERITY_COLORS: Record<string, string> = {
  NONE: '#666666', MINOR: '#fbc02d', MODERATE: '#f57c00', SEVERE: '#d32f2f',
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#d32f2f', RESOLVED: '#388e3c', FALSE_ALARM: '#666666', ARCHIVED: '#444444',
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
        <ActivityIndicator color="#d32f2f" size="large" />
      </View>
    );
  }

  const fmtDate = (iso: string) => new Date(iso).toLocaleString();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
      <View style={styles.section}>
        <View style={styles.badgesRow}>
          <View style={[styles.badge, { backgroundColor: SEVERITY_COLORS[current.severity] }]}>
            <Text style={styles.badgeText}>{current.severity}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[current.status] }]}>
            <Text style={styles.badgeText}>{current.status.replace('_', ' ')}</Text>
          </View>
          <Text style={styles.typeText}>{current.type === 'AUTO' ? '🤖 Auto-detected' : '✍️ Manually logged'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Occurred At</Text>
        <Text style={styles.value}>{fmtDate(current.occurredAt)}</Text>
      </View>

      {current.address ? (
        <View style={styles.section}>
          <Text style={styles.label}>Address</Text>
          <Text style={styles.value}>{current.address}</Text>
          {current.latitude && current.longitude ? (
            <TouchableOpacity style={styles.mapsBtn} onPress={openInMaps}>
              <Text style={styles.mapsBtnText}>Open in Google Maps</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {current.latitude != null && current.longitude != null ? (
        <View style={styles.section}>
          <Text style={styles.label}>Coordinates</Text>
          <Text style={styles.value}>{current.latitude.toFixed(6)}, {current.longitude.toFixed(6)}</Text>
        </View>
      ) : null}

      {current.description ? (
        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>{current.description}</Text>
        </View>
      ) : null}

      {current.sensorSnapshot ? (
        <View style={styles.section}>
          <Text style={styles.label}>Sensor Snapshot</Text>
          <View style={styles.jsonBox}>
            <Text style={styles.jsonText}>{JSON.stringify(current.sensorSnapshot, null, 2)}</Text>
          </View>
        </View>
      ) : null}

      {current.alertDispatchStatus ? (
        <View style={styles.section}>
          <Text style={styles.label}>Alert Dispatch Status</Text>
          <View style={styles.jsonBox}>
            <Text style={styles.jsonText}>{JSON.stringify(current.alertDispatchStatus, null, 2)}</Text>
          </View>
        </View>
      ) : null}

      {current.damageAssessmentResult ? (
        <View style={styles.section}>
          <Text style={styles.label}>Damage Assessment</Text>
          <View style={styles.jsonBox}>
            <Text style={styles.jsonText}>{JSON.stringify(current.damageAssessmentResult, null, 2)}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.label}>Record Created</Text>
        <Text style={styles.mutedValue}>{fmtDate(current.createdAt)}</Text>
        <Text style={styles.label}>Last Updated</Text>
        <Text style={styles.mutedValue}>{fmtDate(current.updatedAt)}</Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => navigation.navigate('CreateIncident', { mode: 'edit', id: current.id })}
          disabled={isSubmitting}
        >
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={handleDelete}
          disabled={isSubmitting}
        >
          <Text style={styles.actionBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 16 },
  center: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  section: { backgroundColor: '#1e1e1e', borderRadius: 10, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2e2e2e' },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 4 },
  badgeText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  typeText: { color: '#888888', fontSize: 12, marginLeft: 'auto' },
  label: { color: '#888888', fontSize: 11, fontWeight: '600', marginBottom: 4, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { color: '#ffffff', fontSize: 15, lineHeight: 22 },
  mutedValue: { color: '#888888', fontSize: 13, marginBottom: 8 },
  jsonBox: { backgroundColor: '#0a0a0a', borderRadius: 6, padding: 12, marginTop: 4, borderWidth: 1, borderColor: '#2a2a2a' },
  jsonText: { color: '#a8e6a3', fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },
  mapsBtn: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#2a2a2a', borderRadius: 6, alignSelf: 'flex-start' },
  mapsBtnText: { color: '#d32f2f', fontSize: 13, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  editBtn: { backgroundColor: '#2a2a2a', borderWidth: 1, borderColor: '#444' },
  deleteBtn: { backgroundColor: '#3a1313', borderWidth: 1, borderColor: '#d32f2f' },
  actionBtnText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
});