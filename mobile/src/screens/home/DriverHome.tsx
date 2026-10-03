import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Switch, Platform, StatusBar } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import api from '../../api/axios';
import * as Location from 'expo-location';
import { dispatchEmergencyAlert } from '../../utils/emergencyFallback';
import { getSafeDeviceLocation } from '../../utils/location';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { logoutAction, setTokens } from '../../store/slices/authSlice';
import { classifyMotionSeverity } from '../../config/motionSeverityConfig';
import { MultiModalFusionService } from '../../services/multiModalFusionService';
import DevModeBanner from '../../components/DevModeBanner';
import { makeDirectPhoneCall } from '../../utils/directCall';
import { sensorSourceManager } from '../../services/sensorSourceManager';
import { CrashSoundDetectionService } from '../../services/crashSoundDetectionService';
import { FCMService } from '../../services/fcmService';
import HospitalsScreen from '../../screens/HospitalsScreen';
import WorkshopsScreen from '../../screens/WorkshopsScreen';
import SOSScreen from '../../screens/SOSScreen';
import DamageAssessmentScreen from '../../screens/DamageAssessmentScreen';
import type { AppNavigation } from '../../navigation/types';
import { colors, darkColors, tints } from '../../theme/tokens';

// Fallback GPS coordinates (Islamabad) — used when user denies location permission
const FALLBACK_LAT = 33.6844;
const FALLBACK_LNG = 73.0479;

