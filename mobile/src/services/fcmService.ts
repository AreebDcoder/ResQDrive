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
      console.log('Permission request failed:', error);
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
        console.log('Notification permission not granted. Device registration skipped.');
        return null;
      }

      let fcmToken = null;

      if (messaging && isNativeFirebaseLinked) {
        try {
          fcmToken = await messaging().getToken();
        } catch (e) {
          console.warn('Native FCM token retrieval failed. Falling back to mock token.');
        }
      }

      if (!fcmToken) {
        fcmToken = 'mock-fcm-token-' + Platform.OS + '-' + Math.random().toString(36).substring(7);
        console.log('Using mock FCM device token for registration:', fcmToken);
      }

      if (fcmToken) {
        await api.post('/notifications/register-device', {
          fcmToken,
          platform: Platform.OS,
        });
        console.log('FCM Device Token registered successfully:', fcmToken);
        return fcmToken;
      }
      return null;
    } catch (error: any) {
      console.log('FCM token registration failed:', error.message);
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
        console.log('FCM Device Token removed from backend.');
      }
    } catch (error) {
      console.log('Failed to unregister FCM token:', error);
    }
  }

  /**
   * Sets up listeners to handle pushes in the foreground.
   */
  static setupFCMListeners(onNotificationReceived?: (message: any) => void) {
    if (!messaging || !isNativeFirebaseLinked) {
      console.log('FCM listeners skipped (messaging module not natively linked).');
      return () => {};
    }

    try {
      const unsubscribeMessage = messaging().onMessage(async (remoteMessage: any) => {
        console.log('Foreground Message received:', remoteMessage);

        if (onNotificationReceived) {
          onNotificationReceived(remoteMessage);
        }

        if (remoteMessage.notification) {
          Alert.alert(
            remoteMessage.notification.title || 'Notification',
            remoteMessage.notification.body || ''
          );
        }
      });

      const unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken: string) => {
        try {
          await api.post('/notifications/register-device', {
            fcmToken: newToken,
            platform: Platform.OS,
          });
          console.log('FCM Device Token refreshed & updated on backend.');
        } catch (err) {
          console.log('Failed to sync refreshed FCM token:', err);
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
