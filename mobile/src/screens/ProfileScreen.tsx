// ═══════════════════════════════════════════════════════════════
// ResQDrive v2 — PROFILE SCREEN (Modernized)
// All imports, logic, state, handlers preserved identically.
// Only JSX structure + StyleSheet updated: dark glassmorphism theme.
// ═══════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { getItemAsync, deleteItemAsync } from '../utils/secureStorage';
import { RootState } from '../store/store';
import { updateUserProfile, logoutAction } from '../store/slices/authSlice';
import { updateProfileSchema, changePasswordSchema, UpdateProfileInput, ChangePasswordInput } from '../schemas/validation';
import { FCMService } from '../services/fcmService';
import api from '../api/axios';

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPwLoading, setIsPwLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

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
      console.log('Logout API call failed:', err);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* ── Profile Picture Header ── */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={simulatePictureUpload} style={styles.avatarWrap}>
          <View style={styles.avatarRing}>
            <Image
              source={{ uri: user.profilePictureUrl || 'https://i.pravatar.cc/300?img=11' }}
              style={styles.avatar}
            />
          </View>
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>📷</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.profileName}>{user.fullName}</Text>
        <View style={styles.roleRow}>
          <Text style={styles.profileRole}>Role: </Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleLabel}>{user.role}</Text>
          </View>
        </View>
        {user.role === 'MECHANIC' && (
          <View style={styles.verificationRow}>
            <Text style={styles.verificationText}>
              Workshop Verified: {user.mechanicDetails?.isWorkshopVerified ? '✅ Yes' : '⏳ Pending Approval'}
            </Text>
          </View>
        )}
      </View>

      {/* ── Profile Alert ── */}
      {profileMessage && (
        <View style={profileMessage.type === 'success' ? styles.alertSuccess : styles.alertError}>
          <Text style={profileMessage.type === 'success' ? styles.successText : styles.alertText}>
            {profileMessage.text}
          </Text>
        </View>
      )}

      {/* ── Account Details Card ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>👤 Account Details</Text>
          <TouchableOpacity onPress={() => { setIsEditing(!isEditing); setProfileMessage(null); }}>
            <View style={isEditing ? styles.cancelBtn : styles.editBtn}>
              <Text style={isEditing ? styles.cancelBtnText : styles.editBtnText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>📧 Email Address (Read-only)</Text>
        <TextInput style={[styles.input, styles.inputDisabled]} value={user.email} editable={false} />

        <Text style={styles.label}>🏷️ Full Name</Text>
        <Controller
          control={profileControl}
          name="fullName"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled, profileErrors.fullName && styles.inputError]}
              editable={isEditing}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {profileErrors.fullName && <Text style={styles.errorHelper}>{profileErrors.fullName.message}</Text>}

        <Text style={styles.label}>📱 Phone Number</Text>
        <Controller
          control={profileControl}
          name="phoneNumber"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled, profileErrors.phoneNumber && styles.inputError]}
              editable={isEditing}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {profileErrors.phoneNumber && <Text style={styles.errorHelper}>{profileErrors.phoneNumber.message}</Text>}

        {/* Dynamic Driver Fields */}
        {user.role === 'DRIVER' && (
          <View>
            <Text style={styles.label}>🪪 CNIC Number</Text>
            <Controller
              control={profileControl}
              name="cnicNumber"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled, profileErrors.cnicNumber && styles.inputError]}
                  editable={isEditing}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {profileErrors.cnicNumber && <Text style={styles.errorHelper}>{profileErrors.cnicNumber.message}</Text>}

            <Text style={styles.label}>🪪 Driving License Number</Text>
            <Controller
              control={profileControl}
              name="drivingLicenseNumber"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled, profileErrors.drivingLicenseNumber && styles.inputError]}
                  editable={isEditing}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {profileErrors.drivingLicenseNumber && (
              <Text style={styles.errorHelper}>{profileErrors.drivingLicenseNumber.message}</Text>
            )}
          </View>
        )}

        {/* Dynamic Mechanic Fields */}
        {user.role === 'MECHANIC' && (
          <View>
            <Text style={styles.label}>🔧 Workshop Name</Text>
            <Controller
              control={profileControl}
              name="workshopName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled, profileErrors.workshopName && styles.inputError]}
                  editable={isEditing}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {profileErrors.workshopName && <Text style={styles.errorHelper}>{profileErrors.workshopName.message}</Text>}

            <Text style={styles.label}>📍 Workshop Address</Text>
            <Controller
              control={profileControl}
              name="workshopAddress"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled, profileErrors.workshopAddress && styles.inputError]}
                  editable={isEditing}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {profileErrors.workshopAddress && (
              <Text style={styles.errorHelper}>{profileErrors.workshopAddress.message}</Text>
            )}

            <Text style={styles.label}>🛠️ Specialization</Text>
            <Controller
              control={profileControl}
              name="specialization"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled, profileErrors.specialization && styles.inputError]}
                  editable={isEditing}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {profileErrors.specialization && (
              <Text style={styles.errorHelper}>{profileErrors.specialization.message}</Text>
            )}
          </View>
        )}

        {isEditing && (
          <TouchableOpacity style={styles.saveBtn} onPress={handleProfileSubmit(onUpdateProfile)} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>💾 Save Profile</Text>}
          </TouchableOpacity>
        )}
      </View>

      {/* ── Change Password Card ── */}
      <View style={styles.card}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => { setIsChangingPassword(!isChangingPassword); setPwMessage(null); }}>
          <Text style={styles.cardTitle}>🔒 Security & Password</Text>
          <Text style={styles.expandIcon}>{isChangingPassword ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {isChangingPassword && (
          <View style={styles.pwContainer}>
            {pwMessage && (
              <View style={pwMessage.type === 'success' ? styles.alertSuccess : styles.alertError}>
                <Text style={pwMessage.type === 'success' ? styles.successText : styles.alertText}>
                  {pwMessage.text}
                </Text>
              </View>
            )}

            <Text style={styles.label}>🔑 Current Password</Text>
            <Controller
              control={pwControl}
              name="currentPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.passwordContainer, pwErrors.currentPassword && styles.inputError]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter current password"
                    placeholderTextColor="#6B6B80"
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    <Text style={styles.eyeBtnText}>{showCurrentPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            {pwErrors.currentPassword && <Text style={styles.errorHelper}>{pwErrors.currentPassword.message}</Text>}

            <Text style={styles.label}>🔑 New Password</Text>
            <Controller
              control={pwControl}
              name="newPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.passwordContainer, pwErrors.newPassword && styles.inputError]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="At least 8 chars, 1 num, 1 spec"
                    placeholderTextColor="#6B6B80"
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNewPassword(!showNewPassword)}>
                    <Text style={styles.eyeBtnText}>{showNewPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            {pwErrors.newPassword && <Text style={styles.errorHelper}>{pwErrors.newPassword.message}</Text>}

            <Text style={styles.label}>🔑 Confirm New Password</Text>
            <Controller
              control={pwControl}
              name="confirmNewPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.passwordContainer, pwErrors.confirmNewPassword && styles.inputError]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm new password"
                    placeholderTextColor="#6B6B80"
                    secureTextEntry={!showConfirmNewPassword}
                    autoCapitalize="none"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  >
                    <Text style={styles.eyeBtnText}>{showConfirmNewPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            {pwErrors.confirmNewPassword && (
              <Text style={styles.errorHelper}>{pwErrors.confirmNewPassword.message}</Text>
            )}

            <TouchableOpacity style={styles.pwSubmitBtn} onPress={handlePwSubmit(onChangePassword)} disabled={isPwLoading}>
              {isPwLoading ? <ActivityIndicator color="#E53935" /> : <Text style={styles.pwSubmitBtnText}>🔄 Update Password</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Logout ── */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>🚪 Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
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
    borderColor: '#E53935',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    backgroundColor: '#1C1C2E',
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
    backgroundColor: '#2979FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0A0A0F',
  },
  editBadgeText: {
    fontSize: 14,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  profileRole: {
    fontSize: 14,
    color: '#A0A0B8',
  },
  rolePill: {
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleLabel: {
    color: '#E53935',
    fontWeight: '700',
    fontSize: 13,
  },
  verificationRow: {
    marginTop: 8,
  },
  verificationText: {
    fontSize: 13,
    color: '#A0A0B8',
  },
  card: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000',
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
    color: '#FFFFFF',
  },
  editBtn: {
    backgroundColor: 'rgba(41, 121, 255, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editBtnText: {
    color: '#2979FF',
    fontWeight: '700',
    fontSize: 13,
  },
  cancelBtn: {
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  cancelBtnText: {
    color: '#E53935',
    fontWeight: '700',
    fontSize: 13,
  },
  expandIcon: {
    color: '#6B6B80',
    fontSize: 14,
  },
  label: {
    fontSize: 12,
    color: '#A0A0B8',
    marginBottom: 6,
    marginTop: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(10, 10, 15, 0.6)',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  inputDisabled: {
    color: '#6B6B80',
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  inputError: {
    borderColor: '#E53935',
  },
  errorHelper: {
    color: '#FF8A80',
    fontSize: 12,
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: '#E53935',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pwContainer: {
    marginTop: 10,
  },
  pwSubmitBtn: {
    backgroundColor: 'rgba(41, 121, 255, 0.1)',
    borderColor: '#2979FF',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  pwSubmitBtnText: {
    color: '#2979FF',
    fontSize: 15,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: 'rgba(229, 57, 53, 0.12)',
    borderColor: 'rgba(229, 57, 53, 0.3)',
    borderWidth: 1,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  logoutBtnText: {
    color: '#E53935',
    fontSize: 16,
    fontWeight: '700',
  },
  alertError: {
    backgroundColor: 'rgba(255, 23, 68, 0.12)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.3)',
    marginBottom: 20,
  },
  alertSuccess: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    marginBottom: 20,
  },
  alertText: {
    color: '#FF8A80',
    fontSize: 14,
    textAlign: 'center',
  },
  successText: {
    color: '#69F0AE',
    fontSize: 14,
    textAlign: 'center',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 15, 0.6)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingRight: 14,
  },
  passwordInput: {
    flex: 1,
    color: '#FFFFFF',
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
});