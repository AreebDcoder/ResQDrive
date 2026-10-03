import React, { useState, useRef, useEffect } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterInput } from '../schemas/validation';
import { useRegisterMutation, useGoogleRegisterMutation } from '../store/api/authApi';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../store/slices/authSlice';
import { setItemAsync } from '../utils/secureStorage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, FormInput } from '../components/ui';
import { colors, darkColors, tints } from '../theme/tokens';

export default function RegisterScreen({ route, navigation }: { route: any; navigation: any }) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const googleData = route?.params?.googleData || null;
  const isGoogleUser = !!googleData;
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'DRIVER' | 'MECHANIC'>('DRIVER');

  // Batch 11: Migrated to RTK Query mutations. Auth state stays in authSlice.
  const [register] = useRegisterMutation();
  const [googleRegister] = useGoogleRegisterMutation();

  // Entrance animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(18)).current;
  const cardY = useRef(new Animated.Value(24)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  // Batch 7 Phase 4: Respect Reduce Motion accessibility setting
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Skip decorative entrance animation when Reduce Motion is enabled
    if (reduceMotion) {
      headerTranslateY.setValue(0);
      headerOpacity.setValue(1);
      cardY.setValue(0);
      cardOpacity.setValue(1);
      return;
    }
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
  }, [reduceMotion]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterInput>({
       resolver: isGoogleUser ? (undefined as any) : zodResolver(registerSchema),
    defaultValues: {
         fullName: googleData?.fullName || '',
      email: googleData?.email || '',
      phoneNumber: '',
            password: isGoogleUser ? 'GoogleAuth@123' : '',
      confirmPassword: isGoogleUser ? 'GoogleAuth@123' : '',
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
    if (isGoogleUser) {
      if (!data.fullName?.trim()) { setErrorMsg('Full name is required.'); return; }
      if (!data.phoneNumber?.trim()) { setErrorMsg('Phone number is required.'); return; }
      if (selectedRole === 'DRIVER') {
        if (!data.cnicNumber?.trim()) { setErrorMsg('CNIC number is required.'); return; }
        if (!data.drivingLicenseNumber?.trim()) { setErrorMsg('License number is required.'); return; }
      }
      if (selectedRole === 'MECHANIC') {
        if (!data.workshopName?.trim()) { setErrorMsg('Workshop name is required.'); return; }
        if (!data.workshopAddress?.trim()) { setErrorMsg('Workshop address is required.'); return; }
        if (!data.specialization?.trim()) { setErrorMsg('Specialization is required.'); return; }
      }
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (isGoogleUser) {
        const { password, confirmPassword, ...registerPayload } = data;
        // Batch 11: RTK Query mutation — POST /auth/google/register.
        const response = await googleRegister({ ...registerPayload, profilePictureUrl: googleData?.profilePictureUrl }).unwrap();
        const { accessToken, refreshToken, user } = response;
        await setItemAsync('refreshToken', refreshToken);
        dispatch(loginSuccess({ accessToken, user }));
      } else {
        const { confirmPassword, ...registerPayload } = data;
        // Batch 11: RTK Query mutation — POST /auth/register.
        await register(registerPayload).unwrap();
        navigation.navigate('EmailVerification', { email: data.email });
      }
    } catch (err: any) {
      setErrorMsg(err.data?.message || 'Registration failed. Please check details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessibilityRole="button">
      <View style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            contentContainerStyle={[styles.scrollContainer, { paddingTop: insets.top + 16 }]}
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
              <Text style={styles.title} accessibilityRole="header" allowFontScaling={true} maxFontSizeMultiplier={1.5}>Join ResQDrive</Text>
              <Text style={styles.subtitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Create an account to start</Text>
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
                  <Ionicons name="alert-circle-outline" size={18} color={colors.danger[400]} style={{ marginRight: 8 }} />
                  <Text style={styles.errorText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{errorMsg}</Text>
                </View>
              )}

              {/* Role Selector Tabs */}
              <View style={styles.roleTabsContainer}>
                <TouchableOpacity
                  style={[styles.roleTab, selectedRole === 'DRIVER' && styles.activeRoleTab]}
                  onPress={() => handleRoleChange('DRIVER')}
                  activeOpacity={0.7} accessibilityRole="button"
                >
                  <Ionicons name="car-outline" size={18} color={selectedRole === 'DRIVER' ? darkColors.text : darkColors.textTertiary} />
                  <Text style={[styles.roleTabText, selectedRole === 'DRIVER' && styles.activeRoleTabText]} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                    Driver
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleTab, selectedRole === 'MECHANIC' && styles.activeRoleTab]}
                  onPress={() => handleRoleChange('MECHANIC')}
                  activeOpacity={0.7} accessibilityRole="button"
                >
                  <Ionicons name="construct-outline" size={18} color={selectedRole === 'MECHANIC' ? darkColors.text : darkColors.textTertiary} />
                  <Text style={[styles.roleTabText, selectedRole === 'MECHANIC' && styles.activeRoleTabText]} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                    Mechanic
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.form}>
                <FormInput
                  name="fullName"
                  control={control}
                  label="Full Name"
                  placeholder="John Doe"
                  leftIcon="person-outline"
                />

                <FormInput
                  name="email"
                  control={control}
                  label="Email Address"
                  placeholder="john@example.com"
                  leftIcon="mail-outline"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isGoogleUser}
                />

                <FormInput
                  name="phoneNumber"
                  control={control}
                  label="Phone Number"
                  placeholder="+923001234567"
                  leftIcon="call-outline"
                  keyboardType="phone-pad"
                />

                {/* DYNAMIC ROLE FIELDS: Driver Details */}
                {selectedRole === 'DRIVER' && (
                  <View style={styles.roleSection}>
                    <View style={styles.roleSectionHeader}>
                      <Ionicons name="card-outline" size={20} color={colors.danger[500]} style={{ marginRight: 8 }} />
                      <Text style={styles.roleSectionTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Driver Details</Text>
                    </View>

                    <FormInput
                      name="cnicNumber"
                      control={control}
                      label="CNIC Number"
                      placeholder="42101-XXXXXXX-X"
                    />

                    <FormInput
                      name="drivingLicenseNumber"
                      control={control}
                      label="Driving License Number"
                      placeholder="DL-XXXXXXX"
                    />
                  </View>
                )}

                {/* DYNAMIC ROLE FIELDS: Mechanic Details */}
                {selectedRole === 'MECHANIC' && (
                  <View style={styles.roleSection}>
                    <View style={styles.roleSectionHeader}>
                      <Ionicons name="business-outline" size={20} color={colors.danger[500]} style={{ marginRight: 8 }} />
                      <Text style={styles.roleSectionTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Workshop Details</Text>
                    </View>

                    <FormInput
                      name="workshopName"
                      control={control}
                      label="Workshop Name"
                      placeholder="Quick Fix Garage"
                    />

                    <FormInput
                      name="workshopAddress"
                      control={control}
                      label="Workshop Address"
                      placeholder="Plot 45, Industrial Zone"
                    />

                    <FormInput
                      name="specialization"
                      control={control}
                      label="Specialization"
                      placeholder="Engine, Electrical, Brake Repair"
                    />
                  </View>
                )}

                {!isGoogleUser && (
                  <>
                    <FormInput
                      name="password"
                      control={control}
                      label="Password"
                      placeholder="At least 8 chars, 1 num, 1 spec"
                      leftIcon="lock-closed-outline"
                      secureTextEntry
                      autoCapitalize="none"
                    />

                    <FormInput
                      name="confirmPassword"
                      control={control}
                      label="Confirm Password"
                      placeholder="Confirm your password"
                      leftIcon="lock-closed-outline"
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </>
                )}

                {/* CTA Button — using ui/Button primitive */}
                <Button
                  label="Create Account"
                  variant="danger"
                  size="lg"
                  onPress={handleSubmit(onSubmit)}
                  loading={isLoading}
                  fullWidth
                  accessibilityHint="Submit registration form"
                />
              </View>
            </Animated.View>

                    {!isGoogleUser && (<>
            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Already have an account? </Text>
              <Button
                label="Log In"
                variant="ghost"
                size="sm"
                onPress={() => navigation.navigate('Login')}
              />
            </View>
            </>)}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkColors.background,
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
    backgroundColor: tints.overlayBrand,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: darkColors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: darkColors.textSecondary,
  },
  formCard: {
    backgroundColor: tints.glassCard,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    marginBottom: 24,
    shadowColor: colors.neutral[950],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
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
  errorIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  errorText: {
    color: colors.danger[400],
    fontSize: 13,
    flex: 1,
  },
  roleTabsContainer: {
    flexDirection: 'row',
    backgroundColor: tints.whiteSubtle,
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
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
    backgroundColor: colors.danger[500],
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  roleTabEmoji: {
    fontSize: 16,
  },
  roleTabText: {
    color: darkColors.textTertiary,
    fontSize: 14,
    fontWeight: '700',
  },
  activeRoleTabText: {
    color: darkColors.text,
  },
  form: {
    width: '100%',
  },
  roleSection: {
    backgroundColor: tints.whiteSubtle,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: tints.whiteSubtle,
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
    color: darkColors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  label: {
    fontSize: 13,
    color: darkColors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tints.whiteSubtle,
    borderWidth: 1,
    borderColor: tints.whiteBorderStrong,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 8,
  },
  inputFocused: {
    borderColor: colors.danger[500],
    backgroundColor: tints.dangerSubtle,
  },
  inputError: {
    borderColor: colors.danger[500],
    borderWidth: 1.5,
  },
  inputIcon: {
    fontSize: 15,
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: darkColors.text,
    fontSize: 15,
    padding: 0,
  },
  errorHelper: {
    color: colors.danger[400],
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
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  registerBtnGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.danger[500],
  },
  registerBtnDisabled: {
    opacity: 0.55,
  },
  registerBtnText: {
    color: darkColors.text,
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
    color: darkColors.textTertiary,
    fontSize: 14,
  },
  loginText: {
    color: colors.info[500],
    fontSize: 14,
    fontWeight: '700',
  },
});