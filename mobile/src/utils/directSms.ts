import { PermissionsAndroid, Platform, Linking } from 'react-native';

export async function sendDirectBackgroundSMS(
  phoneNumber: string,
  message: string
): Promise<boolean> {
  if (!phoneNumber || !message) return false;

  const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');

  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
        {
          title: 'ResQDrive Emergency SMS',
          message: 'ResQDrive needs SMS permission to automatically notify your emergency contacts during an accident. SMS is sent silently in the background.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        const DirectSms = require('react-native-direct-sms').default;
        await DirectSms.sendDirectSms(cleanNumber, message);
        console.log(`[Auto-SMS] Background SMS sent to ${cleanNumber}`);
        return true;
      } else {
        console.warn('[Auto-SMS] SEND_SMS permission denied');
        return false;
      }
    } catch (error) {
      console.error('[Auto-SMS] Failed to send background SMS:', error);
      return false;
    }
  }

  return false;
}

export async function sendBulkBackgroundSMS(
  contacts: Array<{ name: string; phoneNumber: string }>,
  message: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    if (!contact.phoneNumber) {
      failed++;
      continue;
    }
    const success = await sendDirectBackgroundSMS(contact.phoneNumber, message);
    if (success) {
      sent++;
    } else {
      failed++;
    }
  }

  console.log(`[Auto-SMS] Bulk SMS: ${sent} sent, ${failed} failed out of ${contacts.length}`);
  return { sent, failed };
}