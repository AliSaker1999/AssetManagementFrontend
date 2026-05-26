import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import AssetsPage from './pages/AssetsPage';
import AssetDetailPage from './pages/AssetDetailPage';
import AssetFormPage from './pages/AssetFormPage';
import InventoriesPage from './pages/InventoriesPage';
import DepreciationsPage from './pages/DepreciationsPage';
import ContactsPage from './pages/ContactsPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';
import CompaniesPage from './pages/CompaniesPage';

export default function App() {
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
            <Route index element={<Navigate to="/assets" replace />} />
            <Route path="assets" element={<AssetsPage />} />
            <Route path="assets/new" element={<AssetFormPage />} />
            <Route path="assets/:id" element={<AssetDetailPage />} />
            <Route path="assets/:id/edit" element={<AssetFormPage />} />
            <Route path="inventories" element={<InventoriesPage />} />
            <Route path="depreciations" element={<DepreciationsPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="companies" element={<CompaniesPage />} />
            <Route path="users" element={<UsersPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  );
}

