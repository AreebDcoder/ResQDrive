import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import {
  BrowserRouter, Routes, Route, Navigate, useLocation,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import AdminLayout from './layouts/AdminLayout';
import { ROUTES } from './routes';
import { Spinner } from './components/ui/Spinner';
import { ErrorBoundary } from './components/ErrorBoundary';

// LoginPage is NOT lazy (it's the first thing users see on auth-fail).
import LoginPage from './pages/LoginPage';

// ─── Loading fallback for lazy routes ──────────────────────────────────────
function RouteLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner size={24} className="text-primary-500" label="Loading page" />
    </div>
  );
}

// ─── Auth guard: redirects to /login when not authenticated ────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Spinner size={28} className="text-primary-500" label="Loading session" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

// ─── Redirect to dashboard when logged-in user lands on /login ─────────────
function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// ─── Routes tree ────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Auth route (no layout — just renders LoginPage directly) */}
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        }
      />

      {/* Admin routes (require auth + AdminLayout) */}
      <Route
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        {/* Index redirect */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Render all routes from routes.ts */}
        {ROUTES.map((route) => {
          const Element = route.element as LazyExoticComponent<ComponentType<any>>;
          return (
            <Route
              key={route.path}
              path={route.path}
              element={
                <ErrorBoundary>
                  <Suspense fallback={<RouteLoader />}>
                    <Element />
                  </Suspense>
                </ErrorBoundary>
              }
            />
          );
        })}

        {/* Catch-all → redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
