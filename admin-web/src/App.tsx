import { useState } from 'react';
import { AuthProvider, useAuth } from './auth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IncidentsPage from './pages/IncidentsPage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import UsersPage from './pages/UsersPage';
import ProfilePage from './pages/ProfilePage';
import Sidebar from './components/Sidebar';
import SystemHealthPage from './pages/SystemHealthPage';
import EmergencyMonitorPage from './pages/EmergencyMonitorPage';
import CrashDetectionLogsPage from './pages/CrashDetectionLogsPage';
import VoiceCommandLogsPage from './pages/VoiceCommandLogsPage';
import DamageAssessmentPage from './pages/DamageAssessmentPage';
import RepairCostReportsPage from './pages/RepairCostReportsPage';
import WorkshopQueuePage from './pages/WorkshopQueuePage';
import EmergencyNumbersPage from './pages/EmergencyNumbersPage';
import NotificationHistoryPage from './pages/NotificationHistoryPage';
import DataExportPage from './pages/DataExportPage';

type Page = 'dashboard' | 'incidents' | 'monitor' | 'crash-logs' | 'voice-logs' | 'damage' | 'repair' | 'workshop' | 'emergency-numbers' | 'health' | 'users' | 'profile' | 'notifications' | 'export';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (selectedIncidentId) {
    return (
      <div className="flex h-screen bg-gray-900">
        <Sidebar
          currentPage={page}
          onNavigate={(p) => {
            setSelectedIncidentId(null);
            setPage(p);
          }}
          activePageLabel="Incident Detail"
        />
        <IncidentDetailPage
          incidentId={selectedIncidentId}
          onBack={() => setSelectedIncidentId(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar currentPage={page} onNavigate={setPage} />
      <main className="flex-1 overflow-auto">
        {page === 'dashboard' && <DashboardPage />}
        {page === 'incidents' && <IncidentsPage onSelectIncident={setSelectedIncidentId} />}
        {page === 'monitor' && <EmergencyMonitorPage />}
        {page === 'health' && <SystemHealthPage />}
                {page === 'crash-logs' && <CrashDetectionLogsPage />}
        {page === 'voice-logs' && <VoiceCommandLogsPage />}
        {page === 'damage' && <DamageAssessmentPage />}
        {page === 'repair' && <RepairCostReportsPage />}
                {page === 'workshop' && <WorkshopQueuePage />}
        {page === 'emergency-numbers' && <EmergencyNumbersPage />}
                {page === 'notifications' && <NotificationHistoryPage />}
        {page === 'users' && <UsersPage />}
        {page === 'export' && <DataExportPage />}
        {page === 'profile' && <ProfilePage />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}