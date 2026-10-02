// ═══════════════════════════════════════════════════════════════
// ResQDrive v2 — PROFILE SCREEN (Modernized)
// All imports, logic, state, handlers preserved identically.
// Only JSX structure + StyleSheet updated: dark glassmorphism theme.
// ═══════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { getItemAsync, deleteItemAsync } from '../utils/secureStorage';
import { RootState } from '../store/store';
import { updateUserProfile, logoutAction } from '../store/slices/authSlice';
import { updateProfileSchema, changePasswordSchema, UpdateProfileInput, ChangePasswordInput } from '../schemas/validation';
import { FCMService } from '../services/fcmService';
import api from '../api/axios';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, FormInput, Input } from '../components/ui';
import { useTheme } from '../theme/useTheme';
import { colors, darkColors, tints } from '../theme/tokens';

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { theme, toggleTheme } = useTheme();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPwLoading, setIsPwLoading] = useState(false);

  // Profile Form
  const {
    control: profileControl,
    handleSubmit: handleProfileSubmit,
    reset: resetProfileForm,
    formState: { errors: profileErrors },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      phoneNumber: user?.phoneNumber || '',
      cnicNumber: user?.driverDetails?.cnicNumber || '',
      drivingLicenseNumber: user?.driverDetails?.drivingLicenseNumber || '',
      workshopName: user?.mechanicDetails?.workshopName || '',
      workshopAddress: user?.mechanicDetails?.workshopAddress || '',
      specialization: user?.mechanicDetails?.specialization || '',
    },
  });

  // Change Password Form
  const {
    control: pwControl,
    handleSubmit: handlePwSubmit,
    reset: resetPwForm,
    formState: { errors: pwErrors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const onUpdateProfile = async (data: UpdateProfileInput) => {
    setIsLoading(true);
    setProfileMessage(null);
    try {
      const response = await api.patch('/users/me', data);
      dispatch(updateUserProfile(response.data));
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setIsLoading(false);
    }
  };

  const onChangePassword = async (data: ChangePasswordInput) => {
    setIsPwLoading(true);
    setPwMessage(null);
    try {
      await api.patch('/users/me/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setPwMessage({ type: 'success', text: 'Password changed successfully! You will be logged out.' });
      resetPwForm();
      
      // Auto logout after 2 seconds
      setTimeout(async () => {
        await handleLogout();
      }, 2000);
    } catch (err: any) {
      setPwMessage({ type: 'error', text: err.response?.data?.message || 'Incorrect current password.' });
    } finally {
      setIsPwLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // De-register push token from backend prior to destroying auth tokens
      await FCMService.unregisterDeviceWithBackend();

      const token = await getItemAsync('refreshToken');
      if (token) {
        await api.post('/auth/logout', { refreshToken: token });
      }
    } catch (err) {
    } finally {
            await deleteItemAsync('refreshToken');
      dispatch(logoutAction());
    }
  };

  const simulatePictureUpload = async () => {
    setProfileMessage(null);
    try {
      // Simulate profile picture upload by generating a random avatar URL
      const randomAvatarId = Math.floor(Math.random() * 100);
      const url = `https://i.pravatar.cc/300?img=${randomAvatarId}`;
      const response = await api.patch('/users/me', { profilePictureUrl: url });
      dispatch(updateUserProfile(response.data));
      setProfileMessage({ type: 'success', text: 'Profile picture updated!' });
    } catch (err) {
      setProfileMessage({ type: 'error', text: 'Failed to update picture.' });
    }
  };

  if (!user) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}>
      {/* ── Profile Picture Header ── */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={simulatePictureUpload} style={styles.avatarWrap} accessibilityRole="button" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <View style={styles.avatarRing}>
            <Image
              source={{ uri: user.profilePictureUrl || 'https://i.pravatar.cc/300?img=11' }}
              style={styles.avatar}
            />
          </View>
          <View style={styles.editBadge}>
            <Ionicons name="camera" size={14} color={darkColors.text} />
          </View>
        </TouchableOpacity>
        <Text style={styles.profileName} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{user.fullName}</Text>
        <View style={styles.roleRow}>
          <Text style={styles.profileRole} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Role: </Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{user.role}</Text>
          </View>
        </View>
        {user.role === 'MECHANIC' && (
          <View style={styles.verificationRow}>
            <Text style={styles.verificationText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              Workshop Verified: {user.mechanicDetails?.isWorkshopVerified ? 'Yes' : 'Pending Approval'}
            </Text>
          </View>
        )}
      </View>

      {/* ── Profile Alert ── */}
      {profileMessage && (
        <View style={profileMessage.type === 'success' ? styles.alertSuccess : styles.alertError}>
          <Text style={profileMessage.type === 'success' ? styles.successText : styles.alertText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
            {profileMessage.text}
          </Text>
        </View>
      )}

      {/* ── Account Details Card ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="person-outline" size={20} color={colors.danger[500]} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Account Details</Text>
          </View>
          <Button
            label={isEditing ? 'Cancel' : 'Edit'}
            variant={isEditing ? 'ghost' : 'secondary'}
            size="sm"
            onPress={() => { setIsEditing(!isEditing); setProfileMessage(null); }}
            accessibilityHint={isEditing ? 'Cancel profile editing' : 'Edit profile details'}
          />
        </View>

        <Input
          label="Email Address (Read-only)"
          value={user.email}
          onChangeText={() => {}}
          editable={false}
          leftIcon="mail-outline"
        />

        <FormInput
          name="fullName"
          control={profileControl}
          label="Full Name"
          editable={isEditing}
          leftIcon="person-outline"
        />

        <FormInput
          name="phoneNumber"
          control={profileControl}
          label="Phone Number"
          editable={isEditing}
          leftIcon="call-outline"
          keyboardType="phone-pad"
        />

        {/* Dynamic Driver Fields */}
        {user.role === 'DRIVER' && (
          <View>
            <FormInput
              name="cnicNumber"
              control={profileControl}
              label="CNIC Number"
              editable={isEditing}
              placeholder="42101-XXXXXXX-X"
            />

            <FormInput
              name="drivingLicenseNumber"
              control={profileControl}
              label="Driving License Number"
              editable={isEditing}
              placeholder="DL-XXXXXXX"
            />
          </View>
        )}

        {/* Dynamic Mechanic Fields */}
        {user.role === 'MECHANIC' && (
          <View>
            <FormInput
              name="workshopName"
              control={profileControl}
              label="Workshop Name"
              editable={isEditing}
              placeholder="Quick Fix Garage"
            />

            <FormInput
              name="workshopAddress"
              control={profileControl}
              label="Workshop Address"
              editable={isEditing}
              placeholder="Plot 45, Industrial Zone"
            />

            <FormInput
              name="specialization"
              control={profileControl}
              label="Specialization"
              editable={isEditing}
              placeholder="Engine, Electrical, Brake Repair"
            />
          </View>
        )}

        {isEditing && (
          <Button
            label="Save Profile"
            variant="danger"
            size="lg"
            onPress={handleProfileSubmit(onUpdateProfile)}
            loading={isLoading}
            fullWidth
            icon="save-outline"
            accessibilityHint="Save profile changes"
          />
        )}
      </View>

      {/* ── Change Password Card ── */}
      <View style={styles.card}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => { setIsChangingPassword(!isChangingPassword); setPwMessage(null); }} accessibilityRole="button">
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.danger[500]} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Security & Password</Text>
          </View>
          <Ionicons name={isChangingPassword ? 'chevron-up-outline' : 'chevron-down-outline'} size={20} color={darkColors.textTertiary} />
        </TouchableOpacity>

        {isChangingPassword && (
          <View style={styles.pwContainer}>
            {pwMessage && (
              <View style={pwMessage.type === 'success' ? styles.alertSuccess : styles.alertError}>
                <Text style={pwMessage.type === 'success' ? styles.successText : styles.alertText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                  {pwMessage.text}
                </Text>
              </View>
            )}

            <FormInput
              name="currentPassword"
              control={pwControl}
              label="Current Password"
              placeholder="Enter current password"
              secureTextEntry
              autoCapitalize="none"
              leftIcon="lock-closed-outline"
            />

            <FormInput
              name="newPassword"
              control={pwControl}
              label="New Password"
              placeholder="At least 8 chars, 1 num, 1 spec"
              secureTextEntry
              autoCapitalize="none"
              leftIcon="lock-closed-outline"
            />

            <FormInput
              name="confirmNewPassword"
              control={pwControl}
              label="Confirm New Password"
              placeholder="Confirm new password"
              secureTextEntry
              autoCapitalize="none"
              leftIcon="lock-closed-outline"
            />

            <Button
              label="Update Password"
              variant="secondary"
              size="lg"
              onPress={handlePwSubmit(onChangePassword)}
              loading={isPwLoading}
              fullWidth
              icon="refresh-outline"
              accessibilityHint="Submit password change form"
            />
          </View>
        )}
      </View>

      {/* ── Theme Toggle ── */}
      <View style={styles.themeToggleRow}>
        <View style={styles.themeToggleInfo}>
          <Ionicons
            name={theme === 'dark' ? 'moon-outline' : 'sunny-outline'}
            size={20}
            color={colors.danger[500]}
          />
          <View>
            <Text style={styles.themeToggleTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              {theme === 'dark' ? 'Dark Theme' : 'Light Theme'}
            </Text>
            <Text style={styles.themeToggleSubtitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              Tap to switch to {theme === 'dark' ? 'light' : 'dark'} mode
            </Text>
          </View>
        </View>
        <Button
          label="Toggle"
          variant="secondary"
          size="sm"
          onPress={toggleTheme}
          icon={theme === 'dark' ? 'sunny-outline' : 'moon-outline'}
          accessibilityHint="Toggle between dark and light theme"
        />
      </View>

      {/* ── Logout ── */}
      <Button
        label="Log Out"
        variant="ghost"
        size="lg"
        onPress={handleLogout}
        fullWidth
        icon="log-out-outline"
        accessibilityHint="Log out of your account"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 28,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    padding: 3,
    borderWidth: 3,
    borderColor: colors.danger[500],
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    backgroundColor: darkColors.surfaceElevated,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  editBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.info[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: darkColors.background,
  },
  editBadgeText: {
    fontSize: 14,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: darkColors.text,
    marginTop: 16,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  profileRole: {
    fontSize: 14,
    color: darkColors.textSecondary,
  },
  rolePill: {
    backgroundColor: tints.dangerLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleLabel: {
    color: colors.danger[500],
    fontWeight: '700',
    fontSize: 13,
  },
  verificationRow: {
    marginTop: 8,
  },
  verificationText: {
    fontSize: 13,
    color: darkColors.textSecondary,
  },
  card: {
    backgroundColor: tints.glassCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    shadowColor: darkColors.background,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: darkColors.text,
  },
  editBtn: {
    backgroundColor: tints.infoSubtle,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editBtnText: {
    color: colors.info[500],
    fontWeight: '700',
    fontSize: 13,
  },
  cancelBtn: {
    backgroundColor: tints.dangerLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  cancelBtnText: {
    color: colors.danger[500],
    fontWeight: '700',
    fontSize: 13,
  },
  expandIcon: {
    color: darkColors.textTertiary,
    fontSize: 14,
  },
  label: {
    fontSize: 12,
    color: darkColors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
    fontWeight: '600',
  },
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
  inputDisabled: {
    color: darkColors.textTertiary,
    borderColor: tints.whiteSubtle,
  },
  inputError: {
    borderColor: colors.danger[500],
  },
  errorHelper: {
    color: colors.danger[300],
    fontSize: 12,
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: colors.danger[500],
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: darkColors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  pwContainer: {
    marginTop: 10,
  },
  pwSubmitBtn: {
    backgroundColor: tints.infoSubtle,
    borderColor: colors.info[500],
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  pwSubmitBtnText: {
    color: colors.info[500],
    fontSize: 15,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: tints.dangerLight,
    borderColor: tints.dangerMedium,
    borderWidth: 1,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  logoutBtnText: {
    color: colors.danger[500],
    fontSize: 16,
    fontWeight: '700',
  },
  alertError: {
    backgroundColor: tints.dangerErrorBg,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tints.dangerErrorBorder,
    marginBottom: 20,
  },
  alertSuccess: {
    backgroundColor: tints.successSubtle,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tints.successMedium,
    marginBottom: 20,
  },
  alertText: {
    color: colors.danger[300],
    fontSize: 14,
    textAlign: 'center',
  },
  successText: {
    color: colors.success[300],
    fontSize: 14,
    textAlign: 'center',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tints.overlayStrong,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    paddingRight: 14,
  },
  passwordInput: {
    flex: 1,
    color: darkColors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  eyeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  eyeBtnText: {
    fontSize: 16,
  },
  // Theme toggle row styles
  themeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: tints.glassCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
  },
  themeToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  themeToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: darkColors.text,
  },
  themeToggleSubtitle: {
    fontSize: 12,
    color: darkColors.textSecondary,
    marginTop: 2,
  },
});