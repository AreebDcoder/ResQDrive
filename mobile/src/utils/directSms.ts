import { PermissionsAndroid, Platform, NativeModules } from 'react-native';

let DirectSmsModule: any = null;
try {
  const mod = require('react-native-direct-sms');
  DirectSmsModule = mod?.default || mod?.DirectSms || mod || NativeModules.DirectSms;
} catch (e) {
  DirectSmsModule = NativeModules.DirectSms || null;
}

/**
 * Strips high-plane Unicode/emojis to keep SMS in standard 7-bit GSM encoding (160 chars per segment)
 * instead of UCS-2 (which cuts maximum length to 70 chars).
 */
function sanitizeForSms(text: string): string {
  return text
    .replace(/🚨/g, '[EMERGENCY]')
    .replace(/🛡️/g, '[ResQDrive]')
    .replace(/⚠️/g, '[ALERT]')
    .replace(/[^\x20-\x7E\n\r]/g, '') // Keep standard printable ASCII + newlines
    .trim();
}

/**
 * Splits a long text into chunks of <= maxChunkSize at newline or whitespace boundaries.
 */
function splitIntoSmsChunks(text: string, maxChunkSize: number = 140): string[] {
  const clean = sanitizeForSms(text);
  if (clean.length <= maxChunkSize) {
    return [clean];
  }

  const chunks: string[] = [];
  const lines = clean.split('\n').filter(l => l.trim().length > 0);
  let currentChunk = '';

  for (const line of lines) {
    if ((currentChunk + (currentChunk ? '\n' : '') + line).length <= maxChunkSize) {
      currentChunk += (currentChunk ? '\n' : '') + line;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      if (line.length <= maxChunkSize) {
        currentChunk = line;
      } else {
        // Line is longer than maxChunkSize, slice it
        let remaining = line;
        while (remaining.length > maxChunkSize) {
          chunks.push(remaining.substring(0, maxChunkSize));
          remaining = remaining.substring(maxChunkSize);
        }
        currentChunk = remaining;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [clean.substring(0, maxChunkSize)];
}

export async function sendDirectBackgroundSMS(
  phoneNumber: string,
  message: string
): Promise<boolean> {
  if (!phoneNumber || !message) return false;

  const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
  if (!cleanNumber) return false;

  if (Platform.OS === 'android') {
    try {
      const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SEND_SMS);
      let granted = hasPermission ? PermissionsAndroid.RESULTS.GRANTED : null;

      if (!hasPermission) {
        granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.SEND_SMS,
          {
            title: 'ResQDrive Emergency SMS',
            message:
              'ResQDrive needs SMS permission to automatically notify your emergency contacts during an accident silently from your SIM.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
      }

      if (granted === PermissionsAndroid.RESULTS.GRANTED || hasPermission) {
        const DirectSms =
          DirectSmsModule ||
          require('react-native-direct-sms').default ||
          (NativeModules as any).DirectSms;

        if (DirectSms && typeof DirectSms.sendDirectSms === 'function') {
          const chunks = splitIntoSmsChunks(message, 140);

          console.log(
            `[Auto-SMS] Dispatching ${chunks.length} SMS chunk(s) to ${cleanNumber}...`
          );

          for (let i = 0; i < chunks.length; i++) {
            await DirectSms.sendDirectSms(cleanNumber, chunks[i]);

            console.log(
              `[Auto-SMS] Chunk ${i + 1}/${chunks.length} sent to ${cleanNumber}: "${chunks[i]}"`
            );

            if (i < chunks.length - 1) {
              // 350ms delay between parts to let baseband modem serialize SMS frames
              await new Promise((r) => setTimeout(r, 350));
            }
          }

          return true;
        } else {
          console.warn(
            '[Auto-SMS] DirectSms native module not available or sendDirectSms missing'
          );
          return false;
        }
      } else {
        console.warn('[Auto-SMS] SEND_SMS permission denied by user');
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
    // Small pause between contacts
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(`[Auto-SMS] Bulk SMS complete: ${sent} sent, ${failed} failed out of ${contacts.length}`);

  return { sent, failed };
}