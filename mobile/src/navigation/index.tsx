import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import api from '../api/axios';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { dispatchEmergencyAlert } from '../utils/emergencyFallback';
import { registerForPushNotificationsAsync } from '../utils/registerPushToken';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import EmailVerificationScreen from '../screens/EmailVerificationScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HospitalsScreen from '../screens/HospitalsScreen';
import WorkshopsScreen from '../screens/WorkshopsScreen';
import IncidentsListScreen from '../screens/IncidentsListScreen';
import IncidentDetailScreen from '../screens/IncidentDetailScreen';
import CreateIncidentScreen from '../screens/CreateIncidentScreen';
import LocationSharingScreen from '../screens/LocationSharingScreen';
import EmergencyNotificationScreen from '../screens/EmergencyNotificationScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
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
import { FCMService } from '../services/fcmService';
import CountdownScreen from '../screens/CountdownScreen';

const Stack = createStackNavigator();

function DriverHome({ navigation }: any) {
  const dispatch = useDispatch();
  const vehicles = useSelector((state: RootState) => state.vehicles.list);
  const contacts = useSelector((state: RootState) => state.contacts.list);

  const activeVehicle = vehicles.find((v) => v.isPrimary);
  const primaryContact = contacts.find((c) => c.priorityOrder === 1);

  // Background fetch vehicles and contacts on Dashboard mount
  React.useEffect(() => {
    const syncData = async () => {
      try {
        const vRes = await api.get('/vehicles');
        dispatch({ type: 'vehicles/fetchVehiclesSuccess', payload: vRes.data });
        const cRes = await api.get('/emergency-contacts');
        dispatch({ type: 'contacts/fetchContactsSuccess', payload: cRes.data });
      } catch (err) {
        console.log('Failed to background sync dashboard data:', err);
      }
    };
    syncData();

    // Register FCM token & setup foreground push reception listeners
    FCMService.registerDeviceWithBackend();
    const unsubscribe = FCMService.setupFCMListeners();
    return unsubscribe;
  }, [dispatch]);

  const handleQuickCall = () => {
    if (primaryContact) {
      Linking.openURL(`tel:${primaryContact.phoneNumber}`);
    }
  };

  const triggerRealEmergencyDispatch = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Location permission needed to send an alert.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({});

      if (!contacts || contacts.length === 0) {
        alert('No emergency contacts saved yet. Add contacts first.');
        navigation.navigate('EmergencyContacts');
        return;
      }

      const dispatchContacts = contacts.map((c: any) => ({
        name: c.name,
        phoneNumber: c.phoneNumber,
        email: c.email,
      }));

      const meRes = await api.get('/users/me');
      const currentUser = meRes.data;

      const result = await dispatchEmergencyAlert(
        dispatchContacts,
        {
          userName: currentUser.fullName,
          userPhone: currentUser.phoneNumber,
          severity: 'Moderate',
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        async () => {
          await api.post('/alert-dispatch', {
            userId: currentUser.id,
            userName: currentUser.fullName,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            severity: 'Moderate',
            contacts: dispatchContacts,
          });
        },
      );

      alert(`Emergency alert sent via: ${result.mode}`);
    } catch (err: any) {
      console.log('Emergency dispatch failed:', err);
      alert('Failed to send emergency alert. Please try again or call emergency services directly.');
    }
  };
  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Paired Vehicle Widget */}
      <View style={styles.dashboardCard}>
        <Text style={styles.cardHeaderTitle}>🚗 Paired Vehicle</Text>
        {activeVehicle ? (
          <View style={styles.vehicleDetailsBlock}>
            <Text style={styles.activeVehicleName}>
              {activeVehicle.make} {activeVehicle.model} ({activeVehicle.year})
            </Text>
            <View style={styles.activePlateBadge}>
              <Text style={styles.activePlateText}>{activeVehicle.licensePlate.toUpperCase()}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.vehicleDetailsBlock}>
            <Text style={styles.noVehicleText}>No active vehicle paired for crash detection.</Text>
            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={() => navigation.navigate('MyVehicles')}
            >
              <Text style={styles.actionBtnText}>+ Add Vehicle</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Emergency Contact Quick Access Widget */}
      <View style={styles.dashboardCard}>
        <Text style={styles.cardHeaderTitle}>🛡️ Quick-Access Contact</Text>
        {primaryContact ? (
          <View style={styles.contactDetailsBlock}>
            <View>
              <Text style={styles.contactDisplayName}>{primaryContact.name}</Text>
              <Text style={styles.contactDisplaySub}>
                {primaryContact.relationship} • {primaryContact.phoneNumber}
              </Text>
            </View>
            <TouchableOpacity style={styles.callNowBtn} onPress={handleQuickCall}>
              <Text style={styles.callNowBtnText}>📞 CALL</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.contactDetailsBlock}>
            <Text style={styles.noVehicleText}>No emergency contacts registered.</Text>
            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={() => navigation.navigate('EmergencyContacts')}
            >
              <Text style={styles.actionBtnText}>+ Add Contact</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Navigation Portal Menu */}
      <Text style={styles.menuTitle}>Control Settings</Text>
      
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('MyVehicles')}
      >
        <Text style={styles.menuItemText}>🚗 My Vehicles</Text>
        <Text style={styles.menuItemArrow}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('EmergencyContacts')}
      >
        <Text style={styles.menuItemText}>📞 Emergency Contacts</Text>
        <Text style={styles.menuItemArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('NotificationHistory')}
      >
        <Text style={styles.menuItemText}>🔔 Notification History</Text>
        <Text style={styles.menuItemArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('NotificationPreferences')}
      >
        <Text style={styles.menuItemText}>⚙️ Notification Preferences</Text>
        <Text style={styles.menuItemArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('CrashSoundDemo')}
      >
        <Text style={styles.menuItemText}>🎙️ Crash Sound Detection</Text>
        <Text style={styles.menuItemArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('VoiceCommandDemo')}
      >
        <Text style={styles.menuItemText}>🗣️ Voice Commands</Text>
        <Text style={styles.menuItemArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={styles.menuItemText}>👤 My Profile Details</Text>
        <Text style={styles.menuItemArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('Hospitals')}
      >
        <Text style={styles.menuItemText}>🏥 Nearest Hospitals</Text>
        <Text style={styles.menuItemArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('Workshops')}
      >
        <Text style={styles.menuItemText}>🔧 Nearby Workshops</Text>
        <Text style={styles.menuItemArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('IncidentsList')}
      >
        <Text style={styles.menuItemText}>📋 Incident History</Text>
        <Text style={styles.menuItemArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('LocationSharing')}
      >
        <Text style={styles.menuItemText}>📡 Share Live Location</Text>
        <Text style={styles.menuItemArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('EmergencyNotification')}
      >
        <Text style={styles.menuItemText}>🚨 Emergency Alert</Text>
        <Text style={styles.menuItemArrow}>›</Text>
      </TouchableOpacity>

     <TouchableOpacity
        style={[styles.menuItem, { borderColor: '#d32f2f', borderWidth: 1.5 }]}
        onPress={triggerRealEmergencyDispatch}
      >
        <Text style={[styles.menuItemText, { color: '#d32f2f', fontWeight: 'bold' }]}>🚨 Send Emergency Alert</Text>
        <Text style={[styles.menuItemArrow, { color: '#d32f2f' }]}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.menuItem, { backgroundColor: '#b71c1c' }]}
        onPress={() => navigation.navigate('SOS')}
      >
        <Text style={[styles.menuItemText, { color: '#ffffff' }]}>🆘 Emergency SOS</Text>
        <Text style={[styles.menuItemArrow, { color: '#ffffff' }]}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
  style={[styles.menuItem, { backgroundColor: '#8b0000' }]}
  onPress={() =>
    navigation.navigate('Countdown', {
      latitude: 33.6844,
      longitude: 73.0479,
      severity: 'Moderate',
    })
  }
