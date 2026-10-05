import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { SignupPage } from './pages/public/SignupPage';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { DashboardPage } from './pages/app/DashboardPage';
import { EventsPage } from './pages/app/EventsPage';
import { DetectionsPage } from './pages/app/DetectionsPage';
import { UsersPage } from './pages/app/UsersPage';
import { SettingsPage } from './pages/app/SettingsPage';
import { ActorProfilePage } from './pages/app/ActorProfilePage';
import { InvestigationsPage } from './pages/app/InvestigationsPage';
import { IntegrationGuidePage } from './pages/app/IntegrationGuidePage';
import { NotFoundPage } from './pages/public/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected App Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="detections" element={<DetectionsPage />} />
              <Route path="investigations" element={<InvestigationsPage />} />
              <Route path="actors/:actor" element={<ActorProfilePage />} />
              <Route path="integration" element={<IntegrationGuidePage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
