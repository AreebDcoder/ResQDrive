import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Switch, Platform, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import api from '../api/axios';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { dispatchEmergencyAlert } from '../utils/emergencyFallback';
import { registerForPushNotificationsAsync } from '../utils/registerPushToken';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

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
import DamageAssessmentScreen from '../screens/DamageAssessmentScreen';
import RepairCostScreen from '../screens/RepairCostScreen';
import { FCMService } from '../services/fcmService';
import CountdownScreen from '../screens/CountdownScreen';
import { CrashSoundDetectionService } from '../services/crashSoundDetectionService';

const Stack = createStackNavigator();

function DriverHome({ navigation }: any) {
  const dispatch = useDispatch();
  const vehicles = useSelector((state: RootState) => state.vehicles.list);
  const contacts = useSelector((state: RootState) => state.contacts.list);

  const activeVehicle = vehicles.find((v) => v.isPrimary);
  const primaryContact = contacts.find((c) => c.priorityOrder === 1);

  const [activeTab, setActiveTab] = React.useState<'home' | 'alert' | 'damage' | 'services' | 'parts' | 'voice'>('home');
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const { preferences } = useSelector((state: RootState) => state.notifications);
  const [isUpdatingPref, setIsUpdatingPref] = React.useState(false);

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

    // Fetch preferences to get driving mode indicator state
    const fetchPrefs = async () => {
      try {
        const response = await api.get('/notifications/preferences');
        dispatch({ type: 'notifications/fetchPreferencesSuccess', payload: response.data });
      } catch (err) {
        console.log('Failed to fetch preferences on Home mount:', err);
      }
    };
    if (!preferences) {
      fetchPrefs();
    }

    // Register FCM token & setup foreground push reception listeners
    FCMService.registerDeviceWithBackend();
    const unsubscribe = FCMService.setupFCMListeners();
    return unsubscribe;
  }, [dispatch]);
  // ⬇️ ADD THE NEW useEffect RIGHT HERE, AFTER THE ONE ABOVE ENDS ⬇️
  React.useEffect(() => {
  let isCountdownActive = false;

  CrashSoundDetectionService.subscribeToCrashEvents((confidence, topClass) => {
    if (isCountdownActive) {
      console.log('⏸️ Crash detected but countdown already active — ignoring duplicate trigger.');
      return;
    }

    console.log('🚨 CRASH CALLBACK FIRED — confidence:', confidence, 'class:', topClass);
    isCountdownActive = true;

    Location.requestForegroundPermissionsAsync()
      .then(({ status }) => {
        if (status !== 'granted') {
          console.log('❌ Location permission not granted, cannot navigate to Countdown.');
          isCountdownActive = false;
          return;
        }
        return Location.getCurrentPositionAsync({});
      })
      .then((location) => {
        if (!location) return;
        console.log('📍 Got location, navigating to Countdown now...');
        navigation.navigate('Countdown', {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          severity: confidence > 0.75 ? 'Severe' : 'Moderate',
        });
      })
      .catch((err) => {
        console.log('❌ Location fetch failed:', err);
        isCountdownActive = false;
      });
  });

  CrashSoundDetectionService.startMonitoring();

  return () => {
    CrashSoundDetectionService.stopMonitoring();
  };
}, [navigation]);
  const handleQuickCall = () => {
    if (primaryContact) {
      Linking.openURL(`tel:${primaryContact.phoneNumber}`);
    }
  };

  const handleToggleDrivingMode = async () => {
    if (!preferences) return;
    const key = 'drivingModeEnabled';
    const currentValue = preferences.drivingModeEnabled;
    const newValue = !currentValue;

    dispatch({ type: 'notifications/updatePreferenceOptimistic', payload: { [key]: newValue } });
    setIsUpdatingPref(true);
    try {
      await api.patch('/notifications/preferences', { [key]: newValue });
    } catch (err) {
      alert('Failed to update preference. Reverting...');
      dispatch({ type: 'notifications/updatePreferenceOptimistic', payload: { [key]: currentValue } });
    } finally {
      setIsUpdatingPref(false);
    }
  };

  const testEmergencyFallback = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert('Location permission needed for this test.');
      return;
    }
    const location = await Location.getCurrentPositionAsync({});

    const result = await dispatchEmergencyAlert(
      [{ name: 'Test Contact', phoneNumber: '+923175718391' }],
      {
        userName: 'Abdul Basit',
        userPhone: '+923321276653',
        severity: 'Moderate',
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      async () => {
        throw new Error('Simulating online dispatch not implemented yet');
      },
    );

    alert(`Fallback test result: ${result.mode}`);
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

  const handleTabPress = (tabName: 'home' | 'alert' | 'damage' | 'services' | 'parts' | 'voice') => {
    if (tabName === 'voice') {
      alert('Voice Commands feature is currently disabled.');
    } else {
      setActiveTab(tabName);
    }
  };

  // Render content based on activeTab
  const renderContent = () => {
    switch (activeTab) {
      case 'services':
        return <HospitalsScreen navigation={navigation} isInline={true} />;
      case 'parts':
        return <WorkshopsScreen navigation={navigation} isInline={true} />;
      case 'alert':
        return <SOSScreen navigation={navigation} isInline={true} />;
      case 'damage':
        return <DamageAssessmentScreen navigation={navigation} isInline={true} />;
      case 'home':
      default:
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
                  <View style={{ flex: 1, marginRight: 12 }}>
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
                <View style={styles.vehicleDetailsBlock}>
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

            {/* Driving Mode Preference Toggle Widget */}
            <View style={[styles.dashboardCard, { alignItems: 'center' }]}>
              <TouchableOpacity
                onPress={handleToggleDrivingMode}
                disabled={isUpdatingPref || !preferences}
                style={[
                  styles.drivingModeCircle,
                  (preferences?.drivingModeEnabled) ? styles.circleActive : styles.circleInactive
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="power"
                  size={48}
                  color={(preferences?.drivingModeEnabled) ? '#ffffff' : '#b71c1c'}
                />
              </TouchableOpacity>

              <Text style={styles.drivingModeStatusText}>
                Driving Mode
              </Text>
              <Text style={styles.drivingModeActionText}>
                {(preferences?.drivingModeEnabled) ? 'On' : 'Off'}
              </Text>
            </View>
          </ScrollView>
        );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      {/* Header */}
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => setIsDrawerOpen(true)}>
          <Ionicons name="menu" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.customHeaderTitle}>ResQDrive</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Main Content Area */}
      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>

      {/* Bottom Tabs */}
      <View style={tabStyles.tabBar}>
        <TouchableOpacity style={tabStyles.tabItem} onPress={() => handleTabPress('home')}>
          {activeTab === 'home' && <View style={tabStyles.activeIndicator} />}
          <Ionicons name={activeTab === 'home' ? "home" : "home-outline"} size={22} color={activeTab === 'home' ? '#d32f2f' : '#888888'} />
          <Text style={[tabStyles.tabLabel, activeTab === 'home' && tabStyles.activeTabLabel]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={tabStyles.tabItem} onPress={() => handleTabPress('alert')}>
          {activeTab === 'alert' && <View style={tabStyles.activeIndicator} />}
          <Ionicons name={activeTab === 'alert' ? "warning" : "warning-outline"} size={22} color={activeTab === 'alert' ? '#d32f2f' : '#888888'} />
          <Text style={[tabStyles.tabLabel, activeTab === 'alert' && tabStyles.activeTabLabel]}>Alert</Text>
        </TouchableOpacity>

        <TouchableOpacity style={tabStyles.tabItem} onPress={() => handleTabPress('damage')}>
          {activeTab === 'damage' && <View style={tabStyles.activeIndicator} />}
          <Ionicons name={activeTab === 'damage' ? "camera" : "camera-outline"} size={22} color={activeTab === 'damage' ? '#d32f2f' : '#888888'} />
          <Text style={[tabStyles.tabLabel, activeTab === 'damage' && tabStyles.activeTabLabel]}>Damage</Text>
        </TouchableOpacity>

        <TouchableOpacity style={tabStyles.tabItem} onPress={() => handleTabPress('services')}>
          {activeTab === 'services' && <View style={tabStyles.activeIndicator} />}
          <Ionicons name={activeTab === 'services' ? "location" : "location-outline"} size={22} color={activeTab === 'services' ? '#d32f2f' : '#888888'} />
          <Text style={[tabStyles.tabLabel, activeTab === 'services' && tabStyles.activeTabLabel]}>Hospital</Text>
        </TouchableOpacity>

        <TouchableOpacity style={tabStyles.tabItem} onPress={() => handleTabPress('parts')}>
          {activeTab === 'parts' && <View style={tabStyles.activeIndicator} />}
          <MaterialCommunityIcons name={activeTab === 'parts' ? "wrench" : "wrench-outline"} size={22} color={activeTab === 'parts' ? '#d32f2f' : '#888888'} />
          <Text style={[tabStyles.tabLabel, activeTab === 'parts' && tabStyles.activeTabLabel]}>Workshop</Text>
        </TouchableOpacity>
      </View>

      {/* Sidebar Drawer Modal Overlay */}
      {isDrawerOpen && (
        <View style={drawerStyles.overlay}>
          <TouchableOpacity style={drawerStyles.backdrop} activeOpacity={1} onPress={() => setIsDrawerOpen(false)} />
          <View style={drawerStyles.drawerContainer}>
            <View style={drawerStyles.drawerHeader}>
              <Text style={drawerStyles.drawerTitle}>Menu Options</Text>
              <TouchableOpacity onPress={() => setIsDrawerOpen(false)}>
                <Ionicons name="close-outline" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={drawerStyles.drawerScroll} contentContainerStyle={{ paddingBottom: 40 }}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('MyVehicles');
                }}
              >
                <Text style={styles.menuItemText}>🚗 My Vehicles</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('EmergencyContacts');
                }}
              >
                <Text style={styles.menuItemText}>📞 Emergency Contacts</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('NotificationHistory');
                }}
              >
                <Text style={styles.menuItemText}>🔔 Notification History</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('NotificationPreferences');
                }}
              >
                <Text style={styles.menuItemText}>⚙️ Notification Preferences</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('CrashSoundDemo');
                }}
              >
                <Text style={styles.menuItemText}>🎙️ Crash Sound Detection</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('VoiceCommandDemo');
                }}
              >
                <Text style={styles.menuItemText}>🗣️ Voice Commands</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('Profile');
                }}
              >
                <Text style={styles.menuItemText}>👤 My Profile Details</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('IncidentsList');
                }}
              >
                <Text style={styles.menuItemText}>📋 Incident History</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('LocationSharing');
                }}
              >
                <Text style={styles.menuItemText}>📡 Share Live Location</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('EmergencyNotification');
                }}
              >
                <Text style={styles.menuItemText}>🚨 Emergency Alert</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  testEmergencyFallback();
                }}
              >
                <Text style={styles.menuItemText}>🧪 Test Emergency Fallback</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { borderColor: '#d32f2f', borderWidth: 1 }]}
                onPress={() => {
                  setIsDrawerOpen(false);
                  triggerRealEmergencyDispatch();
                }}
              >
                <Text style={[styles.menuItemText, { color: '#d32f2f', fontWeight: 'bold' }]}>🚨 Send Emergency Alert</Text>
                <Text style={[styles.menuItemArrow, { color: '#d32f2f' }]}>›</Text>
              </TouchableOpacity>



              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: '#8b0000' }]}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('Countdown', {
                    latitude: 33.6844,
                    longitude: 73.0479,
                    severity: 'Moderate',
                  });
                }}
              >
                <Text style={[styles.menuItemText, { color: '#fff' }]}>💥 Simulate Crash (Test Countdown)</Text>
                <Text style={[styles.menuItemArrow, { color: '#fff' }]}>›</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

