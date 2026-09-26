/**
 * Central route configuration for the admin panel.
 *
 * Routes are defined in one place so we can:
 *   - Generate the <Routes> tree programmatically
 *   - Generate the Sidebar nav from the same source
 *   - Add new routes in exactly one location
 *
 * Page components are lazy-loaded via React.lazy() + Suspense in App.tsx
 * so the initial bundle is small (each route becomes its own chunk).
 */

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import {
  LayoutDashboard, Siren, Activity, Wrench, Phone, Users,
  AudioLines, Mic, Image, Calculator, Bell, Download,
  HeartPulse, UserCircle,
} from 'lucide-react';

// ─── Page lazy-imports (code-splitting per route) ────────────────────────────
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const IncidentsPage = lazy(() => import('./pages/IncidentsPage'));
const IncidentDetailPage = lazy(() => import('./pages/IncidentDetailPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const UserDetailPage = lazy(() => import('./pages/UserDetailPage'));
const EmergencyMonitorPage = lazy(() => import('./pages/EmergencyMonitorPage'));
const SystemHealthPage = lazy(() => import('./pages/SystemHealthPage'));
const CrashDetectionLogsPage = lazy(() => import('./pages/CrashDetectionLogsPage'));
const VoiceCommandLogsPage = lazy(() => import('./pages/VoiceCommandLogsPage'));
const DamageAssessmentPage = lazy(() => import('./pages/DamageAssessmentPage'));
const RepairCostReportsPage = lazy(() => import('./pages/RepairCostReportsPage'));
const WorkshopQueuePage = lazy(() => import('./pages/WorkshopQueuePage'));
const EmergencyNumbersPage = lazy(() => import('./pages/EmergencyNumbersPage'));
const NotificationHistoryPage = lazy(() => import('./pages/NotificationHistoryPage'));
const DataExportPage = lazy(() => import('./pages/DataExportPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

type LazyPage = LazyExoticComponent<ComponentType<any>>;

// ─── Nav item shape (shared with Sidebar) ────────────────────────────────────
export interface NavItem {
  /** Route path (used by Sidebar for active state + <Link to>) */
  to: string;
  /** Display label */
  label: string;
  /** Lucide icon component */
  icon: ComponentType<{ size?: number | string; className?: string }>;
}

export interface NavGroup {
  /** Group heading shown in Sidebar */
  group: string;
  items: NavItem[];
}

// ─── Sidebar nav definition (single source of truth) ────────────────────────
export const NAV_GROUPS: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    group: 'Operations',
    items: [
      { to: '/incidents', label: 'Incidents', icon: Siren },
      { to: '/monitor', label: 'Emergency Monitor', icon: Activity },
      { to: '/workshop', label: 'Workshop Queue', icon: Wrench },
      { to: '/emergency-numbers', label: 'Emergency Numbers', icon: Phone },
    ],
  },
  {
    group: 'Users & Vehicles',
    items: [
      { to: '/users', label: 'Users', icon: Users },
    ],
  },
  {
    group: 'AI Telemetry',
    items: [
      { to: '/crash-logs', label: 'Crash Detection', icon: AudioLines },
      { to: '/voice-logs', label: 'Voice Commands', icon: Mic },
      { to: '/damage', label: 'Damage Assessment', icon: Image },
      { to: '/repair', label: 'Repair Costs', icon: Calculator },
    ],
  },
  {
    group: 'Communications',
    items: [
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/export', label: 'Data Export', icon: Download },
    ],
  },
  {
    group: 'System',
    items: [
      { to: '/health', label: 'System Health', icon: HeartPulse },
      { to: '/profile', label: 'Profile', icon: UserCircle },
    ],
  },
];

// ─── Route definitions (used by App.tsx) ─────────────────────────────────────
export interface RouteDef {
  path: string;
  element: LazyPage;
}

export const ROUTES: RouteDef[] = [
  { path: '/dashboard', element: DashboardPage },
  { path: '/incidents', element: IncidentsPage },
  { path: '/incidents/:id', element: IncidentDetailPage },
  { path: '/users', element: UsersPage },
  { path: '/users/:id', element: UserDetailPage },
  { path: '/monitor', element: EmergencyMonitorPage },
  { path: '/health', element: SystemHealthPage },
  { path: '/crash-logs', element: CrashDetectionLogsPage },
  { path: '/voice-logs', element: VoiceCommandLogsPage },
  { path: '/damage', element: DamageAssessmentPage },
  { path: '/repair', element: RepairCostReportsPage },
  { path: '/workshop', element: WorkshopQueuePage },
  { path: '/emergency-numbers', element: EmergencyNumbersPage },
  { path: '/notifications', element: NotificationHistoryPage },
  { path: '/export', element: DataExportPage },
  { path: '/profile', element: ProfilePage },
];

// ─── Page title map (used by Topbar + Breadcrumb) ────────────────────────────
export const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/incidents': 'Incidents',
  '/incidents/:id': 'Incident Detail',
  '/users': 'Users',
  '/users/:id': 'User Detail',
  '/monitor': 'Emergency Monitor',
  '/health': 'System Health',
  '/crash-logs': 'Crash Detection',
  '/voice-logs': 'Voice Commands',
  '/damage': 'Damage Assessment',
  '/repair': 'Repair Costs',
  '/workshop': 'Workshop Queue',
  '/emergency-numbers': 'Emergency Numbers',
  '/notifications': 'Notifications',
  '/export': 'Data Export',
  '/profile': 'Profile',
};
