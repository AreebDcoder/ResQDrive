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
import { vehicleSchema, VehicleInput } from '../schemas/validation';
import { addVehicleSuccess, updateVehicleSuccess, deleteVehicleSuccess } from '../store/slices/vehiclesSlice';
import api from '../api/axios';

export default function AddEditVehicleScreen({ route, navigation }: any) {
  const dispatch = useDispatch();
  const vehicle = route.params?.vehicle; // If defined, we are editing
  const isEditing = !!vehicle;

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        const response = await api.patch(`/vehicles/${vehicle.id}`, data);
        dispatch(updateVehicleSuccess(response.data));
      } else {
        const response = await api.post('/vehicles', data);
        dispatch(addVehicleSuccess(response.data));
      }
      navigation.goBack();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save vehicle details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.delete(`/vehicles/${vehicle.id}`);
      dispatch(deleteVehicleSuccess(vehicle.id));
      navigation.goBack();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete vehicle.');
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
          <Text style={styles.title}>{isEditing ? 'Edit Vehicle' : 'Add Vehicle'}</Text>
          <Text style={styles.subtitle}>
            {isEditing ? 'Update your registered vehicle details' : 'Register a vehicle for accident detection'}
          </Text>
        </View>

        {errorMsg && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>Make / Manufacturer</Text>
          <Controller
            control={control}
            name="make"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.make && styles.inputError]}
                placeholder="e.g. Honda, Suzuki"
                placeholderTextColor="#666"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.make && <Text style={styles.errorHelper}>{errors.make.message}</Text>}

          <Text style={styles.label}>Model</Text>
          <Controller
            control={control}
            name="model"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.model && styles.inputError]}
                placeholder="e.g. Civic, Swift"
                placeholderTextColor="#666"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.model && <Text style={styles.errorHelper}>{errors.model.message}</Text>}

          <View style={styles.row}>
            <View style={styles.rowCol}>
              <Text style={styles.label}>Year</Text>
              <Controller
                control={control}
                name="year"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.year && styles.inputError]}
                    placeholder="2022"
                    placeholderTextColor="#666"
                    keyboardType="number-pad"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value !== undefined && value !== null ? String(value) : ''}
                  />
                )}
              />
              {errors.year && <Text style={styles.errorHelper}>{errors.year.message}</Text>}
            </View>

            <View style={styles.rowCol}>
              <Text style={styles.label}>Color</Text>
              <Controller
                control={control}
                name="color"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.color && styles.inputError]}
                    placeholder="e.g. White"
                    placeholderTextColor="#666"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.color && <Text style={styles.errorHelper}>{errors.color.message}</Text>}
            </View>
          </View>

          <Text style={styles.label}>License Plate Number</Text>
          <Controller
            control={control}
            name="licensePlate"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.licensePlate && styles.inputError]}
                placeholder="e.g. ABC-1234"
                placeholderTextColor="#666"
                autoCapitalize="characters"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.licensePlate && <Text style={styles.errorHelper}>{errors.licensePlate.message}</Text>}

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Register Vehicle'}</Text>
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
                }
              >
                <Text style={styles.insuranceBtnText}>
                  {vehicle.insurance ? '🛡️ View/Edit Insurance Details' : '➕ Add Vehicle Insurance (Optional)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                disabled={isLoading}
              >
                <Text style={styles.deleteBtnText}>Remove Vehicle</Text>
              </TouchableOpacity>
            </View>
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
  errorHelper: {
    color: '#ff8a80',
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
  insuranceBtn: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#d32f2f',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  insuranceBtnText: {
    color: '#d32f2f',
    fontSize: 14,
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
