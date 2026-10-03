import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthStack from './AuthStack';
import AppStack from './AppStack';

/**
 * Deep linking configuration — enables the app to open from URLs.
 *
 * Supported prefixes:
 *   - resqdrive:// (custom scheme)
 *   - https://resqdrive.com (universal links — requires Apple App Site
 *     Association + Android assetlinks.json on the domain)
 *
 * Supported routes:
 *   - resqdrive://incident/{id} → IncidentDetail screen
 *   - resqdrive://sos/{sessionId} → SOS screen
 *   - resqdrive://share/{token} → LocationSharing screen
 */
const linking = {
  prefixes: ['resqdrive://', 'https://resqdrive.com'],
  config: {
    screens: {
      // Auth screens
      Login: 'login',
      Register: 'register',
      // App screens
      Home: 'home',
      IncidentDetail: 'incident/:id',
      SOS: 'sos/:sessionId',
      LocationSharing: 'share/:token',
      IncidentsList: 'incidents',
      EmergencyContacts: 'contacts',
      MyVehicles: 'vehicles',
      Profile: 'profile',
    },
  },
};

/**
 * RootNavigator — thin wrapper that switches between AuthStack and AppStack
 * based on auth state.
 */
export default function Navigation() {
  const { isAuthenticated, isLoading, user } = useSelector((state: RootState) => state.auth);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('hasSeenOnboarding').then((val) => {
      setHasSeenOnboarding(val === 'true');
    }).catch(() => setHasSeenOnboarding(true));
  }, []);

  if (isLoading || hasSeenOnboarding === null) {
    return <SplashScreen />;
  }

  if (!hasSeenOnboarding) {
    return <OnboardingScreen onComplete={() => setHasSeenOnboarding(true)} />;
  }

  return (
    <NavigationContainer linking={linking as any}>
      {isAuthenticated && user ? <AppStack role={user.role} /> : <AuthStack />}
    </NavigationContainer>
  );
}
