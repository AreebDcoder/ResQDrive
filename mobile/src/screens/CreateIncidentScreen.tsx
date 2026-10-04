// ═══════════════════════════════════════════════════════════════
// ResQDrive v2 — CREATE INCIDENT SCREEN (Modernized)
// All imports, logic, state, handlers preserved identically.
// Only JSX structure + StyleSheet updated: dark glassmorphism theme.
// ═══════════════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
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
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../components/ui/Toast';
import { Button, FormInput } from '../components/ui';
import { colors, darkColors, tints } from '../theme/tokens';

const SEVERITY_COLORS: Record<string, string> = {
  NONE: darkColors.textTertiary, MINOR: colors.warning[400], MODERATE: colors.warning[500], SEVERE: colors.danger[500],
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: colors.danger[500], RESOLVED: colors.success[500], FALSE_ALARM: darkColors.textTertiary,
};

const nowISO = () => new Date().toISOString().slice(0, 16);

export default function CreateIncidentScreen({ route, navigation }: { route: any; navigation: any }) {
  const toast = useToast();
  const { mode, id } = route.params;
  const isEdit = mode === 'edit';
  const dispatch = useDispatch<any>();
  const { current, isSubmitting } = useSelector((state: RootState) => state.incidents);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && id) {
      dispatch(fetchIncident(id)).unwrap().catch(() => setLoadError('Failed to load incident for editing'));
    }
  }, [isEdit, id]);

  const {
    control, handleSubmit, reset,
    formState: { errors },
  } = useForm<CreateIncidentInput>({
    resolver: zodResolver(createIncidentSchema),
    defaultValues: {
      severity: 'NONE',
      status: 'ACTIVE',
      occurredAt: nowISO(),
      address: '',
      description: '',
      latitude: undefined,
      longitude: undefined,
    },
  });

  useEffect(() => {
    if (isEdit && current) {
      const validStatus = (current.status && current.status !== 'ARCHIVED') ? current.status : 'ACTIVE';
      reset({
        severity: current.severity || 'NONE',
        status: validStatus,
        occurredAt: current.occurredAt ? current.occurredAt.slice(0, 16) : nowISO(),
        address: current.address || '',
        description: current.description || '',
        latitude: current.latitude ?? undefined,
        longitude: current.longitude ?? undefined,
      });
    }
  }, [current, isEdit]);

  const onSubmit = async (data: CreateIncidentInput) => {
    try {
      if (isEdit && id) {
        await dispatch(updateIncident({ id, data })).unwrap();
        toast.success('Incident updated successfully');
      } else {
        await dispatch(createIncident(data)).unwrap();
        toast.success('Incident reported successfully');
      }
      navigation.goBack();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save incident');
    }
  };

  if (isEdit && loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{loadError}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle} accessibilityRole="header" allowFontScaling={true} maxFontSizeMultiplier={1.5}>Severity</Text>
        <Controller
          control={control}
          name="severity"
          render={({ field: { onChange, value } }) => (
            <View style={styles.chipsRow}>
              {SEVERITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, {
                    backgroundColor: value === opt ? SEVERITY_COLORS[opt] + '25' : tints.whiteSubtle,
                    borderColor: value === opt ? SEVERITY_COLORS[opt] : tints.whiteBorder,
                  }]}
                  onPress={() => onChange(opt)} accessibilityRole="button"
                >
                  <Text style={[styles.chipText, value === opt && { color: SEVERITY_COLORS[opt] }]} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.severity && <Text style={styles.errorHelper} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{errors.severity.message}</Text>}

        <Text style={styles.sectionTitle} accessibilityRole="header" allowFontScaling={true} maxFontSizeMultiplier={1.5}>Status</Text>
        <Controller
          control={control}
          name="status"
          render={({ field: { onChange, value } }) => (
            <View style={styles.chipsRow}>
              {STATUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, {
                    backgroundColor: value === opt ? STATUS_COLORS[opt] + '25' : tints.whiteSubtle,
                    borderColor: value === opt ? STATUS_COLORS[opt] : tints.whiteBorder,
                  }]}
                  onPress={() => onChange(opt)} accessibilityRole="button"
                >
                  <Text style={[styles.chipText, value === opt && { color: STATUS_COLORS[opt] }]} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{opt.replace('_', ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />

        <Text style={styles.sectionTitle} accessibilityRole="header" allowFontScaling={true} maxFontSizeMultiplier={1.5}>Date & Time (YYYY-MM-DDTHH:MM)</Text>
        <FormInput
          name="occurredAt"
          control={control}
          label="Date & Time"
          placeholder="YYYY-MM-DDTHH:MM"
          autoCapitalize="none"
          leftIcon="calendar-outline"
        />

        <FormInput
          name="address"
          control={control}
          label="Address (optional)"
          placeholder="e.g. Shahrah-e-Faisal, Karachi"
          leftIcon="location-outline"
        />

        <FormInput
          name="description"
          control={control}
          label="Description (optional)"
          placeholder="Describe what happened..."
          multiline
          numberOfLines={4}
          leftIcon="document-text-outline"
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <FormInput
              name="latitude"
              control={control}
              label="Latitude"
              placeholder="24.8607"
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <FormInput
              name="longitude"
              control={control}
              label="Longitude"
              placeholder="67.0011"
              keyboardType="numeric"
            />
          </View>
        </View>

        <Button
          label={isEdit ? 'Update Incident' : 'Save Incident'}
          variant="danger"
          size="lg"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          fullWidth
          icon={isEdit ? 'save-outline' : 'alert-circle-outline'}
          accessibilityHint={isEdit ? 'Update incident record' : 'Submit new incident record'}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: darkColors.background },
  sectionTitle: { color: darkColors.text, fontSize: 14, fontWeight: '700', marginBottom: 10, marginTop: 18 },
  label: { color: darkColors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 14 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  chipText: { color: darkColors.textTertiary, fontSize: 12, fontWeight: '600' },
  input: {
    backgroundColor: tints.overlayStrong,
    color: darkColors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
  },
  textArea: { minHeight: 100, paddingTop: 12 },
  row: { flexDirection: 'row' },
  errorHelper: { color: colors.danger[300], fontSize: 11, marginTop: 4 },
  errorText: { color: colors.danger[300], fontSize: 14, textAlign: 'center' },
  submitBtn: {
    backgroundColor: colors.danger[500],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnText: { color: darkColors.text, fontSize: 16, fontWeight: '700' },
});