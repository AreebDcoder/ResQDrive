import { PermissionsAndroid, Platform, Linking, Alert } from 'react-native';

let RNImmediatePhoneCall: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const module = require('react-native-immediate-phone-call');
  RNImmediatePhoneCall = module?.default || module;
} catch (_) {
  // Graceful fallback for environments without immediate phone call binary
}

export function isAutoDialable(phoneNumber: string): boolean {
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  return cleanNumber.length >= 5;
}

export async function makeDirectPhoneCall(phoneNumber: string): Promise<boolean> {
  if (!phoneNumber) return false;

  const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');

  if (!isAutoDialable(cleanNumber)) {
    console.log(`[DirectCall] Number ${cleanNumber} is too short for auto-dial (4-digit shortcode). Opening dialer.`);
    Linking.openURL(`tel:${cleanNumber}`);
    return false;
  }

  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
        {
          title: 'ResQDrive Emergency Auto-Call',
          message: 'ResQDrive needs direct call permission to automatically call your emergency contacts during an accident. No button press needed.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED && RNImmediatePhoneCall?.immediatePhoneCall) {
        console.log(`[DirectCall] Auto-dialing: ${cleanNumber} (no dialer popup)`);
        RNImmediatePhoneCall.immediatePhoneCall(cleanNumber);
        return true;
      } else {
        console.log('[DirectCall] CALL_PHONE denied or module not available. Falling back to dialer.');
        Linking.openURL(`tel:${cleanNumber}`);
        return false;
      }
    } catch (err) {
      console.warn('[DirectCall] Error, falling back to dialer:', err);
      Linking.openURL(`tel:${cleanNumber}`);
      return false;
    }
  }

  Linking.openURL(`tel:${cleanNumber}`);
  return false;
}