>
  <Text style={[styles.menuItemText, { color: '#fff' }]}>💥 Simulate Crash (Test Countdown)</Text>
  <Text style={[styles.menuItemArrow, { color: '#fff' }]}>›</Text>
</TouchableOpacity>
    </ScrollView>
  );
}

function MechanicHome({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mechanic Workshop Dashboard</Text>
      <Text style={styles.subtitle}>Receive roadside rescue referrals here 🔧</Text>
      <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Profile')}>
        <Text style={styles.navBtnText}>Go to Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

function AdminHome({ navigation }: any) {
  const [pendingMechanics, setPendingMechanics] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const fetchPendingMechanics = React.useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await api.get('/admin/users?role=MECHANIC');
      const unverified = response.data.users.filter(
        (u: any) => u.mechanicDetails && u.mechanicDetails.isWorkshopVerified === false
      );
      setPendingMechanics(unverified);
    } catch (err: any) {
      setMessage('Failed to load pending approvals list.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPendingMechanics();
  }, [fetchPendingMechanics]);

  const handleApprove = async (userId: string) => {
    try {
      await api.patch(`/admin/users/${userId}/verify-workshop`, { isWorkshopVerified: true });
      setPendingMechanics((prev) => prev.filter((m) => m.id !== userId));
    } catch (err) {
      alert('Failed to approve workshop.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Admin Audit Portal</Text>
        <Text style={styles.subtitle}>Manage platform settings & verify workshops 🛡️</Text>
      </View>

      <Text style={styles.sectionTitle}>Pending Workshop Approvals ({pendingMechanics.length})</Text>

      {isLoading ? (
        <ActivityIndicator color="#d32f2f" size="large" style={{ marginTop: 20 }} />
      ) : message ? (
        <Text style={styles.errorText}>{message}</Text>
      ) : pendingMechanics.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>🎉 All workshops are currently verified!</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollList}>
          {pendingMechanics.map((mechanic) => (
            <View key={mechanic.id} style={styles.approvalCard}>
              <View style={styles.cardRow}>
                <Text style={styles.mechanicName}>{mechanic.fullName}</Text>
                <Text style={styles.specializationBadge}>{mechanic.mechanicDetails?.specialization}</Text>
              </View>
              <Text style={styles.cardInfo}>Email: {mechanic.email}</Text>
              <Text style={styles.cardInfo}>Phone: {mechanic.phoneNumber}</Text>
              <Text style={styles.cardInfo}>Workshop: <Text style={{ fontWeight: 'bold', color: '#ffffff' }}>{mechanic.mechanicDetails?.workshopName}</Text></Text>
              <Text style={styles.cardInfo}>Address: {mechanic.mechanicDetails?.workshopAddress}</Text>
              <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(mechanic.id)}>
                <Text style={styles.approveBtnText}>Approve & Verify Workshop</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('AdminDashboard')}>
        <Text style={styles.navBtnText}>📊 Analytics Dashboard</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Profile')}>
        <Text style={styles.navBtnText}>Go to My Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#121212', elevation: 0, shadowOpacity: 0 },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
        cardStyle: { backgroundColor: '#121212' },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
      <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} options={{ title: 'Email Verification' }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Forgot Password' }} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'Reset Password' }} />
    </Stack.Navigator>
  );
}

function AppStack({ role }: { role: string }) {
  const getHomeComponent = () => {
    switch (role) {
      case 'DRIVER': return DriverHome;
      case 'MECHANIC': return MechanicHome;
      case 'ADMIN': return AdminHome;
      default: return DriverHome;
    }
  };

  const getHeaderTitle = () => {
    switch (role) {
      case 'DRIVER': return 'ResQDrive';
      case 'MECHANIC': return 'Workshop Dashboard';
      case 'ADMIN': return 'Admin Controls';
      default: return 'ResQDrive';
    }
  };

  React.useEffect(() => {
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
      <Stack.Screen name="Home" component={getHomeComponent()} options={{ title: getHeaderTitle() }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
      <Stack.Screen name="Hospitals" component={HospitalsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Workshops" component={WorkshopsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="IncidentsList" component={IncidentsListScreen} options={{ title: 'Incident History' }} />
      <Stack.Screen name="IncidentDetail" component={IncidentDetailScreen} options={{ title: 'Incident Detail' }} />
      <Stack.Screen name="CreateIncident" component={CreateIncidentScreen} options={({ route }: any) => ({ title: route.params?.mode === 'edit' ? 'Edit Incident' : 'New Incident' })} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin Dashboard' }} />
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
      <Stack.Screen name="Countdown" component={CountdownScreen} options={{ headerShown: false, gestureEnabled: false }} />
    </Stack.Navigator>
  );
}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 24,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 12,
  },
  scrollList: {
    flex: 1,
    marginBottom: 20,
  },
  approvalCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mechanicName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  specializationBadge: {
    backgroundColor: '#3a2222',
    color: '#ff8a80',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d32f2f',
  },
  cardInfo: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 4,
  },
  approveBtn: {
    backgroundColor: '#388e3c',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  approveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginVertical: 40,
  },
  emptyText: {
    color: '#888888',
    fontSize: 15,
    textAlign: 'center',
  },
  errorText: {
    color: '#ff8a80',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },
  navBtn: {
    backgroundColor: '#d32f2f',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  navBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Dashboard Widget Styles
  dashboardCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vehicleDetailsBlock: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  activeVehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  activePlateBadge: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#d32f2f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  activePlateText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  noVehicleText: {
    color: '#888888',
    fontSize: 14,
    marginBottom: 12,
  },
  actionBtnSecondary: {
    backgroundColor: '#2e2e2e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3e3e3e',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contactDetailsBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactDisplayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  contactDisplaySub: {
    fontSize: 13,
    color: '#888888',
    marginTop: 4,
  },
  callNowBtn: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  callNowBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Menu Portal Styles
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888888',
    marginTop: 10,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    backgroundColor: '#1e1e1e',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  menuItemText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  menuItemArrow: {
    color: '#666666',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
