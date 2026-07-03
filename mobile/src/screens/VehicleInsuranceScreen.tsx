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
        <View style={styles.header}>
          <Text style={styles.title}>Insurance Details</Text>
          <Text style={styles.subtitle}>
            Optional reference details shown on crash screens and auto-filled in accident exports
          </Text>
        </View>

        {errorMsg && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>Insurance Provider Name</Text>
          <Controller
            control={control}
            name="providerName"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.providerName && styles.inputError]}
                placeholder="e.g. EFU General, Adamjee"
                placeholderTextColor="#666"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />

          <Text style={styles.label}>Policy Number</Text>
          <Controller
            control={control}
            name="policyNumber"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.policyNumber && styles.inputError]}
                placeholder="e.g. POL-123456"
                placeholderTextColor="#666"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />

          <View style={styles.row}>
            <View style={styles.rowCol}>
              <Text style={styles.label}>Coverage Type</Text>
              <Controller
                control={control}
                name="coverageType"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.coverageType && styles.inputError]}
                    placeholder="e.g. Comprehensive"
                    placeholderTextColor="#666"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
            </View>

            <View style={styles.rowCol}>
              <Text style={styles.label}>Expiry Date (YYYY-MM-DD)</Text>
              <Controller
                control={control}
                name="expiryDate"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.expiryDate && styles.inputError]}
                    placeholder="2027-12-31"
                    placeholderTextColor="#666"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
            </View>
          </View>

          <Text style={styles.label}>Emergency Helpline Number</Text>
          <Controller
            control={control}
            name="emergencyHelpline"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.emergencyHelpline && styles.inputError]}
                placeholder="e.g. 111-338-111"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Insurance Details</Text>
            )}
          </TouchableOpacity>

          {isEditing && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              disabled={isLoading}
            >
              <Text style={styles.deleteBtnText}>Remove Insurance Details</Text>
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
    backgroundColor: '#121212',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 6,
  },
  errorContainer: {
    backgroundColor: '#3a1313',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d32f2f',
    marginBottom: 20,
  },
  errorText: {
    color: '#ff8a80',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  inputError: {
    borderColor: '#d32f2f',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowCol: {
    flex: 0.48,
  },
  saveBtn: {
    backgroundColor: '#d32f2f',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#d32f2f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ff5252',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  deleteBtnText: {
    color: '#ff5252',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
