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
  NONE: '#666666', MINOR: '#fbc02d', MODERATE: '#f57c00', SEVERE: '#d32f2f',
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#d32f2f', RESOLVED: '#388e3c', FALSE_ALARM: '#666666',
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
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Severity</Text>
        <Controller
          control={control}
          name="severity"
          render={({ field: { onChange, value } }) => (
            <View style={styles.chipsRow}>
              {SEVERITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, { backgroundColor: value === opt ? SEVERITY_COLORS[opt] : '#1e1e1e', borderColor: value === opt ? SEVERITY_COLORS[opt] : '#2e2e2e' }]}
                  onPress={() => onChange(opt)}
                >
                  <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.severity && <Text style={styles.errorHelper}>{errors.severity.message}</Text>}

        <Text style={styles.label}>Status</Text>
        <Controller
          control={control}
          name="status"
          render={({ field: { onChange, value } }) => (
            <View style={styles.chipsRow}>
              {STATUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, { backgroundColor: value === opt ? STATUS_COLORS[opt] : '#1e1e1e', borderColor: value === opt ? STATUS_COLORS[opt] : '#2e2e2e' }]}
                  onPress={() => onChange(opt)}
                >
                  <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>{opt.replace('_', ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />

        <Text style={styles.label}>Date &amp; Time (YYYY-MM-DDTHH:MM)</Text>
        <Controller
          control={control}
          name="occurredAt"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              placeholderTextColor="#666"
              autoCapitalize="none"
            />
          )}
        />
        {errors.occurredAt && <Text style={styles.errorHelper}>{errors.occurredAt.message}</Text>}

        <Text style={styles.label}>Address (optional)</Text>
        <Controller
          control={control}
          name="address"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              placeholder="e.g. Shahrah-e-Faisal, Karachi"
              placeholderTextColor="#666"
            />
          )}
        />

        <Text style={styles.label}>Description (optional)</Text>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={value}
              onChangeText={onChange}
              placeholder="Describe what happened..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          )}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Latitude (optional)</Text>
            <Controller
              control={control}
              name="latitude"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value ? String(value) : ''}
                  onChangeText={onChange}
                  placeholder="24.8607"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
              )}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>Longitude (optional)</Text>
            <Controller
              control={control}
              name="longitude"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value ? String(value) : ''}
                  onChangeText={onChange}
                  placeholder="67.0011"
                  placeholderTextColor="#666"
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
            <Text style={styles.submitBtnText}>{isEdit ? 'Update Incident' : 'Save Incident'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#121212' },
  label: { color: '#cccccc', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 14 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1,
  },
  chipText: { color: '#cccccc', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#ffffff' },
  input: {
    backgroundColor: '#1e1e1e', color: '#ffffff', paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 8, fontSize: 15, borderWidth: 1, borderColor: '#2e2e2e',
  },
  textArea: { minHeight: 100, paddingTop: 12 },
  row: { flexDirection: 'row' },
  errorHelper: { color: '#ff8a80', fontSize: 11, marginTop: 4 },
  errorText: { color: '#ff8a80', fontSize: 14, textAlign: 'center' },
  submitBtn: {
    backgroundColor: '#d32f2f', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 24,
  },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});