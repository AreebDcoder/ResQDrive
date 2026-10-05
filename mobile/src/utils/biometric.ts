/**
 * biometric.ts — Biometric authentication utility.
 *
 * Wraps expo-local-authentication for FaceID/TouchID/fingerprint.
 * Falls back gracefully when biometric is not available.
 *
 * Usage:
 *   import { authenticateBiometric } from '../utils/biometric';
 *   const authenticated = await authenticateBiometric('Confirm SOS dispatch');
 *   if (authenticated) { // proceed with SOS }
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export interface BiometricResult {
  success: boolean;
  reason?: string;
}

/**
 * Check if the device supports biometric authentication.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

/**
 * Prompt for biometric authentication (FaceID/TouchID/fingerprint).
 * Returns true if authenticated, false otherwise.
 *
 * @param reason — the message shown in the biometric prompt
 */
export async function authenticateBiometric(reason: string = 'Authenticate to continue'): Promise<BiometricResult> {
  if (Platform.OS === 'web') {
    return { success: true, reason: 'Biometric not available on web — skipping' };
  }

  const available = await isBiometricAvailable();
  if (!available) {
    return { success: false, reason: 'Biometric not available or not enrolled' };
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Use Passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    } else {
      return { success: false, reason: 'Authentication cancelled or failed' };
    }
  } catch (error: any) {
    return { success: false, reason: error?.message || 'Authentication error' };
  }
}

/**
 * Get the type of biometric available (for showing the right icon).
 */
export async function getBiometricType(): Promise<'fingerprint' | 'facial' | 'iris' | 'none'> {
  if (Platform.OS === 'web') return 'none';
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'facial';
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris';
    return 'none';
  } catch {
    return 'none';
  }
}
