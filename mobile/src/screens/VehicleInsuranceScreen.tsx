import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui';
import { colors, darkColors, tints } from '../theme/tokens';

export default function VehicleInsuranceScreen({ route, navigation }: any) {
  const toast = useToast();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { vehicleId, insurance } = route.params;
  const isEditing = !!insurance;

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [removeDialogVisible, setRemoveDialogVisible] = useState(false);

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

  const doDelete = async () => {
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

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Are you sure you want to remove these insurance details?')) {
        doDelete();
      }
    } else {
      // Phase 8: replaced destructive Alert.alert with ConfirmDialog primitive
      setRemoveDialogVisible(true);
    }
  };

  const handleConfirmRemove = () => {
    setRemoveDialogVisible(false);
    doDelete();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingTop: insets.top + 16 }]} keyboardShouldPersistTaps="handled">
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="shield-checkmark-outline" size={26} color={colors.danger[500]} />
            <Text style={styles.title} accessibilityRole="header" allowFontScaling={true} maxFontSizeMultiplier={1.5}>Insurance Details</Text>
          </View>
          <Text style={styles.subtitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
            Optional reference details shown on crash screens and auto-filled in accident exports
          </Text>
        </View>

        {/* ── Error ── */}
        {errorMsg && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger[300]} style={{ marginRight: 8 }} />
            <Text style={styles.errorText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Insurance Provider Name</Text>
          <Controller
            control={control}
            name="providerName"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.providerName && styles.inputError]}
                placeholder="e.g. EFU General, Adamjee"
                placeholderTextColor={darkColors.textTertiary}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.5}
              />
            )}
          />

          <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Policy Number</Text>
          <Controller
            control={control}
            name="policyNumber"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.policyNumber && styles.inputError]}
                placeholder="e.g. POL-123456"
                placeholderTextColor={darkColors.textTertiary}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.5}
              />
            )}
          />

          <View style={styles.row}>
            <View style={styles.rowCol}>
              <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Coverage Type</Text>
              <Controller
                control={control}
                name="coverageType"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.coverageType && styles.inputError]}
                    placeholder="e.g. Comprehensive"
                    placeholderTextColor={darkColors.textTertiary}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    allowFontScaling={true}
                    maxFontSizeMultiplier={1.5}
                  />
                )}
              />
            </View>

            <View style={styles.rowCol}>
              <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Expiry (YYYY-MM-DD)</Text>
              <Controller
                control={control}
                name="expiryDate"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.expiryDate && styles.inputError]}
                    placeholder="2027-12-31"
                    placeholderTextColor={darkColors.textTertiary}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    allowFontScaling={true}
                    maxFontSizeMultiplier={1.5}
                  />
                )}
              />
            </View>
          </View>

          <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Emergency Helpline Number</Text>
          <Controller
            control={control}
            name="emergencyHelpline"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.emergencyHelpline && styles.inputError]}
                placeholder="e.g. 111-338-111"
                placeholderTextColor={darkColors.textTertiary}
                keyboardType="phone-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.5}
              />
            )}
          />

          {/* ── Save Button ── */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading} accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator color={darkColors.text} />
            ) : (
              <Text style={styles.saveBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Save Insurance Details</Text>
            )}
          </TouchableOpacity>

          {/* ── Delete Button ── */}
          {isEditing && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              disabled={isLoading} accessibilityRole="button"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Ionicons name="trash-outline" size={18} color={colors.danger[400]} />
                <Text style={styles.deleteBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Remove Insurance Details</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Phase 8: ConfirmDialog replaces destructive Alert.alert */}
      <ConfirmDialog
        visible={removeDialogVisible}
        title="Remove Insurance Details"
        description="Are you sure you want to remove these insurance details?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmRemove}
        onCancel={() => setRemoveDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkColors.background,
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
    color: darkColors.text,
  },
  subtitle: {
    fontSize: 14,
    color: darkColors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tints.dangerErrorBg,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tints.dangerErrorBorder,
    marginBottom: 20,
  },
  errorEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    color: colors.danger[300],
    fontSize: 14,
    textAlign: 'center',
    flex: 1,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    color: darkColors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: tints.overlayStrong,
    color: darkColors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
  },
  inputError: {
    borderColor: colors.danger[500],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowCol: {
    flex: 0.48,
  },
  saveBtn: {
    backgroundColor: colors.danger[500],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  saveBtnText: {
    color: darkColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: tints.dangerErrorBg,
    borderWidth: 1,
    borderColor: tints.dangerErrorBorder,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  deleteBtnText: {
    color: colors.danger[400],
    fontSize: 14,
    fontWeight: '700',
  },
});