// do NOT trigger re-renders of DriverHome and its active tabs (Damage Assessment, Services, etc.)
const LiveTelemetryWidget = React.memo(function LiveTelemetryWidget({ drivingModeEnabled }: { drivingModeEnabled?: boolean }) {
  const { activeSource, latestReading } = useSelector((state: RootState) => state.sensor);

  return (
    <View style={styles.dashboardCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Ionicons name="pulse-outline" size={20} color={colors.danger[500]} style={{ marginRight: 8 }} />
        <Text style={styles.cardHeaderTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Live Telemetry</Text>
      </View>
      {drivingModeEnabled ? (
        <View>
          <View style={styles.telemetryRow}>
            <Text style={styles.telemetryLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Source:</Text>
            <Text style={styles.telemetryValueBold} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              {activeSource === 'ble' ? 'BLE Hardware' : 'Phone Sensors'}
            </Text>
          </View>
          <View style={styles.telemetryRow}>
            <Text style={styles.telemetryLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>G-Force Magnitude:</Text>
            <Text style={styles.telemetryValue} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              {latestReading ? `${latestReading.accelG.toFixed(3)} G` : '1.000 G'}
            </Text>
          </View>
          <View style={styles.telemetryRow}>
            <Text style={styles.telemetryLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Rotation Speed:</Text>
            <Text style={styles.telemetryValue} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              {latestReading ? `${latestReading.gyroDegPerSec.toFixed(1)} °/s` : '0.0 °/s'}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.noVehicleText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
          Telemetry inactive. Turn on Driving Mode to view live sensors.
        </Text>
      )}
    </View>
  );
});

export default function DriverHome({ navigation }: { navigation: AppNavigation }) {
  const dispatch = useDispatch();
  const vehicles = useSelector((state: RootState) => state.vehicles.list);
  const contacts = useSelector((state: RootState) => state.contacts.list);

  const activeVehicle = vehicles.find((v) => v.isPrimary);
  const primaryContact = contacts.find((c) => c.priorityOrder === 1);

  const [activeTab, setActiveTab] = React.useState<'home' | 'alert' | 'damage' | 'services' | 'parts' | 'voice'>('home');
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const { preferences } = useSelector((state: RootState) => state.notifications);
  const connectionStatus = useSelector((state: RootState) => state.sensor.connectionStatus);
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
      }
    };
    
    syncData();

    // Fetch preferences to get driving mode indicator state
    const fetchPrefs = async () => {
      try {
        const response = await api.get('/notifications/preferences');
        dispatch({ type: 'notifications/fetchPreferencesSuccess', payload: response.data });
      } catch (err) {
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
    MultiModalFusionService.subscribeToConfirmedAccidents(async (trigger) => {

      const loc = await getSafeDeviceLocation();
      const lat = loc?.latitude ?? FALLBACK_LAT;
      const lng = loc?.longitude ?? FALLBACK_LNG;

      navigation.navigate('Countdown', {
        latitude: lat,
        longitude: lng,
        severity: trigger.combinedSeverity,
        countdownSeconds: trigger.combinedSeverity === 'Severe' ? 10 : 20,
      });
    });

    // 2. Feed YAMNet acoustic crash events into MultiModalFusionService
    CrashSoundDetectionService.subscribeToCrashEvents((confidence, topClass) => {
      MultiModalFusionService.recordSoundEvent(confidence, topClass);
    });

    if (preferences?.drivingModeEnabled) {
      CrashSoundDetectionService.startMonitoring();
    } else {
      CrashSoundDetectionService.stopMonitoring();
    }

    return () => {
      CrashSoundDetectionService.stopMonitoring();
    };
  }, [preferences?.drivingModeEnabled]);

  React.useEffect(() => {
    if (preferences?.drivingModeEnabled) {

      // 3. Feed Accelerometer/Gyroscope motion events into MultiModalFusionService
      sensorSourceManager.onSensorEvent((reading) => {
        const severity = reading.motionSeverity || classifyMotionSeverity(reading.accelG, reading.gyroDegPerSec);

        if (severity === 'severe' || severity === 'moderate') {
          const mlLog = reading.mlClassifiedSeverity ? ` | ML Prediction: ${reading.mlClassifiedSeverity.toUpperCase()} (${((reading.mlConfidence || 0) * 100).toFixed(1)}%)` : '';
          MultiModalFusionService.recordMotionEvent(
            severity,
            reading.accelG,
            reading.gyroDegPerSec,
            reading.mlClassifiedSeverity,
            reading.mlConfidence
          );
        } else if (severity === 'minor') {
          const mlLog = reading.mlClassifiedSeverity ? ` | ML Prediction: ${reading.mlClassifiedSeverity.toUpperCase()} (${((reading.mlConfidence || 0) * 100).toFixed(1)}%)` : '';
        }
      });

      sensorSourceManager.start();
    } else {
      sensorSourceManager.stop();
    }

    return () => {
      sensorSourceManager.stop();
    };
  }, [preferences?.drivingModeEnabled]);

  const handleQuickCall = () => {
    if (primaryContact) {
      makeDirectPhoneCall(primaryContact.phoneNumber);
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
    const loc = await getSafeDeviceLocation();
    const lat = loc?.latitude ?? FALLBACK_LAT;
    const lng = loc?.longitude ?? FALLBACK_LNG;

    const result = await dispatchEmergencyAlert(
      [{ name: 'Test Contact', phoneNumber: '+0000000000' }], // TODO: Remove test function before production
      {
        userName: 'Test User', // TODO: Remove test function before production
        userPhone: '+0000000000', // TODO: Remove test function before production
        severity: 'Moderate',
        latitude: lat,
        longitude: lng,
      },
      async () => {
        throw new Error('Simulating online dispatch not implemented yet');
      },
    );

    alert(`Fallback test result: ${result.mode}`);
  };

  const triggerRealEmergencyDispatch = async () => {
    try {
      const loc = await getSafeDeviceLocation();
      const lat = loc?.latitude ?? FALLBACK_LAT;
      const lng = loc?.longitude ?? FALLBACK_LNG;

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
          latitude: lat,
          longitude: lng,
        },
        async () => {
          await api.post('/alert-dispatch', {
            userId: currentUser.id,
            userName: currentUser.fullName,
            latitude: lat,
            longitude: lng,
            severity: 'Moderate',
            contacts: dispatchContacts,
          });
        },
      );

      alert(`Emergency alert sent via: ${result.mode}`);
    } catch (err: any) {
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
          {__DEV__ && <DevModeBanner />}
            {/* Paired Vehicle Widget */}
            <View style={styles.dashboardCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="car-outline" size={20} color={colors.danger[500]} style={{ marginRight: 8 }} />
                <Text style={styles.cardHeaderTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Paired Vehicle</Text>
              </View>
              {activeVehicle ? (
                <View style={styles.vehicleDetailsBlock}>
                  <Text style={styles.activeVehicleName} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                    {activeVehicle.make} {activeVehicle.model} ({activeVehicle.year})
                  </Text>
                  <View style={styles.activePlateBadge}>
                    <Text style={styles.activePlateText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{activeVehicle.licensePlate.toUpperCase()}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.vehicleDetailsBlock}>
                  <Text style={styles.noVehicleText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>No active vehicle paired for crash detection.</Text>
                  <TouchableOpacity
                    style={styles.actionBtnSecondary}
                    onPress={() => navigation.navigate('MyVehicles')} accessibilityRole="button"
                  >
                    <Ionicons name="add" size={16} color={darkColors.text} style={{ marginRight: 4 }} />
                    <Text style={styles.actionBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Add Vehicle</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Emergency Contact Quick Access Widget */}
            <View style={styles.dashboardCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.danger[500]} style={{ marginRight: 8 }} />
                <Text style={styles.cardHeaderTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Quick-Access Contact</Text>
              </View>
              {primaryContact ? (
                <View style={styles.contactDetailsBlock}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.contactDisplayName} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{primaryContact.name}</Text>
                    <Text style={styles.contactDisplaySub} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                      {primaryContact.relationship} • {primaryContact.phoneNumber}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.callNowBtn} onPress={handleQuickCall} accessibilityRole="button">
                    <Ionicons name="call" size={14} color={darkColors.text} style={{ marginRight: 4 }} />
                    <Text style={styles.callNowBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>CALL</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.vehicleDetailsBlock}>
                  <Text style={styles.noVehicleText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>No emergency contacts registered.</Text>
                  <TouchableOpacity
                    style={styles.actionBtnSecondary}
                    onPress={() => navigation.navigate('EmergencyContacts')} accessibilityRole="button"
                  >
                    <Ionicons name="add" size={16} color={darkColors.text} style={{ marginRight: 4 }} />
                    <Text style={styles.actionBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Add Contact</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Live Telemetry Widget (Isolated subscription to prevent full dashboard re-renders at 5Hz) */}
            <LiveTelemetryWidget drivingModeEnabled={preferences?.drivingModeEnabled} />

            {/* Driving Mode Preference Toggle Widget */}
            <View style={[styles.dashboardCard, { alignItems: 'center' }]}>
              <TouchableOpacity
                onPress={handleToggleDrivingMode}
                disabled={isUpdatingPref || !preferences}
                style={[
                  styles.drivingModeCircle,
                  (preferences?.drivingModeEnabled) ? styles.circleActive : styles.circleInactive
                ]}
                activeOpacity={0.8} accessibilityRole="button"
               hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons
                  name="power"
                  size={48}
                  color={(preferences?.drivingModeEnabled) ? darkColors.text : colors.danger[700]}
                />
              </TouchableOpacity>

              <Text style={styles.drivingModeStatusText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                Driving Mode
              </Text>
              <Text style={styles.drivingModeActionText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                {(preferences?.drivingModeEnabled) ? 'On' : 'Off'}
              </Text>
            </View>
          </ScrollView>
        );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: darkColors.surface }}>
      {/* Header */}
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => setIsDrawerOpen(true)} accessibilityRole="button" accessibilityLabel="Menu" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="menu" size={28} color={darkColors.text} />
        </TouchableOpacity>
        <Text style={styles.customHeaderTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>ResQDrive</Text>
        {__DEV__ ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('BleSensorDemo')}
            style={{ padding: 4 }} accessibilityRole="button"
           hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons
              name={connectionStatus === 'connected' ? 'bluetooth' : 'bluetooth-outline'}
              size={24}
              color={
                connectionStatus === 'connected'
                  ? colors.success[500]
                  : connectionStatus === 'connecting'
                  ? colors.warning[500]
                  : darkColors.textTertiary
              }
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons
              name={connectionStatus === 'connected' ? 'bluetooth' : 'bluetooth-outline'}
              size={24}
              color={
                connectionStatus === 'connected'
                  ? colors.success[500]
                  : connectionStatus === 'connecting'
                  ? colors.warning[500]
                  : darkColors.textTertiary
              }
            />
          </View>
        )}
      </View>

      {/* Main Content Area */}
      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>

      {/* Bottom Tabs */}
      <View style={tabStyles.tabBar}>
        <TouchableOpacity style={tabStyles.tabItem} onPress={() => handleTabPress('home')} accessibilityRole="button">
          {activeTab === 'home' && <View style={tabStyles.activeIndicator} />}
          <Ionicons name={activeTab === 'home' ? "home" : "home-outline"} size={22} color={activeTab === 'home' ? colors.danger[600] : darkColors.textTertiary} />
          <Text style={[tabStyles.tabLabel, activeTab === 'home' && tabStyles.activeTabLabel]} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={tabStyles.tabItem} onPress={() => handleTabPress('alert')} accessibilityRole="button">
          {activeTab === 'alert' && <View style={tabStyles.activeIndicator} />}
          <Ionicons name={activeTab === 'alert' ? "warning" : "warning-outline"} size={22} color={activeTab === 'alert' ? colors.danger[600] : darkColors.textTertiary} />
          <Text style={[tabStyles.tabLabel, activeTab === 'alert' && tabStyles.activeTabLabel]} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Alert</Text>
        </TouchableOpacity>

        <TouchableOpacity style={tabStyles.tabItem} onPress={() => handleTabPress('damage')} accessibilityRole="button">
          {activeTab === 'damage' && <View style={tabStyles.activeIndicator} />}
          <Ionicons name={activeTab === 'damage' ? "camera" : "camera-outline"} size={22} color={activeTab === 'damage' ? colors.danger[600] : darkColors.textTertiary} />
          <Text style={[tabStyles.tabLabel, activeTab === 'damage' && tabStyles.activeTabLabel]} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Damage</Text>
        </TouchableOpacity>

        <TouchableOpacity style={tabStyles.tabItem} onPress={() => handleTabPress('services')} accessibilityRole="button">
          {activeTab === 'services' && <View style={tabStyles.activeIndicator} />}
          <Ionicons name={activeTab === 'services' ? "location" : "location-outline"} size={22} color={activeTab === 'services' ? colors.danger[600] : darkColors.textTertiary} />
          <Text style={[tabStyles.tabLabel, activeTab === 'services' && tabStyles.activeTabLabel]} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Hospital</Text>
        </TouchableOpacity>

        <TouchableOpacity style={tabStyles.tabItem} onPress={() => handleTabPress('parts')} accessibilityRole="button">
          {activeTab === 'parts' && <View style={tabStyles.activeIndicator} />}
          <MaterialCommunityIcons name={activeTab === 'parts' ? "wrench" : "wrench-outline"} size={22} color={activeTab === 'parts' ? colors.danger[600] : darkColors.textTertiary} />
          <Text style={[tabStyles.tabLabel, activeTab === 'parts' && tabStyles.activeTabLabel]} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Workshop</Text>
        </TouchableOpacity>
      </View>

      {/* Sidebar Drawer Modal Overlay */}
      {isDrawerOpen && (
        <View style={drawerStyles.overlay}>
          <TouchableOpacity style={drawerStyles.backdrop} activeOpacity={1} onPress={() => setIsDrawerOpen(false)} accessibilityRole="button" />
          <View style={drawerStyles.drawerContainer}>
            <View style={drawerStyles.drawerHeader}>
              <Text style={drawerStyles.drawerTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Menu Options</Text>
              <TouchableOpacity onPress={() => setIsDrawerOpen(false)} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close-outline" size={24} color={darkColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={drawerStyles.drawerScroll} contentContainerStyle={{ paddingBottom: 40 }}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('MyVehicles');
                }} accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="car-outline" size={20} color={colors.danger[500]} style={{ marginRight: 12 }} />
                  <Text style={styles.menuItemText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>My Vehicles</Text>
                </View>
                <Text style={styles.menuItemArrow} allowFontScaling={true} maxFontSizeMultiplier={1.5}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('EmergencyContacts');
                }} accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="call-outline" size={20} color={colors.danger[500]} style={{ marginRight: 12 }} />
                  <Text style={styles.menuItemText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Emergency Contacts</Text>
                </View>
                <Text style={styles.menuItemArrow} allowFontScaling={true} maxFontSizeMultiplier={1.5}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('NotificationHistory');
                }} accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="notifications-outline" size={20} color={colors.danger[500]} style={{ marginRight: 12 }} />
                  <Text style={styles.menuItemText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Notification History</Text>
                </View>
                <Text style={styles.menuItemArrow} allowFontScaling={true} maxFontSizeMultiplier={1.5}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('NotificationPreferences');
                }} accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="settings-outline" size={20} color={colors.danger[500]} style={{ marginRight: 12 }} />
                  <Text style={styles.menuItemText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Notification Preferences</Text>
                </View>
                <Text style={styles.menuItemArrow} allowFontScaling={true} maxFontSizeMultiplier={1.5}>›</Text>
              </TouchableOpacity>

              {__DEV__ && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setIsDrawerOpen(false);
                    navigation.navigate('CrashSoundDemo');
                  }} accessibilityRole="button"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="mic-outline" size={20} color={colors.danger[500]} style={{ marginRight: 12 }} />
                    <Text style={styles.menuItemText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Crash Sound Detection</Text>
                  </View>
                  <Text style={styles.menuItemArrow} allowFontScaling={true} maxFontSizeMultiplier={1.5}>›</Text>
                </TouchableOpacity>
              )}

              {__DEV__ && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setIsDrawerOpen(false);
                    navigation.navigate('BleSensorDemo');
                  }} accessibilityRole="button"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="bluetooth-outline" size={20} color={colors.danger[500]} style={{ marginRight: 12 }} />
                    <Text style={styles.menuItemText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>BLE Sensor Diagnostics</Text>
                  </View>
                  <Text style={styles.menuItemArrow} allowFontScaling={true} maxFontSizeMultiplier={1.5}>›</Text>
                </TouchableOpacity>
              )}

              {__DEV__ && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setIsDrawerOpen(false);
                    navigation.navigate('VoiceCommandDemo');
                  }} accessibilityRole="button"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="volume-high-outline" size={20} color={colors.danger[500]} style={{ marginRight: 12 }} />
                    <Text style={styles.menuItemText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Voice Commands</Text>
                  </View>
                  <Text style={styles.menuItemArrow} allowFontScaling={true} maxFontSizeMultiplier={1.5}>›</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('Profile');
                }} accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="person-outline" size={20} color={colors.danger[500]} style={{ marginRight: 12 }} />
                  <Text style={styles.menuItemText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>My Profile Details</Text>
                </View>
                <Text style={styles.menuItemArrow} allowFontScaling={true} maxFontSizeMultiplier={1.5}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('IncidentsList');
                }} accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="document-text-outline" size={20} color={colors.danger[500]} style={{ marginRight: 12 }} />
                  <Text style={styles.menuItemText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Incident History</Text>
                </View>
                <Text style={styles.menuItemArrow} allowFontScaling={true} maxFontSizeMultiplier={1.5}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('LocationSharing');
                }} accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="location-outline" size={20} color={colors.danger[500]} style={{ marginRight: 12 }} />
                  <Text style={styles.menuItemText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Share Live Location</Text>
                </View>
                <Text style={styles.menuItemArrow} allowFontScaling={true} maxFontSizeMultiplier={1.5}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('EmergencyNotification');
                }} accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="warning-outline" size={20} color={colors.danger[500]} style={{ marginRight: 12 }} />
                  <Text style={styles.menuItemText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Emergency Alert</Text>
                </View>
                <Text style={styles.menuItemArrow} allowFontScaling={true} maxFontSizeMultiplier={1.5}>›</Text>
              </TouchableOpacity>

              {__DEV__ && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setIsDrawerOpen(false);
                    testEmergencyFallback();
                  }} accessibilityRole="button"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="flask-outline" size={18} color={darkColors.textTertiary} />
                    <Text style={styles.menuItemText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Test Emergency Fallback</Text>
                  </View>
                  <Text style={styles.menuItemArrow} allowFontScaling={true} maxFontSizeMultiplier={1.5}>›</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.menuItem, { borderColor: colors.danger[600], borderWidth: 1 }]}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate('SOS');
                }} accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Ionicons name="alert-circle-outline" size={18} color={colors.danger[600]} />
                  <Text style={[styles.menuItemText, { color: colors.danger[600], fontWeight: 'bold' }]} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Send Emergency Alert</Text>
                </View>
                <Text style={[styles.menuItemArrow, { color: colors.danger[600] }]} allowFontScaling={true} maxFontSizeMultiplier={1.5}>›</Text>
              </TouchableOpacity>


              {__DEV__ && (
                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: colors.danger[800] }]}
                  onPress={async () => {
                    setIsDrawerOpen(false);
                    let lat = FALLBACK_LAT;
                  let lng = FALLBACK_LNG;
                  try {
                    const loc = await Location.getLastKnownPositionAsync({});
                    if (loc?.coords) {
                      lat = loc.coords.latitude;
                      lng = loc.coords.longitude;
                    }
                  } catch (err) {}
                  
                  navigation.navigate('Countdown', {
                    latitude: lat,
                    longitude: lng,
                    severity: 'Moderate',
                  });
                }} accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Ionicons name="warning-outline" size={18} color={darkColors.text} />
                  <Text style={[styles.menuItemText, { color: darkColors.text }]} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Simulate Crash (Test Countdown)</Text>
                </View>
                <Text style={[styles.menuItemArrow, { color: darkColors.text }]} allowFontScaling={true} maxFontSizeMultiplier={1.5}>›</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: tints.glassCardStrong,
    borderTopWidth: 1,
    borderTopColor: tints.whiteBorder,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 5,
    shadowColor: colors.neutral[950],
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
    backgroundColor: colors.danger[500],
    borderRadius: 2,
  },
  tabLabel: { fontSize: 10, color: darkColors.textTertiary, marginTop: 4 },
  activeTabLabel: { color: colors.danger[500] },
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: darkColors.background, padding: 24 },
  scrollContainer: { flex: 1, backgroundColor: darkColors.background, padding: 16 },
  headerBlock: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: darkColors.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: darkColors.textSecondary, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.danger[500], marginBottom: 12 },
  scrollList: { flex: 1, marginBottom: 20 },
  approvalCard: {
    backgroundColor: tints.glassCard, borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: tints.whiteBorder,
    shadowColor: colors.neutral[950], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mechanicName: { fontSize: 16, fontWeight: 'bold', color: darkColors.text },
  specializationBadge: {
    backgroundColor: tints.dangerLight, color: colors.danger[300], fontSize: 11, fontWeight: 'bold',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: tints.dangerMedium,
  },
  cardInfo: { fontSize: 13, color: darkColors.textSecondary, marginBottom: 4 },
  approveBtn: {
    backgroundColor: colors.success[500], paddingVertical: 10, borderRadius: 14, alignItems: 'center', marginTop: 12,
    shadowColor: colors.success[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  approveBtnText: { color: darkColors.background, fontSize: 14, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginVertical: 40 },
  emptyText: { color: darkColors.textSecondary, fontSize: 15, textAlign: 'center' },
  errorText: { color: colors.danger[300], fontSize: 14, textAlign: 'center', marginVertical: 20 },
  navBtn: {
    backgroundColor: colors.danger[500], paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 10,
    shadowColor: colors.danger[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  navBtnText: { color: darkColors.text, fontSize: 16, fontWeight: 'bold' },
  dashboardCard: {
    backgroundColor: tints.glassCard, borderRadius: 20, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: tints.whiteBorder,
    shadowColor: colors.neutral[950], shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  telemetryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  telemetryLabel: { fontSize: 14, color: darkColors.textSecondary },
  telemetryValue: { fontSize: 14, color: darkColors.text },
  telemetryValueBold: { fontSize: 14, fontWeight: 'bold', color: colors.success[500] },
  cardHeaderTitle: { fontSize: 15, fontWeight: 'bold', color: colors.danger[500], marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  vehicleDetailsBlock: { flexDirection: 'column', alignItems: 'flex-start' },
  activeVehicleName: { fontSize: 18, fontWeight: 'bold', color: darkColors.text, marginBottom: 8 },
  activePlateBadge: {
    backgroundColor: tints.overlayStrong, borderWidth: 1, borderColor: tints.dangerMedium,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  activePlateText: { color: darkColors.text, fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  noVehicleText: { color: darkColors.textSecondary, fontSize: 14, marginBottom: 12 },
  actionBtnSecondary: {
    backgroundColor: tints.glassCard, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: tints.whiteBorder,
  },
  actionBtnText: { color: darkColors.text, fontSize: 12, fontWeight: 'bold' },
  contactDetailsBlock: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contactDisplayName: { fontSize: 18, fontWeight: 'bold', color: darkColors.text },
  contactDisplaySub: { fontSize: 13, color: darkColors.textSecondary, marginTop: 4 },
  callNowBtn: {
    backgroundColor: colors.danger[500], paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
    shadowColor: colors.danger[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  callNowBtnText: { color: darkColors.text, fontSize: 14, fontWeight: 'bold' },
  menuTitle: { fontSize: 16, fontWeight: 'bold', color: darkColors.textTertiary, marginTop: 10, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  menuItem: {
    backgroundColor: tints.glassCard, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 20, borderRadius: 14, marginBottom: 12,
    borderWidth: 1, borderColor: tints.whiteBorder,
    shadowColor: colors.neutral[950], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  menuItemText: { color: darkColors.text, fontSize: 16, fontWeight: '500' },
  menuItemArrow: { color: darkColors.textTertiary, fontSize: 20, fontWeight: 'bold' },
  centerContainer: { flex: 1, backgroundColor: darkColors.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  mockTitle: { fontSize: 22, fontWeight: 'bold', color: darkColors.text, marginTop: 16, marginBottom: 8 },
  mockSubtitle: { fontSize: 14, color: darkColors.textSecondary, textAlign: 'center', lineHeight: 20 },
  customHeader: {
    flexDirection: 'row',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 44,
    height: Platform.OS === 'android' ? 56 + (StatusBar.currentHeight || 0) + 12 : 56 + 44,
    backgroundColor: tints.glassCardStrong,
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: tints.whiteBorder,
    shadowColor: colors.neutral[950], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  drivingModeCircle: {
    width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, marginVertical: 16, alignSelf: 'center',
  },
  circleActive: {
    backgroundColor: colors.danger[500], borderColor: colors.danger[500],
    shadowColor: colors.danger[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 8,
  },
  circleInactive: { backgroundColor: tints.dangerSubtle, borderColor: tints.dangerMedium },
  circleStateText: { fontSize: 28, fontWeight: 'bold' },
  drivingModeStatusText: { fontSize: 20, fontWeight: 'bold', color: darkColors.text, marginTop: 8, textAlign: 'center' },
  drivingModeActionText: { fontSize: 14, color: darkColors.textSecondary, marginTop: 4, textAlign: 'center' },
  customHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: darkColors.text },
  headerIconBtn: { padding: 4 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  toggleRowLabel: { fontSize: 16, fontWeight: 'bold', color: darkColors.text },
  toggleRowDesc: { fontSize: 12, color: darkColors.textSecondary, marginTop: 4 },
  });

const drawerStyles = StyleSheet.create({
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, flexDirection: 'row' },
    backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: tints.overlayStrong },
    drawerContainer: {
      width: 290, height: '100%',
      backgroundColor: tints.glassCardStrong,
      borderRightWidth: 1, borderRightColor: tints.whiteBorder,
      paddingTop: 40, paddingHorizontal: 16,
      shadowColor: colors.neutral[950], shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
    },
    drawerHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 24, paddingBottom: 12,
      borderBottomWidth: 1, borderBottomColor: tints.whiteBorder,
    },
    drawerTitle: { fontSize: 18, fontWeight: 'bold', color: darkColors.text },
    drawerScroll: { flex: 1 },
  });
