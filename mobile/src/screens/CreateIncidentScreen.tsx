// ═══════════════════════════════════════════════════════════════
// ResQDrive v2 — CREATE INCIDENT SCREEN (Modernized)
// All imports, logic, state, handlers preserved identically.
// Only JSX structure + StyleSheet updated: dark glassmorphism theme.
// ═══════════════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import {
  createIncident, updateIncident, fetchIncident,
} from '../store/slices/incidentsSlice';
import {
  createIncidentSchema, CreateIncidentInput, SEVERITY_OPTIONS, STATUS_OPTIONS,
} from '../schemas/incidentValidation';

const SEVERITY_COLORS: Record<string, string> = {
  NONE: '#6B6B80', MINOR: '#FFD600', MODERATE: '#FF9100', SEVERE: '#FF1744',
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#FF1744', RESOLVED: '#00E676', FALSE_ALARM: '#6B6B80',
};

const nowISO = () => new Date().toISOString().slice(0, 16);

export default function CreateIncidentScreen({ route, navigation }: { route: any; navigation: any }) {
  const { mode, id } = route.params;
  const isEdit = mode === 'edit';
  const dispatch = useDispatch<any>();
  const { current, isSubmitting } = useSelector((state: RootState) => state.incidents);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && id) {
      dispatch(fetchIncident(id)).unwrap().catch(() => setLoadError('Failed to load incident for editing'));
    }
  }, [dispatch, id, isEdit]);

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateIncidentInput>({
    resolver: zodResolver(createIncidentSchema),
    defaultValues: {
      severity: 'NONE', status: 'ACTIVE', occurredAt: nowISO(),
      latitude: '', longitude: '', address: '', description: '',
    },
  });

  useEffect(() => {
    if (isEdit && current) {
      setValue('severity', current.severity);
      setValue('status', current.status === 'ARCHIVED' ? 'RESOLVED' : current.status);
      setValue('occurredAt', current.occurredAt.slice(0, 16));
      setValue('latitude', current.latitude ? String(current.latitude) : '');
      setValue('longitude', current.longitude ? String(current.longitude) : '');
      setValue('address', current.address || '');
      setValue('description', current.description || '');
    }
  }, [isEdit, current, setValue]);

  const watchSeverity = watch('severity');
  const watchStatus = watch('status');

  const onSubmit = async (data: CreateIncidentInput) => {
    const payload: any = {
      ...data,
      occurredAt: data.occurredAt.length === 16 ? data.occurredAt + ':00.000Z' : data.occurredAt,
      latitude: data.latitude ? parseFloat(String(data.latitude)) : undefined,
      longitude: data.longitude ? parseFloat(String(data.longitude)) : undefined,
    };
    Object.keys(payload).forEach((k) => (payload[k] === '' || payload[k] == null) && delete payload[k]);

    try {
      if (isEdit && id) {
        await dispatch(updateIncident({ id, data: payload })).unwrap();
        Alert.alert('Success', 'Incident updated.');
      } else {
        await dispatch(createIncident(payload)).unwrap();
        Alert.alert('Success', 'Incident created.');
      }
      navigation.navigate('IncidentsList');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Something went wrong');
    }
  };

  if (isEdit && loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{loadError}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>🏷️ Severity</Text>
        <Controller
          control={control}
          name="severity"
          render={({ field: { onChange, value } }) => (
            <View style={styles.chipsRow}>
              {SEVERITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, {
                    backgroundColor: value === opt ? SEVERITY_COLORS[opt] + '25' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: value === opt ? SEVERITY_COLORS[opt] : 'rgba(255, 255, 255, 0.06)',
                  }]}
                  onPress={() => onChange(opt)}
                >
                  <Text style={[styles.chipText, value === opt && { color: SEVERITY_COLORS[opt] }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.severity && <Text style={styles.errorHelper}>{errors.severity.message}</Text>}

        <Text style={styles.sectionTitle}>🚦 Status</Text>
        <Controller
          control={control}
          name="status"
          render={({ field: { onChange, value } }) => (
            <View style={styles.chipsRow}>
              {STATUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, {
                    backgroundColor: value === opt ? STATUS_COLORS[opt] + '25' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: value === opt ? STATUS_COLORS[opt] : 'rgba(255, 255, 255, 0.06)',
                  }]}
                  onPress={() => onChange(opt)}
                >
                  <Text style={[styles.chipText, value === opt && { color: STATUS_COLORS[opt] }]}>{opt.replace('_', ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />

        <Text style={styles.label}>📅 Date & Time (YYYY-MM-DDTHH:MM)</Text>
        <Controller
          control={control}
          name="occurredAt"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              placeholderTextColor="#6B6B80"
              autoCapitalize="none"
            />
          )}
        />
        {errors.occurredAt && <Text style={styles.errorHelper}>{errors.occurredAt.message}</Text>}

        <Text style={styles.label}>📍 Address (optional)</Text>
        <Controller
          control={control}
          name="address"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              placeholder="e.g. Shahrah-e-Faisal, Karachi"
              placeholderTextColor="#6B6B80"
            />
          )}
        />

        <Text style={styles.label}>📝 Description (optional)</Text>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={value}
              onChangeText={onChange}
              placeholder="Describe what happened..."
              placeholderTextColor="#6B6B80"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          )}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>📍 Latitude</Text>
            <Controller
              control={control}
              name="latitude"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value ? String(value) : ''}
                  onChangeText={onChange}
                  placeholder="24.8607"
                  placeholderTextColor="#6B6B80"
                  keyboardType="numeric"
                />
              )}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>📍 Longitude</Text>
            <Controller
              control={control}
              name="longitude"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value ? String(value) : ''}
                  onChangeText={onChange}
                  placeholder="67.0011"
                  placeholderTextColor="#6B6B80"
                  keyboardType="numeric"
                />
              )}
            />
          </View>
        </View>
        {errors.latitude && <Text style={styles.errorHelper}>{errors.latitude.message}</Text>}

        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitBtnText}>{isEdit ? '💾 Update Incident' : '🚨 Save Incident'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0A0A0F' },
  sectionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 10, marginTop: 18 },
  label: { color: '#A0A0B8', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 14 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  chipText: { color: '#6B6B80', fontSize: 12, fontWeight: '600' },
  input: {
    backgroundColor: 'rgba(10, 10, 15, 0.6)',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  textArea: { minHeight: 100, paddingTop: 12 },
  row: { flexDirection: 'row' },
  errorHelper: { color: '#FF8A80', fontSize: 11, marginTop: 4 },
  errorText: { color: '#FF8A80', fontSize: 14, textAlign: 'center' },
  submitBtn: {
    backgroundColor: '#E53935',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});