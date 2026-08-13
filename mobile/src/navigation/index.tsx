import React, { useState, useEffect } from 'react';
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
import { logoutAction, setTokens } from '../store/slices/authSlice';
import { classifyMotionSeverity } from '../config/motionSeverityConfig';
import { MultiModalFusionService } from '../services/multiModalFusionService';

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
import BleSensorDemoScreen from '../screens/BleSensorDemoScreen';
import { sensorSourceManager } from '../services/sensorSourceManager';

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
  const { connectionStatus, activeSource, latestReading } = useSelector((state: RootState) => state.sensor);
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

  React.useEffect(() => {
    // 1. Subscribe to multi-modal acoustic-motion coincidence triggers (10-second window)
    MultiModalFusionService.subscribeToConfirmedAccidents((trigger) => {
      console.log(`🚨 MULTI-MODAL ACCIDENT CONFIRMED! Acoustic ("${trigger.soundEvent.topClass}") & Motion (${trigger.motionEvent.severity.toUpperCase()}) co-occurred within 10s window!`);

      Location.requestForegroundPermissionsAsync()
        .then(({ status }) => {
          if (status !== 'granted') {
            console.log('❌ Location permission not granted, cannot navigate to Countdown.');
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
            severity: trigger.combinedSeverity,
            countdownSeconds: trigger.combinedSeverity === 'Severe' ? 10 : 20,
          });
        })
        .catch((err) => {
          console.log('❌ Multi-modal accident trigger location fetch failed:', err);
        });
    });

    // 2. Feed YAMNet acoustic crash events into MultiModalFusionService
    CrashSoundDetectionService.subscribeToCrashEvents((confidence, topClass) => {
      console.log('🔊 [Audio Monitor] Acoustic crash signature detected:', topClass, `${(confidence * 100).toFixed(1)}%`);
      MultiModalFusionService.recordSoundEvent(confidence, topClass);
    });

    if (preferences?.drivingModeEnabled) {
      console.log('Driving Mode Enabled: Starting background YAMNet crash sound monitoring...');
      CrashSoundDetectionService.startMonitoring();
    } else {
      console.log('Driving Mode Disabled: Stopping background YAMNet crash sound monitoring...');
      CrashSoundDetectionService.stopMonitoring();
    }

    return () => {
      CrashSoundDetectionService.stopMonitoring();
    };
  }, [preferences?.drivingModeEnabled]);

  React.useEffect(() => {
    if (preferences?.drivingModeEnabled) {
      console.log('Driving Mode Enabled: Starting sensor fusion source manager...');

      // 3. Feed Accelerometer/Gyroscope motion events into MultiModalFusionService
      sensorSourceManager.onSensorEvent((reading) => {
        const severity = reading.motionSeverity || classifyMotionSeverity(reading.accelG, reading.gyroDegPerSec);

        if (severity === 'severe' || severity === 'moderate') {
          console.log(`🚗 [Motion Monitor] ${severity.toUpperCase()} impact signature detected (${reading.accelG.toFixed(2)}g / ${reading.gyroDegPerSec.toFixed(1)}°/s). Feeding into MultiModalFusionService...`);
          MultiModalFusionService.recordMotionEvent(severity, reading.accelG, reading.gyroDegPerSec);
        } else if (severity === 'minor') {
          console.log(`ℹ️ [Motion Monitor] Logged MINOR jolt event (${reading.accelG.toFixed(2)}g, ${reading.gyroDegPerSec.toFixed(1)}°/s). Recorded for history review without triggering countdown.`);
        }
      });

      sensorSourceManager.start();
    } else {
      console.log('Driving Mode Disabled: Stopping sensor fusion source manager...');
      sensorSourceManager.stop();
    }

    return () => {
      sensorSourceManager.stop();
    };
  }, [preferences?.drivingModeEnabled]);

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

            {/* Live Telemetry Widget */}
            <View style={styles.dashboardCard}>
              <Text style={styles.cardHeaderTitle}>📊 Live Telemetry</Text>
              {preferences?.drivingModeEnabled ? (
                <View>
                  <View style={styles.telemetryRow}>
                    <Text style={styles.telemetryLabel}>Source:</Text>
                    <Text style={styles.telemetryValueBold}>
                      {activeSource === 'ble' ? '🔌 BLE Hardware' : '📱 Phone Sensors'}
                    </Text>
                  </View>
                  <View style={styles.telemetryRow}>
                    <Text style={styles.telemetryLabel}>G-Force Magnitude:</Text>
                    <Text style={styles.telemetryValue}>
                      {latestReading ? `${latestReading.accelG.toFixed(3)} G` : '1.000 G'}
                    </Text>
                  </View>
                  <View style={styles.telemetryRow}>
                    <Text style={styles.telemetryLabel}>Rotation Speed:</Text>
                    <Text style={styles.telemetryValue}>
                      {latestReading ? `${latestReading.gyroDegPerSec.toFixed(1)} °/s` : '0.0 °/s'}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.noVehicleText}>
                  Telemetry inactive. Turn on Driving Mode to view live sensors.
                </Text>
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
        <TouchableOpacity 
          onPress={() => navigation.navigate('BleSensorDemo')}
          style={{ padding: 4 }}
        >
          <Ionicons 
            name={connectionStatus === 'connected' ? 'bluetooth' : 'bluetooth-outline'} 
            size={24} 
            color={
              connectionStatus === 'connected' 
                ? '#4caf50' 
                : connectionStatus === 'connecting' 
                ? '#ff9800' 
                : '#757575'
            } 
          />
        </TouchableOpacity>
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
                <Text style={styles.menuItemArrow}>›
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('BleSensorDemo');
                }}
              >
                <Text style={styles.menuItemText}>🔌 BLE Sensor Diagnostics</Text>
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
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
      <View style={styles.customHeader}>
        <View style={{ width: 28 }} />
        <Text style={styles.customHeaderTitle}>Workshop Dashboard</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <View style={mS.workshopCard}>
          <Text style={mS.workshopLabel}>Workshop</Text>
          <Text style={mS.workshopName}>{user?.mechanicDetails?.workshopName || 'My Workshop'}</Text>
          <Text style={mS.workshopSpec}>{user?.mechanicDetails?.specialization || 'General Repair'}</Text>
        </View>
        <TouchableOpacity style={mS.menuItem} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-circle-outline" size={22} color="#aaa" />
          <Text style={mS.menuLabel}>My Profile</Text>
          <Ionicons name="chevron-forward" size={18} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity style={mS.menuItem} onPress={() => navigation.navigate('IncidentsList')}>
          <Ionicons name="document-text-outline" size={22} color="#aaa" />
          <Text style={mS.menuLabel}>Incident History</Text>
          <Ionicons name="chevron-forward" size={18} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity style={mS.menuItem} onPress={() => navigation.navigate('NotificationHistory')}>
          <Ionicons name="notifications-outline" size={22} color="#aaa" />
          <Text style={mS.menuLabel}>Notifications</Text>
          <Ionicons name="chevron-forward" size={18} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity style={mS.menuItem} onPress={() => navigation.navigate('Hospitals')}>
          <Ionicons name="medkit-outline" size={22} color="#aaa" />
          <Text style={mS.menuLabel}>Nearby Hospitals</Text>
          <Ionicons name="chevron-forward" size={18} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity style={mS.logoutBtn} onPress={() => dispatch(logoutAction())}>
          <Text style={mS.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const mS = StyleSheet.create({
  workshopCard: {
    backgroundColor: 'rgba(28,28,46,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 10,
  },
  workshopLabel: { fontSize: 12, color: '#888', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 },
  workshopName: { fontSize: 20, fontWeight: '600', color: '#fff', marginTop: 4 },
  workshopSpec: { fontSize: 14, color: '#d32f2f', marginTop: 2 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28,28,46,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  menuLabel: { flex: 1, fontSize: 15, color: '#e0e0e0' },
  logoutBtn: {
    backgroundColor: 'rgba(211,47,47,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(211,47,47,0.3)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});

// ADD THIS SEPARATE StyleSheet (NOT inside the existing one)
const mechStyles = StyleSheet.create({
  drawerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, elevation: 1000 },
  drawerTouchable: { flex: 1, justifyContent: 'flex-start' },
  drawerPanel: { width: 280, height: '100%', backgroundColor: '#12121A', paddingTop: 60, paddingBottom: 40, position: 'absolute', left: 0, top: 0, bottom: 0 },
  drawerHeader: { paddingHorizontal: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', marginBottom: 8 },
  drawerAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#d32f2f', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  drawerAvatarText: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  drawerName: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 4 },
  drawerEmail: { fontSize: 13, color: '#888', marginBottom: 8 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedBadgeText: { fontSize: 12, fontWeight: '500' },
  drawerMenu: { flex: 1, paddingTop: 8 },
  drawerMenuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14 },
  drawerMenuIcon: { width: 28 },
  drawerMenuLabel: { fontSize: 15, color: '#ccc', marginLeft: 4 },
  mechWorkshopCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(28,28,46,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 12, gap: 14 },
  mechWorkshopIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(211,47,47,0.15)', justifyContent: 'center', alignItems: 'center' },
  mechWorkshopInfo: { flex: 1 },
  mechWorkshopName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 2 },
  mechWorkshopSpec: { fontSize: 13, color: '#d32f2f', fontWeight: '500', marginBottom: 2 },
  mechWorkshopAddr: { fontSize: 12, color: '#888' },
  mechStatsRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, gap: 10 },
  mechStatCard: { flex: 1, backgroundColor: 'rgba(28,28,46,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, alignItems: 'center' },
  mechStatNumber: { fontSize: 26, fontWeight: '700', color: '#fff' },
  mechStatLabel: { fontSize: 11, color: '#888', marginTop: 4, fontWeight: '500' },
  mechQuickActions: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, gap: 12 },
  mechQuickActionBtn: { flex: 1, alignItems: 'center', gap: 8 },
  mechQuickActionIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  mechQuickActionLabel: { fontSize: 11, color: '#aaa', fontWeight: '500' },
  mechSection: { flex: 1, marginTop: 20, paddingHorizontal: 16, paddingBottom: 90 },
  mechSectionTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  mechEmptyState: { alignItems: 'center', marginTop: 30 },
  mechEmptyText: { fontSize: 15, color: '#888', marginTop: 12, fontWeight: '500' },
  mechEmptySubtext: { fontSize: 13, color: '#555', marginTop: 4 },
  mechRequestCard: { backgroundColor: 'rgba(28,28,46,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, marginBottom: 10 },
  mechRequestHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  mechRequestTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#fff' },
  mechStatusBadge: { backgroundColor: 'rgba(211,47,47,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  mechStatusText: { fontSize: 10, color: '#ef4444', fontWeight: '600' },
  mechRequestDesc: { fontSize: 13, color: '#aaa', lineHeight: 18, marginBottom: 8 },
  mechRequestFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mechRequestTime: { fontSize: 12, color: '#666' },
  mechBottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: '#0E0E16', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingBottom: 8, paddingTop: 6 },
  mechBottomNavItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, position: 'relative' },
  mechBottomNavLabel: { fontSize: 10, color: '#666', marginTop: 2 },
  mechBottomNavIndicator: { position: 'absolute', top: 0, width: 30, height: 3, borderRadius: 2, backgroundColor: '#d32f2f' },
});


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
  headerStyle: { backgroundColor: '#0A0A0F', elevation: 0, shadowOpacity: 0 },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: { fontWeight: 'bold' },
  cardStyle: { backgroundColor: '#0A0A0F' },
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
      <Stack.Screen name="BleSensorDemo" component={BleSensorDemoScreen} options={{ title: 'BLE Sensor Diagnostics' }} />
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
    backgroundColor: 'rgba(28, 28, 46, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
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
    backgroundColor: '#E53935',
    borderRadius: 2,
  },
  tabLabel: { fontSize: 10, color: '#6B6B80', marginTop: 4 },
  activeTabLabel: { color: '#E53935' },
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0F', padding: 24 },
  scrollContainer: { flex: 1, backgroundColor: '#0A0A0F', padding: 16 },
  headerBlock: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#A0A0B8', textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#E53935', marginBottom: 12 },
  scrollList: { flex: 1, marginBottom: 20 },
  approvalCard: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)', borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mechanicName: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  specializationBadge: {
    backgroundColor: 'rgba(229, 57, 53, 0.12)', color: '#FF8A80', fontSize: 11, fontWeight: 'bold',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(229, 57, 53, 0.3)',
  },
  cardInfo: { fontSize: 13, color: '#A0A0B8', marginBottom: 4 },
  approveBtn: {
    backgroundColor: '#00E676', paddingVertical: 10, borderRadius: 14, alignItems: 'center', marginTop: 12,
    shadowColor: '#00E676', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  approveBtnText: { color: '#0A0A0F', fontSize: 14, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginVertical: 40 },
  emptyText: { color: '#A0A0B8', fontSize: 15, textAlign: 'center' },
  errorText: { color: '#FF8A80', fontSize: 14, textAlign: 'center', marginVertical: 20 },
  navBtn: {
    backgroundColor: '#E53935', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 10,
    shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  navBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  dashboardCard: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)', borderRadius: 20, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  telemetryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  telemetryLabel: { fontSize: 14, color: '#A0A0B8' },
  telemetryValue: { fontSize: 14, color: '#FFFFFF' },
  telemetryValueBold: { fontSize: 14, fontWeight: 'bold', color: '#00E676' },
  cardHeaderTitle: { fontSize: 15, fontWeight: 'bold', color: '#E53935', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  vehicleDetailsBlock: { flexDirection: 'column', alignItems: 'flex-start' },
  activeVehicleName: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  activePlateBadge: {
    backgroundColor: 'rgba(10, 10, 15, 0.6)', borderWidth: 1, borderColor: 'rgba(229, 57, 53, 0.4)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  activePlateText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  noVehicleText: { color: '#A0A0B8', fontSize: 14, marginBottom: 12 },
  actionBtnSecondary: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  actionBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  contactDetailsBlock: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contactDisplayName: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  contactDisplaySub: { fontSize: 13, color: '#A0A0B8', marginTop: 4 },
  callNowBtn: {
    backgroundColor: '#E53935', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
    shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  callNowBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  menuTitle: { fontSize: 16, fontWeight: 'bold', color: '#6B6B80', marginTop: 10, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  menuItem: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 20, borderRadius: 14, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  menuItemText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  menuItemArrow: { color: '#6B6B80', fontSize: 20, fontWeight: 'bold' },
  centerContainer: { flex: 1, backgroundColor: '#0A0A0F', justifyContent: 'center', alignItems: 'center', padding: 24 },
  mockTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginTop: 16, marginBottom: 8 },
  mockSubtitle: { fontSize: 14, color: '#A0A0B8', textAlign: 'center', lineHeight: 20 },
  customHeader: {
    flexDirection: 'row',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 44,
    height: Platform.OS === 'android' ? 56 + (StatusBar.currentHeight || 0) + 12 : 56 + 44,
    backgroundColor: 'rgba(28, 28, 46, 0.9)',
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  drivingModeCircle: {
    width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, marginVertical: 16, alignSelf: 'center',
  },
  circleActive: {
    backgroundColor: '#E53935', borderColor: '#E53935',
    shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 8,
  },
  circleInactive: { backgroundColor: 'rgba(229, 57, 53, 0.08)', borderColor: 'rgba(229, 57, 53, 0.4)' },
  circleStateText: { fontSize: 28, fontWeight: 'bold' },
  drivingModeStatusText: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginTop: 8, textAlign: 'center' },
  drivingModeActionText: { fontSize: 14, color: '#A0A0B8', marginTop: 4, textAlign: 'center' },
  customHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  headerIconBtn: { padding: 4 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  toggleRowLabel: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  toggleRowDesc: { fontSize: 12, color: '#A0A0B8', marginTop: 4 },
  });
  
    const drawerStyles = StyleSheet.create({
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, flexDirection: 'row' },
    backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)' },
    drawerContainer: {
      width: 290, height: '100%',
      backgroundColor: 'rgba(28, 28, 46, 0.95)',
      borderRightWidth: 1, borderRightColor: 'rgba(255, 255, 255, 0.06)',
      paddingTop: 40, paddingHorizontal: 16,
      shadowColor: '#000000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
    },
    drawerHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 24, paddingBottom: 12,
      borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    drawerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
    drawerScroll: { flex: 1 },
  });