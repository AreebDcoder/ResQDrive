import { Alert, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import api from '../api/axios';

let messaging: any = null;
const isNativeFirebaseLinked = !!NativeModules.RNFBMessagingModule;

if (isNativeFirebaseLinked) {
  try {
    messaging = require('@react-native-firebase/messaging').default;
  } catch (e) {
    console.warn('Firebase messaging module could not be loaded. Operating in fallback mock mode.');
  }
}

export class FCMService {
  /**
   * Request permission for push notifications.
   * Handles Android 13+ runtime permissions explicitly.
   */
  static async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const hasPermission = await PermissionsAndroid.check(
          'android.permission.POST_NOTIFICATIONS'
        );
        if (!hasPermission) {
          const status = await PermissionsAndroid.request(
            'android.permission.POST_NOTIFICATIONS'
          );
          return status === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
      }

      if (messaging && isNativeFirebaseLinked) {
        try {
          const authStatus = await messaging().requestPermission();
          const enabled =
            authStatus === 1 || // Authorized
            authStatus === 2; // Provisional
          return enabled;
        } catch (e) {
          console.warn('Failed to call native requestPermission:', e);
        }
      }

      return true; // Mock mode defaults to true
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetches the device token and registers it on the NestJS backend database.
   */
  static async registerDeviceWithBackend(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return null;
      }

      let fcmToken = null;

      if (messaging && isNativeFirebaseLinked) {
        try {
          fcmToken = await messaging().getToken();
        } catch (e: any) {
          console.warn('Native FCM token retrieval failed:', e?.message ?? e);
          console.warn('FCM error stack:', e?.stack ?? 'no stack');
        }
      }

      if (!fcmToken) {
        fcmToken = 'mock-fcm-token-' + Platform.OS + '-' + Math.random().toString(36).substring(7);
      }

      if (fcmToken) {
        await api.post('/notifications/register-device', {
          fcmToken,
          platform: Platform.OS,
        });
        return fcmToken;
      }
      return null;
    } catch (error: any) {
      return null;
    }
  }

  /**
   * De-registers device token from backend (called on user logout)
   */
  static async unregisterDeviceWithBackend(): Promise<void> {
    try {
      let fcmToken = null;
      if (messaging && isNativeFirebaseLinked) {
        try {
          fcmToken = await messaging().getToken();
        } catch (e) {
          console.warn('Native FCM token retrieval failed on logout.');
        }
      }

      if (fcmToken) {
        await api.delete('/notifications/register-device', {
          data: { fcmToken },
        });
      }
    } catch (error) {
    }
  }

  /**
   * Sets up listeners to handle pushes in the foreground.
   */
  static setupFCMListeners(onNotificationReceived?: (message: any) => void) {
    if (!messaging || !isNativeFirebaseLinked) {
      return () => {};
    }

    try {
      const unsubscribeMessage = messaging().onMessage(async (remoteMessage: any) => {

        if (onNotificationReceived) {
          onNotificationReceived(remoteMessage);
        }

        if (remoteMessage.notification) {
        }
      });

      const unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken: string) => {
        try {
          await api.post('/notifications/register-device', {
            fcmToken: newToken,
            platform: Platform.OS,
          });
        } catch (err) {
        }
      });

      return () => {
        unsubscribeMessage();
        unsubscribeTokenRefresh();
      };
    } catch (error) {
      console.warn('Failed to setup native FCM listeners:', error);
      return () => {};
    }
  }
}
