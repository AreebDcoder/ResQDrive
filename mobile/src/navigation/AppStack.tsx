import React, { useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '../utils/registerPushToken';
import type { AppStackParamList } from './types';

// Screens
import ProfileScreen from '../screens/ProfileScreen';
import HospitalsScreen from '../screens/HospitalsScreen';
import WorkshopsScreen from '../screens/WorkshopsScreen';
import IncidentsListScreen from '../screens/IncidentsListScreen';
import IncidentDetailScreen from '../screens/IncidentDetailScreen';
import CreateIncidentScreen from '../screens/CreateIncidentScreen';
import LocationSharingScreen from '../screens/LocationSharingScreen';
import EmergencyNotificationScreen from '../screens/EmergencyNotificationScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminEmergencyNumbersScreen from '../screens/admin/AdminEmergencyNumbersScreen';
import SOSScreen from '../screens/SOSScreen';
import MyVehiclesScreen from '../screens/MyVehiclesScreen';
import AddEditVehicleScreen from '../screens/AddEditVehicleScreen';
import VehicleInsuranceScreen from '../screens/VehicleInsuranceScreen';
import EmergencyContactsScreen from '../screens/EmergencyContactsScreen';
import AddEditContactScreen from '../screens/AddEditContactScreen';
import NotificationPreferencesScreen from '../screens/NotificationPreferencesScreen';
import NotificationHistoryScreen from '../screens/NotificationHistoryScreen';
import CrashSoundDemoScreen from '../screens/CrashSoundDemoScreen';
import VoiceCommandDemoScreen from '../screens/VoiceCommandDemoScreen';
import DamageAssessmentScreen from '../screens/DamageAssessmentScreen';
import RepairCostScreen from '../screens/RepairCostScreen';
import CountdownScreen from '../screens/CountdownScreen';
import BleSensorDemoScreen from '../screens/BleSensorDemoScreen';

// Home screens (role-aware)
import DriverHome from '../screens/home/DriverHome';
import MechanicHome from '../screens/home/MechanicHome';
import AdminHome from '../screens/home/AdminHome';

const Stack = createStackNavigator<AppStackParamList>();

export default function AppStack({ role }: { role: string }) {
  const getHomeComponent = () => {
    switch (role) {
      case 'DRIVER': return DriverHome;
      case 'MECHANIC': return MechanicHome;
      case 'ADMIN': return AdminHome;
      default: return DriverHome;
    }
  };

  useEffect(() => {
    registerForPushNotificationsAsync().catch((err) => {
      console.log('Push notification registration failed:', err);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const mapsLink = response.notification.request.content.data?.mapsLink as string;
      if (mapsLink) {
        Linking.openURL(mapsLink);
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1e1e1e', elevation: 0, shadowOpacity: 0 },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
        cardStyle: { backgroundColor: '#121212' },
      }}
    >
      <Stack.Screen name="Home" component={getHomeComponent()} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
      <Stack.Screen name="Hospitals" component={HospitalsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Workshops" component={WorkshopsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="IncidentsList" component={IncidentsListScreen} options={{ title: 'Incident History' }} />
      <Stack.Screen name="IncidentDetail" component={IncidentDetailScreen} options={{ title: 'Incident Detail' }} />
      <Stack.Screen name="CreateIncident" component={CreateIncidentScreen} options={({ route }: any) => ({ title: route.params?.mode === 'edit' ? 'Edit Incident' : 'New Incident' })} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="AdminEmergencyNumbers" component={AdminEmergencyNumbersScreen} options={{ title: 'Regional Emergency Numbers' }} />
      <Stack.Screen name="LocationSharing" component={LocationSharingScreen} options={{ title: 'Live Location' }} />
      <Stack.Screen name="EmergencyNotification" component={EmergencyNotificationScreen} options={{ title: 'Emergency Alert' }} />
      <Stack.Screen name="SOS" component={SOSScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MyVehicles" component={MyVehiclesScreen} options={{ title: 'My Vehicles' }} />
      <Stack.Screen name="AddEditVehicle" component={AddEditVehicleScreen} options={{ title: 'Vehicle Details' }} />
      <Stack.Screen name="VehicleInsurance" component={VehicleInsuranceScreen} options={{ title: 'Insurance Reference' }} />
      <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} options={{ title: 'Emergency Contacts' }} />
      <Stack.Screen name="AddEditContact" component={AddEditContactScreen} options={{ title: 'Contact Details' }} />
      <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} options={{ title: 'Preferences' }} />
      <Stack.Screen name="NotificationHistory" component={NotificationHistoryScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="CrashSoundDemo" component={CrashSoundDemoScreen} options={{ title: 'Sound Detection' }} />
      <Stack.Screen name="VoiceCommandDemo" component={VoiceCommandDemoScreen} options={{ title: 'Voice Commands' }} />
      <Stack.Screen name="DamageAssessment" component={DamageAssessmentScreen} options={{ title: 'Damage Assessment' }} />
      <Stack.Screen name="RepairCost" component={RepairCostScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Countdown" component={CountdownScreen} options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="BleSensorDemo" component={BleSensorDemoScreen} options={{ title: 'BLE Sensor Diagnostics' }} />
    </Stack.Navigator>
  );
}
