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
import { registerSchema, RegisterInput } from '../schemas/validation';
import api from '../api/axios';

export default function RegisterScreen({ navigation }: { navigation: any }) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'DRIVER' | 'MECHANIC'>('DRIVER');

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      role: 'DRIVER',
      cnicNumber: '',
      drivingLicenseNumber: '',
      workshopName: '',
      workshopAddress: '',
      specialization: '',
    },
  });

  const handleRoleChange = (role: 'DRIVER' | 'MECHANIC') => {
    setSelectedRole(role);
    setValue('role', role);
  };

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.post('/auth/register', data);
      // Navigate to email verification screen with the registered email context
      navigation.navigate('EmailVerification', { email: data.email });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Registration failed. Please check details.');
    } finally {
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
          <Text style={styles.title}>Join ResQDrive</Text>
          <Text style={styles.subtitle}>Create an account to start</Text>
        </View>

        {errorMsg && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Role Selector Tabs */}
        <View style={styles.roleTabsContainer}>
          <TouchableOpacity
            style={[styles.roleTab, selectedRole === 'DRIVER' && styles.activeRoleTab]}
            onPress={() => handleRoleChange('DRIVER')}
          >
            <Text style={[styles.roleTabText, selectedRole === 'DRIVER' && styles.activeRoleTabText]}>
              Driver
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleTab, selectedRole === 'MECHANIC' && styles.activeRoleTab]}
            onPress={() => handleRoleChange('MECHANIC')}
          >
            <Text style={[styles.roleTabText, selectedRole === 'MECHANIC' && styles.activeRoleTabText]}>
              Mechanic
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.fullName && styles.inputError]}
                placeholder="John Doe"
                placeholderTextColor="#666"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.fullName && <Text style={styles.errorHelper}>{errors.fullName.message}</Text>}

          <Text style={styles.label}>Email Address</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="john@example.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.email && <Text style={styles.errorHelper}>{errors.email.message}</Text>}

          <Text style={styles.label}>Phone Number</Text>
          <Controller
            control={control}
            name="phoneNumber"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.phoneNumber && styles.inputError]}
                placeholder="+923001234567"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.phoneNumber && <Text style={styles.errorHelper}>{errors.phoneNumber.message}</Text>}

          {/* DYNAMIC ROLE FIELDS: Driver Details */}
          {selectedRole === 'DRIVER' && (
            <View>
              <Text style={styles.label}>CNIC Number</Text>
              <Controller
                control={control}
                name="cnicNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.cnicNumber && styles.inputError]}
                    placeholder="42101-XXXXXXX-X"
                    placeholderTextColor="#666"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.cnicNumber && <Text style={styles.errorHelper}>{errors.cnicNumber.message}</Text>}

              <Text style={styles.label}>Driving License Number</Text>
              <Controller
                control={control}
                name="drivingLicenseNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.drivingLicenseNumber && styles.inputError]}
                    placeholder="DL-XXXXXXX"
                    placeholderTextColor="#666"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.drivingLicenseNumber && (
                <Text style={styles.errorHelper}>{errors.drivingLicenseNumber.message}</Text>
              )}
            </View>
          )}

          {/* DYNAMIC ROLE FIELDS: Mechanic Details */}
          {selectedRole === 'MECHANIC' && (
            <View>
              <Text style={styles.label}>Workshop Name</Text>
              <Controller
                control={control}
                name="workshopName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.workshopName && styles.inputError]}
                    placeholder="Quick Fix Garage"
                    placeholderTextColor="#666"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.workshopName && <Text style={styles.errorHelper}>{errors.workshopName.message}</Text>}

              <Text style={styles.label}>Workshop Address</Text>
              <Controller
                control={control}
                name="workshopAddress"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.workshopAddress && styles.inputError]}
                    placeholder="Plot 45, Industrial Zone"
                    placeholderTextColor="#666"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.workshopAddress && (
                <Text style={styles.errorHelper}>{errors.workshopAddress.message}</Text>
              )}

              <Text style={styles.label}>Specialization</Text>
              <Controller
                control={control}
                name="specialization"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.specialization && styles.inputError]}
                    placeholder="Engine, Electrical, Brake Repair"
                    placeholderTextColor="#666"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.specialization && (
                <Text style={styles.errorHelper}>{errors.specialization.message}</Text>
              )}
            </View>
          )}

          <Text style={styles.label}>Password</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="At least 8 chars, 1 num, 1 spec"
                placeholderTextColor="#666"
                secureTextEntry
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.password && <Text style={styles.errorHelper}>{errors.password.message}</Text>}

          <Text style={styles.label}>Confirm Password</Text>
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.confirmPassword && styles.inputError]}
                placeholder="Confirm your password"
                placeholderTextColor="#666"
                secureTextEntry
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.confirmPassword && <Text style={styles.errorHelper}>{errors.confirmPassword.message}</Text>}

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginText}>Log In</Text>
          </TouchableOpacity>
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
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    marginTop: 8,
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
  roleTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  roleTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeRoleTab: {
    backgroundColor: '#d32f2f',
  },
  roleTabText: {
    color: '#888888',
    fontSize: 15,
    fontWeight: 'bold',
  },
  activeRoleTabText: {
    color: '#ffffff',
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
    borderWidth: 1,
  },
  errorHelper: {
    color: '#ff8a80',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 16,
  },
  registerBtn: {
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
  registerBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#888888',
    fontSize: 14,
  },
  loginText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
