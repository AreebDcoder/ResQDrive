import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import api from '../../api/axios';
import * as Location from 'expo-location';
import { dispatchEmergencyAlert } from '../../utils/emergencyFallback';
import { getSafeDeviceLocation } from '../../utils/location';
import { Ionicons } from '@expo/vector-icons';
import { logoutAction } from '../../store/slices/authSlice';
import { classifyMotionSeverity } from '../../config/motionSeverityConfig';
import { MultiModalFusionService } from '../../services/multiModalFusionService';
import { makeDirectPhoneCall } from '../../utils/directCall';
import { sensorSourceManager } from '../../services/sensorSourceManager';
import { CrashSoundDetectionService } from '../../services/crashSoundDetectionService';
import { FCMService } from '../../services/fcmService';
import type { AppNavigation } from '../../navigation/types';
import { colors, darkColors, tints, spacing, radius, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import IncidentsListScreen from '../IncidentsListScreen';
import DamageAssessmentScreen from '../DamageAssessmentScreen';
import HospitalsScreen from '../HospitalsScreen';
import WorkshopsScreen from '../WorkshopsScreen';
import SOSScreen from '../SOSScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(300, SCREEN_WIDTH * 0.8);
const FALLBACK_LAT = 33.6844;
const FALLBACK_LNG = 73.0479;

// ─── Live Telemetry Widget ────────────────────────────────────────────────────
const LiveTelemetryWidget = React.memo(function LiveTelemetryWidget({ drivingModeEnabled }: { drivingModeEnabled?: boolean }) {
  const { activeSource, latestReading } = useSelector((state: RootState) => state.sensor);
  return (
    <View style={styles.dashboardCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <Ionicons name="pulse-outline" size={20} color={colors.danger[500]} style={{ marginRight: spacing.sm }} />
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
            <Text style={styles.telemetryLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>G-Force:</Text>
            <Text style={styles.telemetryValue} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              {latestReading ? `${latestReading.accelG.toFixed(3)} G` : '1.000 G'}
            </Text>
          </View>
          <View style={styles.telemetryRow}>
            <Text style={styles.telemetryLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Rotation:</Text>
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

// ─── Driver Dashboard (the Home tab content) ──────────────────────────────────
function DriverDashboard({ navigation, onOpenDrawer }: { navigation: AppNavigation; onOpenDrawer: () => void }) {
  const dispatch = useDispatch();
  const vehicles = useSelector((state: RootState) => state.vehicles.list);
  const contacts = useSelector((state: RootState) => state.contacts.list);
  const { preferences } = useSelector((state: RootState) => state.notifications);
  const connectionStatus = useSelector((state: RootState) => state.sensor.connectionStatus);
  const [isUpdatingPref, setIsUpdatingPref] = useState(false);

  const activeVehicle = vehicles.find((v) => v.isPrimary);
  const primaryContact = contacts.find((c) => c.priorityOrder === 1);

  useEffect(() => {
    const syncData = async () => {
      try {
        const vRes = await api.get('/vehicles');
        dispatch({ type: 'vehicles/fetchVehiclesSuccess', payload: vRes.data });
        const cRes = await api.get('/emergency-contacts');
        dispatch({ type: 'contacts/fetchContactsSuccess', payload: cRes.data });
      } catch (err) {}
    };
    syncData();

    const fetchPrefs = async () => {
      try {
        const response = await api.get('/notifications/preferences');
        dispatch({ type: 'notifications/fetchPreferencesSuccess', payload: response.data });
      } catch (err) {}
    };
    if (!preferences) fetchPrefs();

    FCMService.registerDeviceWithBackend();
    const unsubscribe = FCMService.setupFCMListeners();
    return unsubscribe;
  }, [dispatch]);

  useEffect(() => {
    MultiModalFusionService.subscribeToConfirmedAccidents(async (trigger) => {
      const loc = await getSafeDeviceLocation();
      const lat = loc?.latitude ?? FALLBACK_LAT;
      const lng = loc?.longitude ?? FALLBACK_LNG;
      navigation.navigate('Countdown', {
        latitude: lat, longitude: lng,
        severity: trigger.combinedSeverity,
        countdownSeconds: trigger.combinedSeverity === 'Severe' ? 10 : 20,
      });
    });

    CrashSoundDetectionService.subscribeToCrashEvents((confidence, topClass) => {
      MultiModalFusionService.recordSoundEvent(confidence, topClass);
    });

    if (preferences?.drivingModeEnabled) {
      CrashSoundDetectionService.startMonitoring();
    } else {
      CrashSoundDetectionService.stopMonitoring();
    }
    return () => { CrashSoundDetectionService.stopMonitoring(); };
  }, [preferences?.drivingModeEnabled]);

  useEffect(() => {
    if (preferences?.drivingModeEnabled) {
      sensorSourceManager.onSensorEvent((reading) => {
        const severity = reading.motionSeverity || classifyMotionSeverity(reading.accelG, reading.gyroDegPerSec);
        if (severity === 'severe' || severity === 'moderate') {
          MultiModalFusionService.recordMotionEvent(
            severity, reading.accelG, reading.gyroDegPerSec,
            reading.mlClassifiedSeverity, reading.mlConfidence
          );
        }
      });
      sensorSourceManager.start();
    } else {
      sensorSourceManager.stop();
    }
    return () => { sensorSourceManager.stop(); };
  }, [preferences?.drivingModeEnabled]);

  const handleQuickCall = () => {
    if (primaryContact) makeDirectPhoneCall(primaryContact.phoneNumber);
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
      dispatch({ type: 'notifications/updatePreferenceOptimistic', payload: { [key]: currentValue } });
    } finally {
      setIsUpdatingPref(false);
    }
  };

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
      {/* Top Bar with Burger Menu */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onOpenDrawer} style={styles.menuBtn} accessibilityRole="button" accessibilityLabel="Open menu">
          <Ionicons name="menu" size={26} color={darkColors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
          ResQ<Text style={{ color: colors.danger[500] }}>Drive</Text>
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* BLE Status Badge */}
      <View style={styles.bleBadgeRow}>
        <Ionicons
          name={connectionStatus === 'connected' ? 'bluetooth' : 'bluetooth-outline'}
          size={16}
          color={connectionStatus === 'connected' ? colors.success[500] : darkColors.textTertiary}
        />
        <Text style={styles.bleBadgeText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
          {connectionStatus === 'connected' ? 'BLE Sensor Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'BLE Disconnected'}
        </Text>
      </View>

      {/* Paired Vehicle Widget */}
      <View style={styles.dashboardCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
          <Ionicons name="car-outline" size={20} color={colors.danger[500]} style={{ marginRight: spacing.sm }} />
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
            <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => navigation.navigate('MyVehicles')} accessibilityRole="button">
              <Ionicons name="add" size={16} color={darkColors.text} style={{ marginRight: spacing.xs }} />
              <Text style={styles.actionBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Add Vehicle</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Emergency Contact Quick Access */}
      <View style={styles.dashboardCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.danger[500]} style={{ marginRight: spacing.sm }} />
          <Text style={styles.cardHeaderTitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Quick-Access Contact</Text>
        </View>
        {primaryContact ? (
          <View style={styles.contactDetailsBlock}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={styles.contactDisplayName} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{primaryContact.name}</Text>
              <Text style={styles.contactDisplaySub} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
                {primaryContact.relationship} • {primaryContact.phoneNumber}
              </Text>
            </View>
            <TouchableOpacity style={styles.callNowBtn} onPress={handleQuickCall} accessibilityRole="button">
              <Ionicons name="call" size={14} color={darkColors.text} style={{ marginRight: spacing.xs }} />
              <Text style={styles.callNowBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>CALL</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.vehicleDetailsBlock}>
            <Text style={styles.noVehicleText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>No emergency contacts registered.</Text>
            <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => navigation.navigate('EmergencyContacts')} accessibilityRole="button">
              <Ionicons name="add" size={16} color={darkColors.text} style={{ marginRight: spacing.xs }} />
              <Text style={styles.actionBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Add Contact</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Live Telemetry */}
      <LiveTelemetryWidget drivingModeEnabled={preferences?.drivingModeEnabled} />

      {/* Driving Mode Toggle */}
      <View style={[styles.dashboardCard, { alignItems: 'center' }]}>
        <TouchableOpacity
          onPress={handleToggleDrivingMode}
          disabled={isUpdatingPref || !preferences}
          style={[
            styles.drivingModeCircle,
            preferences?.drivingModeEnabled ? styles.circleActive : styles.circleInactive,
          ]}
          activeOpacity={0.8}
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="power" size={48} color={preferences?.drivingModeEnabled ? darkColors.text : colors.danger[700]} />
        </TouchableOpacity>
        <Text style={styles.drivingModeStatusText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Driving Mode</Text>
        <Text style={styles.drivingModeActionText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
          {preferences?.drivingModeEnabled ? 'On' : 'Off'}
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Native Slide-in Drawer ───────────────────────────────────────────────────
function SlideDrawer({
  isOpen,
  onClose,
  navigation,
}: {
  isOpen: boolean;
  onClose: () => void;
  navigation: AppNavigation;
}) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const { theme, toggleTheme } = useTheme();
  const animX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    Animated.timing(animX, {
      toValue: isOpen ? 0 : -DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  if (!isOpen) return null;

  const drawerItems = [
    { label: 'My Profile', icon: 'person-outline', route: 'Profile' },
    { label: 'My Vehicles', icon: 'car-outline', route: 'MyVehicles' },
    { label: 'Emergency Contacts', icon: 'people-outline', route: 'EmergencyContacts' },
    { label: 'Emergency Alert', icon: 'warning-outline', route: 'EmergencyNotification' },
    { label: 'Send SOS', icon: 'alert-circle-outline', route: 'SOS' },
    { label: 'Notification History', icon: 'notifications-outline', route: 'NotificationHistory' },
    { label: 'Preferences', icon: 'settings-outline', route: 'NotificationPreferences' },
  ];

  const handleNav = (route: string) => {
    onClose();
    (navigation as any).navigate(route);
  };

  const handleLogout = () => {
    onClose();
    dispatch(logoutAction());
  };

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Dimmed Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Slide-in Panel */}
      <Animated.View style={[styles.drawerPanel, { transform: [{ translateX: animX }] }]}>
        {/* User Header */}
        <View style={styles.drawerHeader}>
          <View style={styles.drawerAvatar}>
            <Ionicons name="person" size={28} color={colors.danger[500]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.drawerUserName} allowFontScaling={true} maxFontSizeMultiplier={1.5} numberOfLines={1}>
              {user?.fullName || 'Driver'}
            </Text>
            <Text style={styles.drawerUserRole} allowFontScaling={true} maxFontSizeMultiplier={1.5} numberOfLines={1}>
              {user?.phoneNumber || ''}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={22} color={darkColors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {drawerItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.drawerItem}
              onPress={() => handleNav(item.route)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Ionicons name={item.icon as any} size={22} color={darkColors.textSecondary} style={{ marginRight: spacing.md }} />
              <Text style={styles.drawerItemText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={darkColors.textTertiary} />
            </TouchableOpacity>
          ))}

          {/* Theme Toggle */}
          <TouchableOpacity
            style={styles.drawerItem}
            onPress={toggleTheme}
            accessibilityRole="button"
            accessibilityLabel="Toggle theme"
          >
            <Ionicons name={theme === 'dark' ? 'moon-outline' : 'sunny-outline'} size={22} color={darkColors.textSecondary} style={{ marginRight: spacing.md }} />
            <Text style={styles.drawerItemText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Text>
          </TouchableOpacity>

          {/* Dev Tools */}
          {__DEV__ && (
            <>
              <View style={styles.drawerDivider} />
              <Text style={styles.drawerSectionLabel} allowFontScaling={true} maxFontSizeMultiplier={1.5}>DEV TOOLS</Text>
              <TouchableOpacity style={styles.drawerItem} onPress={() => handleNav('CrashSoundDemo')} accessibilityRole="button">
                <Ionicons name="mic-outline" size={22} color={colors.warning[500]} style={{ marginRight: spacing.md }} />
                <Text style={styles.drawerItemText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Sound Detection</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.drawerItem} onPress={() => handleNav('BleSensorDemo')} accessibilityRole="button">
                <Ionicons name="bluetooth-outline" size={22} color={colors.warning[500]} style={{ marginRight: spacing.md }} />
                <Text style={styles.drawerItemText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>BLE Diagnostics</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.drawerItem} onPress={() => handleNav('VoiceCommandDemo')} accessibilityRole="button">
                <Ionicons name="volume-high-outline" size={22} color={colors.warning[500]} style={{ marginRight: spacing.md }} />
                <Text style={styles.drawerItemText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Voice Commands</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        {/* Logout */}
        <View style={styles.drawerFooter}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} accessibilityRole="button" accessibilityLabel="Logout">
            <Ionicons name="log-out-outline" size={22} color={colors.danger[500]} style={{ marginRight: spacing.md }} />
            <Text style={styles.logoutBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Bottom Tab Navigator ─────────────────────────────────────────────────────
const Tab = createBottomTabNavigator();

export default function DriverNavigator({ navigation }: { navigation: AppNavigation }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: darkColors.surface,
            borderTopColor: darkColors.border,
            borderTopWidth: 1,
            paddingBottom: 4,
            height: 60,
          },
          tabBarActiveTintColor: colors.danger[500],
          tabBarInactiveTintColor: darkColors.textTertiary,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tab.Screen
          name="HomeTab"
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
            tabBarLabel: 'Home',
          }}
        >
          {() => <DriverDashboard navigation={navigation} onOpenDrawer={() => setDrawerOpen(true)} />}
        </Tab.Screen>
        <Tab.Screen
          name="AlertsTab"
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="warning" size={size} color={color} />,
            tabBarLabel: 'Alerts',
          }}
        >
          {() => <IncidentsListScreen navigation={navigation} />}
        </Tab.Screen>
        <Tab.Screen
          name="DamageTab"
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="construct" size={size} color={color} />,
            tabBarLabel: 'Damage',
          }}
        >
          {() => <DamageAssessmentScreen navigation={navigation} isInline={true} />}
        </Tab.Screen>
        <Tab.Screen
          name="HospitalsTab"
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="medical" size={size} color={color} />,
            tabBarLabel: 'Hospitals',
          }}
        >
          {() => <HospitalsScreen navigation={navigation} isInline={true} />}
        </Tab.Screen>
        <Tab.Screen
          name="WorkshopsTab"
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="build" size={size} color={color} />,
            tabBarLabel: 'Workshops',
          }}
        >
          {() => <WorkshopsScreen navigation={navigation} isInline={true} />}
        </Tab.Screen>
      </Tab.Navigator>

      {/* Native Slide Drawer Overlay */}
      <SlideDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigation={navigation}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: darkColors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 16,
    paddingBottom: spacing.sm,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: tints.glassCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tints.whiteBorder,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: darkColors.text,
    letterSpacing: 0.5,
  },
  dashboardCard: {
    backgroundColor: tints.glassCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
  },
  cardHeaderTitle: { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.bold, color: darkColors.text },
  vehicleDetailsBlock: { flexDirection: 'column', gap: spacing.sm },
  activeVehicleName: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: darkColors.text },
  activePlateBadge: { backgroundColor: colors.danger[500], paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm, alignSelf: 'flex-start', marginTop: spacing.xs },
  activePlateText: { color: darkColors.text, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, letterSpacing: 1 },
  noVehicleText: { fontSize: typography.fontSize.sm, color: darkColors.textSecondary, marginBottom: spacing.sm },
  actionBtnSecondary: { flexDirection: 'row', alignItems: 'center', backgroundColor: tints.whiteSubtle, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, alignSelf: 'flex-start' },
  actionBtnText: { color: darkColors.text, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium },
  contactDetailsBlock: { flexDirection: 'row', alignItems: 'center' },
  contactDisplayName: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: darkColors.text },
  contactDisplaySub: { fontSize: typography.fontSize.xs, color: darkColors.textSecondary, marginTop: 2 },
  callNowBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.success[600], paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  callNowBtnText: { color: darkColors.text, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold },
  telemetryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  telemetryLabel: { fontSize: typography.fontSize.sm, color: darkColors.textSecondary },
  telemetryValueBold: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: darkColors.text },
  telemetryValue: { fontSize: typography.fontSize.sm, color: darkColors.text },
  drivingModeCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  circleActive: { backgroundColor: colors.danger[500], shadowColor: colors.danger[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4 },
  circleInactive: { backgroundColor: tints.whiteSubtle, borderWidth: 2, borderColor: colors.danger[700] },
  drivingModeStatusText: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: darkColors.text, marginBottom: 2 },
  drivingModeActionText: { fontSize: typography.fontSize.md, color: darkColors.textSecondary },
  bleBadgeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.xs },
  bleBadgeText: { fontSize: typography.fontSize.xs, color: darkColors.textTertiary },
  // Native Drawer styles
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 998,
  },
  drawerPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: darkColors.surface,
    zIndex: 999,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 48,
    paddingBottom: spacing.lg,
    backgroundColor: tints.glassCard,
    borderBottomWidth: 1,
    borderBottomColor: darkColors.border,
  },
  drawerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: tints.dangerSubtle, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  drawerUserName: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: darkColors.text },
  drawerUserRole: { fontSize: typography.fontSize.xs, color: darkColors.textSecondary, marginTop: 2 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  drawerItemText: { flex: 1, fontSize: typography.fontSize.md, color: darkColors.text, fontWeight: typography.fontWeight.medium },
  drawerDivider: { height: 1, backgroundColor: darkColors.border, marginVertical: spacing.sm, marginHorizontal: spacing.lg },
  drawerSectionLabel: { fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: darkColors.textTertiary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, letterSpacing: 1 },
  drawerFooter: { borderTopWidth: 1, borderTopColor: darkColors.border, padding: spacing.lg, paddingBottom: Platform.OS === 'android' ? 24 : 36 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  logoutBtnText: { fontSize: typography.fontSize.md, color: colors.danger[500], fontWeight: typography.fontWeight.semibold },
});