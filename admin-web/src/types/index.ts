/**
 * Consolidated TypeScript types for the admin-web app.
 *
 * This file replaces src/types.ts (the old file). It keeps backwards-compatibility
 * by re-exporting the same names: User, Incident, AnalyticsSummary, AnalyticsTrend,
 * AnalyticsHotspot.
 *
 * New pages should import from '../types' (or '../types/index').
 */

// ─── Auth ──────────────────────────────────────────────────────────────────

export type UserRole = 'DRIVER' | 'ADMIN' | 'MECHANIC';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  profilePictureUrl?: string | null;
  pushToken?: string | null;
  driverDetails?: DriverDetails | null;
  mechanicDetails?: MechanicDetails | null;
}

export interface DriverDetails {
  userId: string;
  cnicNumber?: string | null;
  drivingLicenseNumber?: string | null;
}

export interface MechanicDetails {
  userId: string;
  workshopName?: string | null;
  workshopAddress?: string | null;
  workshopLatitude?: number | null;
  workshopLongitude?: number | null;
  specialization?: string | null;
  isWorkshopVerified: boolean;
}

// ─── Incidents ──────────────────────────────────────────────────────────────

export type IncidentType = 'AUTO' | 'MANUAL';
export type IncidentSeverity = 'NONE' | 'MINOR' | 'MODERATE' | 'SEVERE';
export type IncidentStatus = 'ACTIVE' | 'RESOLVED' | 'FALSE_ALARM' | 'ARCHIVED';

export interface Incident {
  id: string;
  userId: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  occurredAt: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  description?: string | null;
  sensorSnapshot?: any;
  alertDispatchStatus?: any;
  damageAssessmentResult?: any;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    role: string;
  };
}

// ─── Analytics ─────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  falseAlarms: number;
  severityBreakdown: {
    NONE: number;
    MINOR: number;
    MODERATE: number;
    SEVERE: number;
  };
  severityPercentages: {
    NONE: number;
    MINOR: number;
    MODERATE: number;
    SEVERE: number;
  };
  recentIncidents: Array<{
    id: string;
    occurredAt: string;
    severity: string;
    status: string;
    address?: string | null;
  }>;
}

export interface AnalyticsTrend {
  date: string;
  count: number;
}

export interface AnalyticsHotspot {
  latitude: number;
  longitude: number;
  incidentCount: number;
  sampleAddresses: string[];
}

// ─── Extended Dashboard (Batch 5) ──────────────────────────────────────────

export interface ExtendedDashboardSummary {
  users: { total: number; drivers: number; mechanics: number; vehicles: number };
  incidents: {
    total: number;
    active: number;
    resolved: number;
    falseAlarms: number;
    autoDetected: number;
    manuallyLogged: number;
    resolveRate: number;
  };
  notifications: { total: number; read: number; readRate: number };
  dispatch: {
    total: number;
    pushSent: number;
    smsSent: number;
    emailSent: number;
    pushSuccessRate: number;
    smsSuccessRate: number;
    emailSuccessRate: number;
  };
  ai: {
    repairReports: number;
    damageAssessments: number;
    crashLogs: number;
    voiceLogs: number;
  };
  severityTrend7Days: Array<{
    date: string;
    NONE: number;
    MINOR: number;
    MODERATE: number;
    SEVERE: number;
  }>;
  recentActivity: {
    incidents: Array<{
      id: string;
      severity: string;
      status: string;
      occurredAt: string;
      userName: string;
      address?: string | null;
    }>;
    dispatchLogs: Array<{
      id: string;
      user: string;
      pushStatus: string;
      smsStatus: string;
      emailStatus: string;
      createdAt: string;
    }>;
  };
}

// ─── Vehicles (Batch 6) ───────────────────────────────────────────────────

export interface Vehicle {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  color?: string | null;
  licensePlate: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  insurance?: VehicleInsurance | null;
  user?: Pick<User, 'id' | 'fullName' | 'email'>;
}

export interface VehicleInsurance {
  id: string;
  vehicleId: string;
  providerName?: string | null;
  policyNumber?: string | null;
  coverageType?: string | null;
  expiryDate?: string | null;
  emergencyHelpline?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Emergency Contacts (Batch 6) ─────────────────────────────────────────

export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string;
  email?: string | null;
  relationship: string;
  priorityOrder: number;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, 'id' | 'fullName' | 'email'>;
}

// ─── Telemetry (Crash / Voice / Damage / Repair) ───────────────────────────

export interface CrashSoundDetectionLog {
  id: string;
  userId: string;
  incidentId?: string | null;
  windowTimestamp: string;
  topMatchedClass?: string | null;
  crashConfidence: number;
  thresholdUsed: number;
  flaggedAsCrash: boolean;
  combinedWithSensorSignal: boolean;
  triggeredByTransient: boolean;
  createdAt: string;
  user?: Pick<User, 'id' | 'fullName'>;
}

export type VoiceIntent = 'cancel' | 'sos' | 'unknown';

export interface VoiceCommandLog {
  id: string;
  userId: string;
  incidentId?: string | null;
  rawTranscript: string;
  classifiedIntent: VoiceIntent;
  recognitionEngine: string;
  actionTaken: boolean;
  createdAt: string;
  user?: Pick<User, 'id' | 'fullName'>;
}

export type DamageType = 'crack' | 'dent' | 'glass_shatter' | 'lamp_broken' | 'scratch' | 'tire_flat';
export type DamageSeverity = 'minor' | 'moderate' | 'severe';
export type PartTag =
  | 'front_bumper' | 'rear_bumper' | 'bonnet' | 'left_mirror' | 'right_mirror'
  | 'headlight' | 'taillight' | 'door' | 'windshield' | 'roof' | 'tire' | 'other';

