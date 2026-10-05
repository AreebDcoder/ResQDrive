/**
 * Typed navigation params — replaces `navigation: any` across all screens.
 *
 * Usage in screens:
 *   import { RootStackParamList } from '@/navigation/types';
 *   type Props = { navigation: StackNavigationProp<RootStackParamList> };
 *
 * Usage with useNavigation:
 *   const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
 */
import type { StackNavigationProp } from '@react-navigation/stack';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  EmailVerification: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  Profile: undefined;
  Hospitals: undefined;
  Workshops: undefined;
  IncidentsList: undefined;
  IncidentDetail: { id?: string };
  CreateIncident: { mode?: 'create' | 'edit'; incidentId?: string };
  AdminDashboard: undefined;
  AdminEmergencyNumbers: undefined;
  LocationSharing: undefined;
  EmergencyNotification: undefined;
  SOS: undefined;
  MyVehicles: undefined;
  AddEditVehicle: { vehicleId?: string };
  VehicleInsurance: { vehicleId: string };
  EmergencyContacts: undefined;
  AddEditContact: { contactId?: string };
  NotificationPreferences: undefined;
  NotificationHistory: undefined;
  CrashSoundDemo: undefined;
  VoiceCommandDemo: undefined;
  DamageAssessment: undefined;
  RepairCost: undefined;
  Countdown: { latitude?: number; longitude?: number; severity?: string; countdownSeconds?: number; severityFeatures?: any };
  BleSensorDemo: undefined;
  SeverityDemo: undefined;
};

export type RootStackParamList = AuthStackParamList & AppStackParamList;

export type AppNavigation = StackNavigationProp<RootStackParamList>;
