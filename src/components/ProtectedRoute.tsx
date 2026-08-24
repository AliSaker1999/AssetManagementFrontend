import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageChunkFallback from './PageChunkFallback';
import type { ReactNode } from 'react';

export default function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, isAdmin, isBootstrapping } = useAuth();

  // The access token now lives only in memory, so on a reload there is genuinely no session
  // until the refresh cookie has been exchanged. Treating that moment as "signed out" would
  // redirect to /login on every reload and lose the URL the user was on.
  if (isBootstrapping) return <PageChunkFallback />;

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin()) return <Navigate to="/assets" replace />;
  return <>{children}</>;
}

