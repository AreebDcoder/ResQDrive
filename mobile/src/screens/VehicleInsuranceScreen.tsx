// ═══════════════════════════════════════════════════════════════
// ResQDrive v2 — VEHICLE INSURANCE SCREEN (Modernized)
// All imports, logic, state, handlers preserved identically.
// Only JSX structure + StyleSheet updated: dark glassmorphism theme.
// ═══════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { insuranceSchema, InsuranceInput } from '../schemas/validation';
import { upsertInsuranceSuccess, deleteInsuranceSuccess } from '../store/slices/vehiclesSlice';
import api from '../api/axios';

export default function VehicleInsuranceScreen({ route, navigation }: any) {
  const dispatch = useDispatch();
  const { vehicleId, insurance } = route.params;
  const isEditing = !!insurance;

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Format Date ISO to YYYY-MM-DD for text input
  const getFormattedDate = (isoStr?: string) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    return date.toISOString().split('T')[0];
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InsuranceInput>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: {
      providerName: insurance?.providerName || '',
      policyNumber: insurance?.policyNumber || '',
      coverageType: insurance?.coverageType || '',
      expiryDate: getFormattedDate(insurance?.expiryDate) || '',
      emergencyHelpline: insurance?.emergencyHelpline || '',
    },
  });

  const onSubmit = async (data: InsuranceInput) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.put(`/vehicles/${vehicleId}/insurance`, data);
      dispatch(upsertInsuranceSuccess({ vehicleId, insurance: response.data }));
      navigation.goBack();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save insurance details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove these insurance details?')) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.delete(`/vehicles/${vehicleId}/insurance`);
      dispatch(deleteInsuranceSuccess(vehicleId));
      navigation.goBack();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to remove insurance details.');
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>🛡️ Insurance Details</Text>
          <Text style={styles.subtitle}>
            Optional reference details shown on crash screens and auto-filled in accident exports
          </Text>
        </View>

        {/* ── Error ── */}
        {errorMsg && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>🏢 Insurance Provider Name</Text>
          <Controller
            control={control}
            name="providerName"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.providerName && styles.inputError]}
                placeholder="e.g. EFU General, Adamjee"
                placeholderTextColor="#6B6B80"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />

          <Text style={styles.label}>📄 Policy Number</Text>
          <Controller
            control={control}
            name="policyNumber"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.policyNumber && styles.inputError]}
                placeholder="e.g. POL-123456"
                placeholderTextColor="#6B6B80"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />

          <View style={styles.row}>
            <View style={styles.rowCol}>
              <Text style={styles.label}>📋 Coverage Type</Text>
              <Controller
                control={control}
                name="coverageType"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.coverageType && styles.inputError]}
                    placeholder="e.g. Comprehensive"
                    placeholderTextColor="#6B6B80"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
            </View>

            <View style={styles.rowCol}>
              <Text style={styles.label}>📅 Expiry (YYYY-MM-DD)</Text>
              <Controller
                control={control}
                name="expiryDate"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.expiryDate && styles.inputError]}
                    placeholder="2027-12-31"
                    placeholderTextColor="#6B6B80"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
            </View>
          </View>

          <Text style={styles.label}>📞 Emergency Helpline Number</Text>
          <Controller
            control={control}
            name="emergencyHelpline"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.emergencyHelpline && styles.inputError]}
                placeholder="e.g. 111-338-111"
                placeholderTextColor="#6B6B80"
                keyboardType="phone-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />

          {/* ── Save Button ── */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>💾 Save Insurance Details</Text>
            )}
          </TouchableOpacity>

          {/* ── Delete Button ── */}
          {isEditing && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              disabled={isLoading}
            >
              <Text style={styles.deleteBtnText}>🗑️ Remove Insurance Details</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#A0A0B8',
    marginTop: 6,
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 23, 68, 0.12)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.3)',
    marginBottom: 20,
  },
  errorEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    color: '#FF8A80',
    fontSize: 14,
    textAlign: 'center',
    flex: 1,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    color: '#A0A0B8',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(10, 10, 15, 0.6)',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  inputError: {
    borderColor: '#E53935',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowCol: {
    flex: 0.48,
  },
  saveBtn: {
    backgroundColor: '#E53935',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: 'rgba(255, 23, 68, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  deleteBtnText: {
    color: '#FF5252',
    fontSize: 14,
    fontWeight: '700',
  },
});