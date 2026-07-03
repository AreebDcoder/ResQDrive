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
import * as SecureStore from 'expo-secure-store';
import { RootState } from '../store/store';
import { updateUserProfile, logoutAction } from '../store/slices/authSlice';
import { updateProfileSchema, changePasswordSchema, UpdateProfileInput, ChangePasswordInput } from '../schemas/validation';
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
      const token = await SecureStore.getItemAsync('refreshToken');
      if (token) {
        await api.post('/auth/logout', { refreshToken: token });
      }
    } catch (err) {
      console.log('Logout API call failed:', err);
    } finally {
      await SecureStore.deleteItemAsync('refreshToken');
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
      {/* Profile Picture Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={simulatePictureUpload}>
          <Image
            source={{ uri: user.profilePictureUrl || 'https://i.pravatar.cc/300?img=11' }}
            style={styles.avatar}
          />
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>Camera</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.profileName}>{user.fullName}</Text>
        <Text style={styles.profileRole}>Role: <Text style={styles.roleLabel}>{user.role}</Text></Text>
        {user.role === 'MECHANIC' && (
          <Text style={styles.verificationText}>
            Workshop Verified: {user.mechanicDetails?.isWorkshopVerified ? '✅ Yes' : '⏳ Pending Approval'}
          </Text>
        )}
      </View>

      {profileMessage && (
        <View style={profileMessage.type === 'success' ? styles.alertSuccess : styles.alertError}>
          <Text style={profileMessage.type === 'success' ? styles.successText : styles.alertText}>
            {profileMessage.text}
          </Text>
        </View>
      )}

      {/* Profile Details Form */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Account Details</Text>
          <TouchableOpacity onPress={() => { setIsEditing(!isEditing); setProfileMessage(null); }}>
            <Text style={styles.editToggleBtn}>{isEditing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Email Address (Read-only)</Text>
        <TextInput style={[styles.input, styles.inputDisabled]} value={user.email} editable={false} />

        <Text style={styles.label}>Full Name</Text>
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

        <Text style={styles.label}>Phone Number</Text>
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
            <Text style={styles.label}>CNIC Number</Text>
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

            <Text style={styles.label}>Driving License Number</Text>
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
            <Text style={styles.label}>Workshop Name</Text>
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

            <Text style={styles.label}>Workshop Address</Text>
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

            <Text style={styles.label}>Specialization</Text>
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
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Profile</Text>}
          </TouchableOpacity>
        )}
      </View>

      {/* Change Password Card */}
      <View style={styles.card}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => { setIsChangingPassword(!isChangingPassword); setPwMessage(null); }}>
          <Text style={styles.cardTitle}>Security & Password</Text>
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

            <Text style={styles.label}>Current Password</Text>
            <Controller
              control={pwControl}
              name="currentPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.passwordContainer, pwErrors.currentPassword && styles.inputError]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter current password"
                    placeholderTextColor="#666"
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
                    <Text style={styles.eyeBtnText}>{showCurrentPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            {pwErrors.currentPassword && <Text style={styles.errorHelper}>{pwErrors.currentPassword.message}</Text>}

            <Text style={styles.label}>New Password</Text>
            <Controller
              control={pwControl}
              name="newPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.passwordContainer, pwErrors.newPassword && styles.inputError]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="At least 8 chars, 1 num, 1 spec"
                    placeholderTextColor="#666"
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNewPassword(!showNewPassword)}>
                    <Text style={styles.eyeBtnText}>{showNewPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            {pwErrors.newPassword && <Text style={styles.errorHelper}>{pwErrors.newPassword.message}</Text>}

            <Text style={styles.label}>Confirm New Password</Text>
            <Controller
              control={pwControl}
              name="confirmNewPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.passwordContainer, pwErrors.confirmNewPassword && styles.inputError]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm new password"
                    placeholderTextColor="#666"
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
                    <Text style={styles.eyeBtnText}>{showConfirmNewPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            {pwErrors.confirmNewPassword && (
              <Text style={styles.errorHelper}>{pwErrors.confirmNewPassword.message}</Text>
            )}

            <TouchableOpacity style={styles.pwSubmitBtn} onPress={handlePwSubmit(onChangePassword)} disabled={isPwLoading}>
              {isPwLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.pwSubmitBtnText}>Update Password</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Logout button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginVertical: 24,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#d32f2f',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#d32f2f',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 14,
  },
  profileRole: {
    fontSize: 14,
    color: '#888888',
    marginTop: 6,
  },
  roleLabel: {
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  verificationText: {
    fontSize: 13,
    color: '#cccccc',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  editToggleBtn: {
    color: '#d32f2f',
    fontWeight: 'bold',
    fontSize: 14,
  },
  expandIcon: {
    color: '#888888',
    fontSize: 14,
  },
  label: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 6,
    marginTop: 10,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#161616',
    color: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#262626',
  },
  inputDisabled: {
    color: '#888888',
    borderColor: '#222222',
  },
  inputError: {
    borderColor: '#d32f2f',
  },
  errorHelper: {
    color: '#ff8a80',
    fontSize: 12,
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: '#d32f2f',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  pwContainer: {
    marginTop: 10,
  },
  pwSubmitBtn: {
    backgroundColor: '#121212',
    borderColor: '#d32f2f',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  pwSubmitBtnText: {
    color: '#d32f2f',
    fontSize: 15,
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: '#d32f2f',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertError: {
    backgroundColor: '#3a1313',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d32f2f',
    marginBottom: 20,
  },
  alertSuccess: {
    backgroundColor: '#133513',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#388e3c',
    marginBottom: 20,
  },
  alertText: {
    color: '#ff8a80',
    fontSize: 14,
    textAlign: 'center',
  },
  successText: {
    color: '#a5d6a7',
    fontSize: 14,
    textAlign: 'center',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    paddingRight: 14,
  },
  passwordInput: {
    flex: 1,
    color: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  eyeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  eyeBtnText: {
    color: '#d32f2f',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
