import { useState } from 'react';
import { AuthProvider, useAuth } from './auth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IncidentsPage from './pages/IncidentsPage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import UsersPage from './pages/UsersPage';
import ProfilePage from './pages/ProfilePage';
import Sidebar from './components/Sidebar';

type Page = 'dashboard' | 'incidents' | 'users' | 'profile';

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
        {page === 'users' && <UsersPage />}
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