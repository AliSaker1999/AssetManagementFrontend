import { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import useGlobalFormValidation from './hooks/useGlobalFormValidation';

/*
 * Route-level code splitting.
 *
 * Every page used to be a static import, so one bundle carried all of them — 794 KB, past
 * Vite's own 500 KB warning. Someone opening the login screen downloaded the settings
 * screen, the reports screen and the 2,000-line asset detail screen before they could type
 * a password.
 *
 * Deliberately still eager:
 *   LoginPage      the first thing an unauthenticated visitor sees; lazy-loading it would
 *                  add a network round trip before the form appears.
 *   Layout         needed the instant any protected route renders, so splitting it only
 *                  moves the same bytes onto the critical path.
 *   ProtectedRoute / ErrorBoundary / AuthProvider — small, and needed on every route.
 *
 * The Suspense boundary lives inside Layout, around its <Outlet />, so the sidebar and
 * header stay on screen while a page chunk loads instead of the whole app blanking.
 */
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AssetsByCompanyPage = lazy(() => import('./pages/AssetsByCompanyPage'));
const AssetsByCountryPage = lazy(() => import('./pages/AssetsByCountryPage'));
const NeedsAttentionPage = lazy(() => import('./pages/NeedsAttentionPage'));
const CompanyOperationsPage = lazy(() => import('./pages/CompanyOperationsPage'));
const AssetsPage = lazy(() => import('./pages/AssetsPage'));
const AssetDetailPage = lazy(() => import('./pages/AssetDetailPage'));
const AssetFormPage = lazy(() => import('./pages/AssetFormPage'));
const InventoriesPage = lazy(() => import('./pages/InventoriesPage'));
const DepreciationsPage = lazy(() => import('./pages/DepreciationsPage'));
const ContactsPage = lazy(() => import('./pages/ContactsPage'));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const CompaniesPage = lazy(() => import('./pages/CompaniesPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));

export default function App() {
  useGlobalFormValidation();

  return (
    <ErrorBoundary>
    <AuthProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="dashboard/companies" element={<AssetsByCompanyPage />} />
            <Route path="dashboard/countries" element={<AssetsByCountryPage />} />
            <Route path="dashboard/attention" element={<NeedsAttentionPage />} />
            <Route path="dashboard/operations" element={<CompanyOperationsPage />} />
            <Route path="assets" element={<AssetsPage />} />
            <Route path="assets/new" element={<AssetFormPage />} />
            <Route path="assets/:id" element={<AssetDetailPage />} />
            <Route path="assets/:id/edit" element={<AssetFormPage />} />
            <Route path="inventories" element={<InventoriesPage />} />
            <Route path="depreciations" element={<DepreciationsPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="companies" element={<CompaniesPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  );
}
