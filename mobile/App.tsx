// @react-native-firebase auto-initializes natively from google-services.json.
// No manual firebase.initializeApp() is needed or wanted here.
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider, useSelector } from 'react-redux';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import { Platform, PermissionsAndroid, View } from 'react-native';

import { store, RootState } from './src/store/store';
import Navigation from './src/navigation';
import NotificationBanner from './src/components/NotificationBanner';
import OfflineBanner from './src/components/OfflineBanner';
import { DrivingNotificationService } from './src/services/drivingNotificationService';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { useTheme } from './src/theme/useTheme';
import { ToastProvider } from './src/components/ui/Toast';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Create Android notification channel (required for Android 8+)
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('emergency-alerts', {
    name: 'Emergency Alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF0000',
    sound: 'default',
    enableLights: true,
    enableVibrate: true,
    showBadge: true,
  });
}

// Root-level component that manages persistent Driving Mode notification across all screens
function DrivingModeNotificationTracker() {
  const drivingModeEnabled = useSelector(
    (state: RootState) => state.notifications.preferences?.drivingModeEnabled
  );

  useEffect(() => {
    if (drivingModeEnabled) {
      DrivingNotificationService.startNotification();
    } else {
      DrivingNotificationService.stopNotification();
    }
  }, [drivingModeEnabled]);

  return null;
}

// StatusBar that respects theme
function ThemedStatusBar() {
  const { theme } = useTheme();
  return <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />;
}

// Global container that prevents Android navigation buttons (◁ ○ □) from overlapping app controls
function SafeAppContainer({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingBottom: insets.bottom, backgroundColor: '#0A0A0F' }}>
      {children}
    </View>
  );
}

const GHRootView = GestureHandlerRootView as any;

export default function App() {
  return (
    <GHRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <Provider store={store}>
          <ThemeProvider>
            <ToastProvider>
              <SafeAreaProvider>
                <SafeAppContainer>
                  <OfflineBanner />
                  <DrivingModeNotificationTracker />
                  <Navigation />
                  <NotificationBanner />
                  <ThemedStatusBar />
                </SafeAppContainer>
              </SafeAreaProvider>
            </ToastProvider>
          </ThemeProvider>
        </Provider>
      </ErrorBoundary>
    </GHRootView>
  );
}
