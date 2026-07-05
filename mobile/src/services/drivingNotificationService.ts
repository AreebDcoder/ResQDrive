import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const DRIVING_NOTIFICATION_ID = 'driving-mode-persistent-alert';

export class DrivingNotificationService {
  /**
   * Request permissions to show local notifications.
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        return newStatus === 'granted';
      }
      return true;
    } catch (e) {
      console.log('Failed to request notifications permission:', e);
      return false;
    }
  }

  /**
   * Starts a persistent, low-priority local notification representing "Driving Mode Active".
   * On Android: configures a non-dismissible (ongoing/sticky) status bar card.
   * On iOS: schedules a standard local notification with badge update.
   */
  static async startNotification(): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return;

      // Ensure no duplicate notifications are scheduled
      await this.stopNotification();

      // Configure a custom notification channel for Android (low priority, silent)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('driving-mode-channel', {
          name: 'Driving Mode Tracking',
          importance: Notifications.AndroidImportance.LOW,
          sound: undefined,
          vibrationPattern: undefined,
          enableLights: false,
        });
      }

      await Notifications.scheduleNotificationAsync({
        identifier: DRIVING_NOTIFICATION_ID,
        content: {
          title: '🛡️ Driving Mode Active',
          body: 'ResQDrive crash sensor tracking is running in the background.',
          sound: false,
          sticky: true,
          color: '#d32f2f',
        },
        trigger: null,
      });

      console.log('Driving mode persistent notification scheduled successfully.');
    } catch (error) {
      console.log('Failed to start driving mode notification:', error);
    }
  }

  /**
   * Cancels/dismisses the persistent driving mode notification.
   */
  static async stopNotification(): Promise<void> {
    try {
      await Notifications.dismissNotificationAsync(DRIVING_NOTIFICATION_ID);
      console.log('Driving mode persistent notification dismissed.');
    } catch (error) {
      console.log('Failed to dismiss driving mode notification:', error);
    }
  }
}
