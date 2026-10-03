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
import { vehicleSchema, VehicleInput } from '../schemas/validation';
import {
  useCreateVehicleMutation,
  useUpdateVehicleMutation,
  useDeleteVehicleMutation,
} from '../store/api/vehiclesApi';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui';
import { colors, darkColors, tints } from '../theme/tokens';

export default function AddEditVehicleScreen({ route, navigation }: any) {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const vehicle = route.params?.vehicle; // If defined, we are editing
  const isEditing = !!vehicle;

  // Batch 11: Migrated to RTK Query mutations — auto-invalidates 'VehicleList' tag.
  const [createVehicle] = useCreateVehicleMutation();
  const [updateVehicle] = useUpdateVehicleMutation();
  const [deleteVehicle] = useDeleteVehicleMutation();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<VehicleInput>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      make: vehicle?.make || '',
      model: vehicle?.model || '',
      year: vehicle?.year?.toString() || new Date().getFullYear().toString(),
      color: vehicle?.color || '',
      licensePlate: vehicle?.licensePlate || '',
    },
  });

  const onSubmit = async (data: VehicleInput) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (isEditing) {
        // Batch 11: RTK Query mutation — invalidates 'Vehicle' + 'VehicleList' tags.
        await updateVehicle({ id: vehicle.id, body: data }).unwrap();
      } else {
        // Batch 11: RTK Query mutation — invalidates 'VehicleList' tag.
        await createVehicle(data).unwrap();
      }
      navigation.goBack();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save vehicle details.');
    } finally {
      setIsLoading(false);
    }
  };

  const doDelete = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // Batch 11: RTK Query mutation — invalidates 'VehicleList' tag.
      await deleteVehicle(vehicle.id).unwrap();
      navigation.goBack();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete vehicle.');
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Are you sure you want to delete ${vehicle.make} ${vehicle.model}?`)) {
        doDelete();
      }
    } else {
      // Phase 8: replaced destructive Alert.alert with ConfirmDialog primitive
      setDeleteDialogVisible(true);
    }
  };

  const handleConfirmDelete = () => {
    setDeleteDialogVisible(false);
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
            <Ionicons name={isEditing ? 'pencil-outline' : 'car-outline'} size={26} color={colors.danger[500]} />
            <Text style={styles.title} accessibilityRole="header" allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              {isEditing ? 'Edit Vehicle' : 'Add Vehicle'}
            </Text>
          </View>
          <Text style={styles.subtitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
            {isEditing ? 'Update your registered vehicle details' : 'Register a vehicle for accident detection'}
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
          <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Make / Manufacturer</Text>
          <Controller
            control={control}
            name="make"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.make && styles.inputError]}
                placeholder="e.g. Honda, Suzuki"
                placeholderTextColor={darkColors.textTertiary}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.5}
              />
            )}
          />
          {errors.make && <Text style={styles.errorHelper} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{errors.make.message}</Text>}

          <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Model</Text>
          <Controller
            control={control}
            name="model"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.model && styles.inputError]}
                placeholder="e.g. Civic, Swift"
                placeholderTextColor={darkColors.textTertiary}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.5}
              />
            )}
          />
          {errors.model && <Text style={styles.errorHelper} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{errors.model.message}</Text>}

          <View style={styles.row}>
            <View style={styles.rowCol}>
              <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Year</Text>
              <Controller
                control={control}
                name="year"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.year && styles.inputError]}
                    placeholder="2022"
                    placeholderTextColor={darkColors.textTertiary}
                    keyboardType="number-pad"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value !== undefined && value !== null ? String(value) : ''}
                    allowFontScaling={true}
                    maxFontSizeMultiplier={1.5}
                  />
                )}
              />
              {errors.year && <Text style={styles.errorHelper} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{errors.year.message}</Text>}
            </View>

            <View style={styles.rowCol}>
              <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Color</Text>
              <Controller
                control={control}
                name="color"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.color && styles.inputError]}
                    placeholder="e.g. White"
                    placeholderTextColor={darkColors.textTertiary}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    allowFontScaling={true}
                    maxFontSizeMultiplier={1.5}
                  />
                )}
              />
              {errors.color && <Text style={styles.errorHelper} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{errors.color.message}</Text>}
            </View>
          </View>

          <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>License Plate Number</Text>
          <Controller
            control={control}
            name="licensePlate"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.licensePlate && styles.inputError]}
                placeholder="e.g. ABC-1234"
                placeholderTextColor={darkColors.textTertiary}
                autoCapitalize="characters"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.5}
              />
            )}
          />
          {errors.licensePlate && <Text style={styles.errorHelper} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{errors.licensePlate.message}</Text>}

          {/* ── Save Button ── */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading} accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator color={darkColors.text} />
            ) : (
              <Text style={styles.saveBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                {isEditing ? 'Save Changes' : 'Register Vehicle'}
              </Text>
            )}
          </TouchableOpacity>

          {isEditing && (
            <View>
              {/* Optional Insurance card redirect */}
              <TouchableOpacity
                style={styles.insuranceBtn}
                onPress={() =>
                  navigation.navigate('VehicleInsurance', {
                    vehicleId: vehicle.id,
                    insurance: vehicle.insurance,
                  })
                } accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.danger[500]} />
                  <Text style={styles.insuranceBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                    {vehicle.insurance ? 'View/Edit Insurance Details' : 'Add Vehicle Insurance (Optional)'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                disabled={isLoading} accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger[400]} />
                  <Text style={styles.deleteBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Remove Vehicle</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Phase 8: ConfirmDialog replaces destructive Alert.alert */}
      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Delete Vehicle"
        description={vehicle ? `Are you sure you want to delete ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})?` : undefined}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogVisible(false)}
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
  errorHelper: {
    color: colors.danger[300],
    fontSize: 12,
    marginTop: -10,
    marginBottom: 16,
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
  insuranceBtn: {
    backgroundColor: tints.infoSubtle,
    borderWidth: 1,
    borderColor: tints.infoMedium,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  insuranceBtnText: {
    color: colors.info[500],
    fontSize: 14,
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