export interface DamageAssessment {
  id: string;
  userId: string;
  vehicleId?: string | null;
  incidentId?: string | null;
  photoUrl: string;
  predictedDamageType: DamageType;
  confidenceScore: number;
  derivedSeverity: DamageSeverity;
  inferenceTimeMs?: number | null;
  modelVersion: string;
  partTag: PartTag;
  createdAt: string;
  user?: Pick<User, 'id' | 'fullName'>;
  vehicle?: Pick<Vehicle, 'id' | 'make' | 'model' | 'year'> | null;
}

export interface RepairCostReport {
  id: string;
  userId: string;
  incidentId?: string | null;
  vehicleId?: string | null;
  totalMinCostPkr: number;
  totalMaxCostPkr: number;
  lineItems: RepairLineItem[] | string;
  pdfUrl?: string | null;
  createdAt: string;
  user?: Pick<User, 'id' | 'fullName'>;
  vehicle?: Pick<Vehicle, 'id' | 'make' | 'model' | 'year'> | null;
  damageAssessment?: Pick<DamageAssessment, 'incidentId' | 'predictedDamageType' | 'derivedSeverity' | 'confidenceScore' | 'photoUrl'> | null;
}

export interface RepairLineItem {
  partTag: PartTag;
  damageType: DamageType;
  action: 'repair' | 'replace';
  laborCost: { min: number; max: number };
  partsCost: { min: number; max: number };
  partsSource: 'gemini_ai' | 'fallback_default';
  lineTotal: { min: number; max: number };
}

// ─── Notifications ──────────────────────────────────────────────────────────

export type NotificationCategory =
  | 'driving_mode'
  | 'alert_delivery_confirmation'
  | 'false_alarm_log'
  | 'system_status'
  | 'general';

export interface NotificationLog {
  id: string;
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  isRead: boolean;
  deliveryStatus: string;
  metadata?: any;
  createdAt: string;
  user?: Pick<User, 'id' | 'fullName'>;
}

// ─── Sessions ──────────────────────────────────────────────────────────────

export type NotificationSessionStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'CANCELLED' | 'EXPIRED' | 'EXHAUSTED';
export type NotificationChannel = 'PUSH' | 'SMS' | 'EMAIL' | 'PHONE_CALL';
export type NotificationAttemptStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'ACKNOWLEDGED';

export interface NotificationSession {
  id: string;
  userId: string;
  incidentId?: string | null;
  locationSessionId?: string | null;
  shareToken: string;
  status: NotificationSessionStatus;
  triggeredAt: string;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
  currentPriority: number;
  nextEscalationAt?: string | null;
  cancelledAt?: string | null;
  expiresAt: string;
  attempts?: NotificationAttempt[];
  user?: Pick<User, 'id' | 'fullName' | 'phoneNumber'>;
  incident?: Pick<Incident, 'id' | 'severity' | 'occurredAt' | 'address'>;
}

export interface NotificationAttempt {
  id: string;
  sessionId: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string | null;
  priorityOrder: number;
  channel: NotificationChannel;
  status: NotificationAttemptStatus;
  dispatchedAt?: string | null;
  acknowledgedAt?: string | null;
  errorMessage?: string | null;
}

export type LocationSessionStatus = 'ACTIVE' | 'ENDED' | 'EXPIRED';

export interface LocationSession {
  id: string;
  userId: string;
  incidentId?: string | null;
  shareToken: string;
  status: LocationSessionStatus;
  startedAt: string;
  endedAt?: string | null;
  lastLat?: number | null;
  lastLng?: number | null;
  lastUpdateAt?: string | null;
  user?: Pick<User, 'id' | 'fullName' | 'phoneNumber'>;
}

// ─── Dispatch Logs ─────────────────────────────────────────────────────────

export interface AlertDispatchLog {
  id: string;
  incidentId?: string | null;
  userId: string;
  payload: any;
  pushStatus: string;
  smsStatus: string;
  emailStatus: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, 'id' | 'fullName'>;
}

// ─── Emergency Numbers ─────────────────────────────────────────────────────

export interface RegionalEmergencyNumber {
  id: string;
  regionName: string;
  serviceName: string;
  phoneNumber: string;
  priorityOrder: number;
  isActive: boolean;
  updatedByAdminId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyNumber {
  id: string;
  region: string;
  name: string;
  number: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Workshop ──────────────────────────────────────────────────────────────

export interface WorkshopQueueItem extends User {
  mechanicDetails: NonNullable<User['mechanicDetails']>;
}

// ─── Accident Reports (Batch 6) ────────────────────────────────────────────

export type AccidentReportSeverity = 'minor' | 'moderate' | 'severe';

export interface AccidentReport {
  id: string;
  userId: string;
  vehicleId?: string | null;
  incidentId?: string | null;
  severity: AccidentReportSeverity;
  latitude?: number | null;
  longitude?: number | null;
  detectedRegion?: string | null;
  calledServiceName?: string | null;
  calledAt?: string | null;
  autoDialed: boolean;
  damagePhotoUrls?: any;
  pdfUrl?: string | null;
  createdAt: string;
  user?: Pick<User, 'id' | 'fullName'>;
  vehicle?: Pick<Vehicle, 'id' | 'make' | 'model' | 'year'> | null;
}

// ─── Pagination Meta ────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CountedResponse<T> {
  data: T[];
  total: number;
}
