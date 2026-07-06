import NetInfo from '@react-native-community/netinfo';
import * as SMS from 'expo-sms';

export interface EmergencyContactInfo {
  name: string;
  phoneNumber: string;
}

export interface AccidentAlertData {
  userName: string;
  userPhone: string;
  severity: string;
  latitude: number;
  longitude: number;
}

/**
 * Checks if the device currently has internet connectivity.
 */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable);
}

/**
 * Builds the SMS message body with GPS, severity, and identity info.
 */
function buildEmergencyMessage(data: AccidentAlertData): string {
  const mapsLink = `https://www.google.com/maps?q=${data.latitude},${data.longitude}`;
  return (
    `ResQDrive EMERGENCY ALERT\n` +
    `${data.userName} (${data.userPhone}) may have been in a ${data.severity} accident.\n` +
    `Location: ${mapsLink}\n` +
    `Please respond immediately.`
  );
}

/**
 * Sends the emergency alert via native SMS, bypassing the internet entirely.
 * Used automatically when the device has no internet connectivity.
 */
export async function sendEmergencySMS(
  contacts: EmergencyContactInfo[],
  data: AccidentAlertData,
): Promise<{ success: boolean; result?: string }> {
  const isAvailable = await SMS.isAvailableAsync();
  if (!isAvailable) {
    return { success: false };
  }

  const message = buildEmergencyMessage(data);
  const phoneNumbers = contacts.map((c) => c.phoneNumber);

  const { result } = await SMS.sendSMSAsync(phoneNumbers, message);
  // result is one of: 'sent', 'cancelled', 'unknown' (varies by platform)
  return { success: result === 'sent' || result === 'unknown', result };
}

/**
 * Main entry point: decides whether to use the normal online alert path
 * or fall back to offline SMS, based on current connectivity.
 *
 * onlineDispatchFn: the function that sends the alert via your backend
 * (push/email/SMS-gateway) when internet IS available — pass this in
 * from wherever the real alert dispatch logic lives (e.g. Module 6.7/6.8).
 */
export async function dispatchEmergencyAlert(
  contacts: EmergencyContactInfo[],
  data: AccidentAlertData,
  onlineDispatchFn: () => Promise<void>,
): Promise<{ mode: 'online' | 'offline-sms' | 'failed' }> {
  const online = await isOnline();

  if (online) {
    try {
      await onlineDispatchFn();
      return { mode: 'online' };
    } catch (err) {
      // Online path failed mid-way (e.g. backend unreachable despite having internet) — fall back to SMS
      const smsResult = await sendEmergencySMS(contacts, data);
      return { mode: smsResult.success ? 'offline-sms' : 'failed' };
    }
  } else {
    const smsResult = await sendEmergencySMS(contacts, data);
    return { mode: smsResult.success ? 'offline-sms' : 'failed' };
  }
}

/**
 * Sets up a listener that fires a callback whenever connectivity changes.
 * Useful for showing a banner like "You're offline — SMS fallback active"
 */
export function subscribeToConnectivityChanges(
  callback: (isOnline: boolean) => void,
): () => void {
  const unsubscribe = NetInfo.addEventListener((state) => {
    callback(Boolean(state.isConnected && state.isInternetReachable));
  });
  return unsubscribe;
}