import { Route, Routes } from 'react-router-dom';
import { AdminStateProvider } from './context';
import { AdminLayout } from './layout/AdminLayout';
import { AdminAdminsPage } from './pages/AdminsPage';
import { AdminAnalyticsPage } from './pages/AnalyticsPage';
import { AdminCommunicationPage } from './pages/CommunicationPage';
import { AdminDashboardPage } from './pages/DashboardPage';
import { AdminIntegrationsPage } from './pages/IntegrationsPage';
import { AdminProvidersPage } from './pages/ProvidersPage';
import { AdminReportsPage } from './pages/ReportsPage';
import { AdminReviewsPage } from './pages/ReviewsPage';
import { AdminSettingsPage } from './pages/SettingsPage';
import { AdminSubscriptionsPage } from './pages/SubscriptionsPage';
import { AdminVerificationPage } from './pages/VerificationPage';

export function AdminRoutes({ accessToken, onLogout }: { accessToken: string; onLogout: () => void }) {
  return (
    <AdminStateProvider accessToken={accessToken}>
      <Routes>
        <Route element={<AdminLayout onLogout={onLogout} />}>
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="verification" element={<AdminVerificationPage />} />
          <Route path="providers" element={<AdminProvidersPage />} />
          <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="api-integrations" element={<AdminIntegrationsPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="communication" element={<AdminCommunicationPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="admins" element={<AdminAdminsPage />} />
          <Route path="*" element={<AdminDashboardPage />} />
        </Route>
      </Routes>
    </AdminStateProvider>
  );
}
