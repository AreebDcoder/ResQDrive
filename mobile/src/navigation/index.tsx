import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import SplashScreen from '../screens/SplashScreen';
import AuthStack from './AuthStack';
import AppStack from './AppStack';

/**
 * RootNavigator — thin wrapper that switches between AuthStack and AppStack
 * based on auth state.
 *
 * Previously this file was 1,205 LOC containing DriverHome + MechanicHome +
 * AdminHome + AuthStack + AppStack + all styles + all imports.
 * After Batch 4 refactoring:
 *   - DriverHome → src/screens/home/DriverHome.tsx (850 LOC)
 *   - MechanicHome → src/screens/home/MechanicHome.tsx
 *   - AdminHome → src/screens/home/AdminHome.tsx
 *   - AuthStack → src/navigation/AuthStack.tsx
 *   - AppStack → src/navigation/AppStack.tsx
 *   - types → src/navigation/types.ts (RootStackParamList)
 *
 * This file is now ~40 LOC.
 */
export default function Navigation() {
  const { isAuthenticated, isLoading, user } = useSelector((state: RootState) => state.auth);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated && user ? <AppStack role={user.role} /> : <AuthStack />}
    </NavigationContainer>
  );
}