function MechanicHome({ navigation }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <View style={styles.customHeader}>
        <View style={{ width: 28 }} />
        <Text style={styles.customHeaderTitle}>Workshop Dashboard</Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={styles.container}>
        <Text style={styles.subtitle}>Receive roadside rescue referrals here 🔧</Text>
        <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.navBtnText}>Go to Profile</Text>
        </TouchableOpacity>
      </View>
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
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <View style={styles.customHeader}>
        <View style={{ width: 28 }} />
        <Text style={styles.customHeaderTitle}>Admin Controls</Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={styles.container}>
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
      <Stack.Screen name="Home" component={getHomeComponent()} options={{ headerShown: false }} />
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
      <Stack.Screen name="DamageAssessment" component={DamageAssessmentScreen} options={{ title: 'Damage Assessment' }} />
      <Stack.Screen name="RepairCost" component={RepairCostScreen} options={{ headerShown: false }} />
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

const tabStyles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#2e2e2e',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 5,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    paddingTop: 8,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 3,
    backgroundColor: '#d32f2f',
    borderRadius: 1.5,
  },
  tabLabel: {
    fontSize: 10,
    color: '#888888',
    marginTop: 4,
  },
  activeTabLabel: {
    color: '#d32f2f',
  },
});

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
    centerContainer: {
      flex: 1,
      backgroundColor: '#121212',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    mockTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#ffffff',
      marginTop: 16,
      marginBottom: 8,
    },
    mockSubtitle: {
      fontSize: 14,
      color: '#888888',
      textAlign: 'center',
      lineHeight: 20,
    },
    customHeader: {
      flexDirection: 'row',
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 44,
      height: Platform.OS === 'android' ? 56 + (StatusBar.currentHeight || 0) + 12 : 56 + 44,
      backgroundColor: '#1e1e1e',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#2e2e2e',
    },
    drivingModeCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      marginVertical: 16,
      alignSelf: 'center',
    },
    circleActive: {
      backgroundColor: '#b71c1c',
      borderColor: '#b71c1c',
      shadowColor: '#b71c1c',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.6,
      shadowRadius: 10,
      elevation: 8,
    },
    circleInactive: {
      backgroundColor: '#2a1a1a',
      borderColor: '#b71c1c',
    },
    circleStateText: {
      fontSize: 28,
      fontWeight: 'bold',
    },
    drivingModeStatusText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#ffffff',
      marginTop: 8,
      textAlign: 'center',
    },
    drivingModeActionText: {
      fontSize: 14,
      color: '#888888',
      marginTop: 4,
      textAlign: 'center',
    },
    customHeaderTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#ffffff',
    },
    headerIconBtn: {
      padding: 4,
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    toggleRowLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#ffffff',
    },
    toggleRowDesc: {
      fontSize: 12,
      color: '#888888',
      marginTop: 4,
    },
  });
  
  const drawerStyles = StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      flexDirection: 'row',
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    drawerContainer: {
      width: 290,
      height: '100%',
      backgroundColor: '#1e1e1e',
      borderRightWidth: 1,
      borderRightColor: '#2e2e2e',
      paddingTop: 40,
      paddingHorizontal: 16,
    },
    drawerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#2e2e2e',
    },
    drawerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#ffffff',
    },
    drawerScroll: {
      flex: 1,
    },
  });
