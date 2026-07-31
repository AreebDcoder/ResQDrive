import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Entrance animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(18)).current;
  const cardY = useRef(new Animated.Value(24)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(cardY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

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
      // Strip confirmPassword since the backend DTO forbids non-whitelisted properties
      const { confirmPassword, ...registerPayload } = data;
      await api.post('/auth/register', registerPayload);
      // Navigate to email verification screen with the registered email context
      navigation.navigate('EmailVerification', { email: data.email });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Registration failed. Please check details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Background glow */}
            <View style={styles.bgGlow} />

            {/* Header */}
            <Animated.View
              style={[
                styles.header,
                {
                  opacity: headerOpacity,
                  transform: [{ translateY: headerTranslateY }],
                },
              ]}
            >
              <Text style={styles.title}>Join ResQDrive</Text>
              <Text style={styles.subtitle}>Create an account to start</Text>
            </Animated.View>

            {/* Glass Card */}
            <Animated.View
              style={[
                styles.formCard,
                {
                  transform: [{ translateY: cardY }],
                  opacity: cardOpacity,
                },
              ]}
            >
              {/* Error */}
              {errorMsg && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorIcon}>⚠</Text>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}

              {/* Role Selector Tabs */}
              <View style={styles.roleTabsContainer}>
                <TouchableOpacity
                  style={[styles.roleTab, selectedRole === 'DRIVER' && styles.activeRoleTab]}
                  onPress={() => handleRoleChange('DRIVER')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.roleTabEmoji}>🚗</Text>
                  <Text style={[styles.roleTabText, selectedRole === 'DRIVER' && styles.activeRoleTabText]}>
                    Driver
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleTab, selectedRole === 'MECHANIC' && styles.activeRoleTab]}
                  onPress={() => handleRoleChange('MECHANIC')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.roleTabEmoji}>🔧</Text>
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
                    <View style={[styles.inputWrapper, focusedField === 'fullName' && styles.inputFocused, errors.fullName && styles.inputError]}>
                      <Text style={styles.inputIcon}>👤</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="John Doe"
                        placeholderTextColor="#6B6B80"
                        onBlur={() => { onBlur(); setFocusedField(null); }}
                        onChangeText={onChange}
                        onFocus={() => setFocusedField('fullName')}
                        value={value}
                      />
                    </View>
                  )}
                />
                {errors.fullName && <Text style={styles.errorHelper}>{errors.fullName.message}</Text>}

                <Text style={styles.label}>Email Address</Text>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={[styles.inputWrapper, focusedField === 'email' && styles.inputFocused, errors.email && styles.inputError]}>
                      <Text style={styles.inputIcon}>✉</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="john@example.com"
                        placeholderTextColor="#6B6B80"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        onBlur={() => { onBlur(); setFocusedField(null); }}
                        onChangeText={onChange}
                        onFocus={() => setFocusedField('email')}
                        value={value}
                      />
                    </View>
                  )}
                />
                {errors.email && <Text style={styles.errorHelper}>{errors.email.message}</Text>}

                <Text style={styles.label}>Phone Number</Text>
                <Controller
                  control={control}
                  name="phoneNumber"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={[styles.inputWrapper, focusedField === 'phone' && styles.inputFocused, errors.phoneNumber && styles.inputError]}>
                      <Text style={styles.inputIcon}>📱</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="+923001234567"
                        placeholderTextColor="#6B6B80"
                        keyboardType="phone-pad"
                        onBlur={() => { onBlur(); setFocusedField(null); }}
                        onChangeText={onChange}
                        onFocus={() => setFocusedField('phone')}
                        value={value}
                      />
                    </View>
                  )}
                />
                {errors.phoneNumber && <Text style={styles.errorHelper}>{errors.phoneNumber.message}</Text>}

                {/* DYNAMIC ROLE FIELDS: Driver Details */}
                {selectedRole === 'DRIVER' && (
                  <View style={styles.roleSection}>
                    <View style={styles.roleSectionHeader}>
                      <Text style={styles.roleSectionIcon}>🆔</Text>
                      <Text style={styles.roleSectionTitle}>Driver Details</Text>
                    </View>

                    <Text style={styles.label}>CNIC Number</Text>
                    <Controller
                      control={control}
                      name="cnicNumber"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View style={[styles.inputWrapper, errors.cnicNumber && styles.inputError]}>
                          <TextInput
                            style={styles.input}
                            placeholder="42101-XXXXXXX-X"
                            placeholderTextColor="#6B6B80"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                          />
                        </View>
                      )}
                    />
                    {errors.cnicNumber && <Text style={styles.errorHelper}>{errors.cnicNumber.message}</Text>}

                    <Text style={styles.label}>Driving License Number</Text>
                    <Controller
                      control={control}
                      name="drivingLicenseNumber"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View style={[styles.inputWrapper, errors.drivingLicenseNumber && styles.inputError]}>
                          <TextInput
                            style={styles.input}
                            placeholder="DL-XXXXXXX"
                            placeholderTextColor="#6B6B80"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                          />
                        </View>
                      )}
                    />
                    {errors.drivingLicenseNumber && (
                      <Text style={styles.errorHelper}>{errors.drivingLicenseNumber.message}</Text>
                    )}
                  </View>
                )}

                {/* DYNAMIC ROLE FIELDS: Mechanic Details */}
                {selectedRole === 'MECHANIC' && (
                  <View style={styles.roleSection}>
                    <View style={styles.roleSectionHeader}>
                      <Text style={styles.roleSectionIcon}>🏭</Text>
                      <Text style={styles.roleSectionTitle}>Workshop Details</Text>
                    </View>

                    <Text style={styles.label}>Workshop Name</Text>
                    <Controller
                      control={control}
                      name="workshopName"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View style={[styles.inputWrapper, errors.workshopName && styles.inputError]}>
                          <TextInput
                            style={styles.input}
                            placeholder="Quick Fix Garage"
                            placeholderTextColor="#6B6B80"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                          />
                        </View>
                      )}
                    />
                    {errors.workshopName && <Text style={styles.errorHelper}>{errors.workshopName.message}</Text>}

                    <Text style={styles.label}>Workshop Address</Text>
                    <Controller
                      control={control}
                      name="workshopAddress"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View style={[styles.inputWrapper, errors.workshopAddress && styles.inputError]}>
                          <TextInput
                            style={styles.input}
                            placeholder="Plot 45, Industrial Zone"
                            placeholderTextColor="#6B6B80"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                          />
                        </View>
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
                        <View style={[styles.inputWrapper, errors.specialization && styles.inputError]}>
                          <TextInput
                            style={styles.input}
                            placeholder="Engine, Electrical, Brake Repair"
                            placeholderTextColor="#6B6B80"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                          />
                        </View>
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
                    <View style={[styles.inputWrapper, focusedField === 'password' && styles.inputFocused, errors.password && styles.inputError]}>
                      <Text style={styles.inputIcon}>🔒</Text>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="At least 8 chars, 1 num, 1 spec"
                        placeholderTextColor="#6B6B80"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        onBlur={() => { onBlur(); setFocusedField(null); }}
                        onChangeText={onChange}
                        onFocus={() => setFocusedField('password')}
                        value={value}
                      />
                      <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                        <Text style={styles.eyeBtnText}>{showPassword ? '🙈' : '👁'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
                {errors.password && <Text style={styles.errorHelper}>{errors.password.message}</Text>}

                <Text style={styles.label}>Confirm Password</Text>
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={[styles.inputWrapper, focusedField === 'confirmPassword' && styles.inputFocused, errors.confirmPassword && styles.inputError]}>
                      <Text style={styles.inputIcon}>🔒</Text>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="Confirm your password"
                        placeholderTextColor="#6B6B80"
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        onBlur={() => { onBlur(); setFocusedField(null); }}
                        onChangeText={onChange}
                        onFocus={() => setFocusedField('confirmPassword')}
                        value={value}
                      />
                      <TouchableOpacity
                        style={styles.eyeBtn}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        <Text style={styles.eyeBtnText}>{showConfirmPassword ? '🙈' : '👁'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
                {errors.confirmPassword && <Text style={styles.errorHelper}>{errors.confirmPassword.message}</Text>}

                {/* CTA Button */}
                <TouchableOpacity
                  style={[styles.registerBtn, isLoading && styles.registerBtnDisabled]}
                  onPress={handleSubmit(onSubmit)}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  <View style={styles.registerBtnGradient} />
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.registerBtnText}>Create Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginText}>Log In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  bgGlow: {
    position: 'absolute',
    top: -100,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(229, 57, 53, 0.07)',
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#A0A0B8',
  },
  formCard: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 23, 68, 0.1)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.3)',
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 13,
    flex: 1,
  },
  roleTabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 4,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  activeRoleTab: {
    backgroundColor: '#E53935',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  roleTabEmoji: {
    fontSize: 16,
  },
  roleTabText: {
    color: '#6B6B80',
    fontSize: 14,
    fontWeight: '700',
  },
  activeRoleTabText: {
    color: '#FFFFFF',
  },
  form: {
    width: '100%',
  },
  roleSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  roleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  roleSectionIcon: {
    fontSize: 18,
  },
  roleSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A0A0B8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  label: {
    fontSize: 13,
    color: '#A0A0B8',
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 8,
  },
  inputFocused: {
    borderColor: '#E53935',
    backgroundColor: 'rgba(229, 57, 53, 0.05)',
  },
  inputError: {
    borderColor: '#FF1744',
    borderWidth: 1.5,
  },
  inputIcon: {
    fontSize: 15,
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    padding: 0,
  },
  errorHelper: {
    color: '#FF5252',
    fontSize: 12,
    marginTop: -4,
    marginBottom: 12,
    marginLeft: 4,
  },
  eyeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  eyeBtnText: {
    fontSize: 18,
  },
  registerBtn: {
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 12,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  registerBtnGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E53935',
  },
  registerBtnDisabled: {
    opacity: 0.55,
  },
  registerBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    zIndex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    color: '#6B6B80',
    fontSize: 14,
  },
  loginText: {
    color: '#2979FF',
    fontSize: 14,
    fontWeight: '700',
  },
});