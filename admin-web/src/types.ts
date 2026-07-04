export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'DRIVER' | 'ADMIN' | 'MECHANIC';
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  driverDetails?: any;
  mechanicDetails?: any;
}

export interface Incident {
  id: string;
  userId: string;
  type: 'AUTO' | 'MANUAL';
  severity: 'NONE' | 'MINOR' | 'MODERATE' | 'SEVERE';
  status: 'ACTIVE' | 'RESOLVED' | 'FALSE_ALARM' | 'ARCHIVED';
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

export interface AnalyticsSummary {
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  falseAlarms: number;
  severityBreakdown: { NONE: number; MINOR: number; MODERATE: number; SEVERE: number };
  severityPercentages: { NONE: number; MINOR: number; MODERATE: number; SEVERE: number };
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