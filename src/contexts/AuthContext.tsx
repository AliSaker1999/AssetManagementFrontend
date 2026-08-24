import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import client, { refreshSession } from '../api/client';
import { setAccessToken, SESSION_EXPIRED_EVENT } from '../api/authToken';
import type { User, LoginResponse, UserPermission } from '../types';

interface AuthContextValue {
  user: User | null;
  /**
   * True until the refresh cookie has been checked on first load. Consumers must wait rather
   * than treating a null user as signed out — otherwise every page load flashes the login
   * screen before the session is restored.
   */
  isBootstrapping: boolean;
  login: (userName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  isAuditor: () => boolean;
  isFullAccess: () => boolean;
  allowedCountries: string[];
  allowedCompanies: number[];
  activeCompanyId: number | null;
  setActiveCompanyId: (id: number | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadActiveCompany(): number | null {
  try {
    const raw = localStorage.getItem('activeCompanyId');
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

function toUser(session: LoginResponse, permissions: UserPermission[]): User {
  return {
    userId: session.userId,
    userName: session.userName,
    fullName: session.fullName,
    roleId: session.roleId,
    permissions,
  };
}

/**
 * Permissions are a separate call and are allowed to fail: an empty list degrades to "no
 * company access", which the API enforces anyway. Failing the whole sign-in over it would be
 * worse than a partially populated menu.
 */
async function fetchPermissions(userId: number): Promise<UserPermission[]> {
  try {
    const { data } = await client.get<UserPermission[]>(`/users/${userId}/permissions`);
    return data;
  } catch {
    return [];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Nothing is read back from storage here any more. The profile used to be kept in
  // localStorage, which meant roleId — what the sidebar and the admin routes branch on — was
  // sitting in a place the user could edit, and a role change elsewhere was not picked up
  // until the next sign-in. It now comes from the server on every load, alongside the token.
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [activeCompanyId, setActiveCompanyIdState] = useState<number | null>(loadActiveCompany);

  const setActiveCompanyId = useCallback((id: number | null) => {
    if (id === null) localStorage.removeItem('activeCompanyId');
    else localStorage.setItem('activeCompanyId', String(id));
    setActiveCompanyIdState(id);
  }, []);

  // Restore the session from the refresh cookie. This is what makes a reload survivable now
  // that the access token is only in memory: the cookie is HttpOnly, so this call is the only
  // way to find out whether there is still a session, and it returns a fresh token and the
  // current profile together.
  //
  // refreshSession() is single-flight, so StrictMode's second invocation in development joins
  // the first call rather than replaying a token that has just been rotated.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const session = await refreshSession();
      if (!session) {
        if (!cancelled) setIsBootstrapping(false);
        return;
      }
      const permissions = await fetchPermissions(session.userId);
      if (cancelled) return;
      setUser(toUser(session, permissions));
      setIsBootstrapping(false);
    })();

    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (userName: string, password: string) => {
    const { data } = await client.post<LoginResponse>('/auth/login', { userName, password });
    setAccessToken(data.token);
    const permissions = await fetchPermissions(data.userId);
    setUser(toUser(data, permissions));
  }, []);

  const logout = useCallback(async () => {
    // Tell the server first. Dropping the token locally used to be the whole of "signing out",
    // which left the refresh token valid for its full 14 days — so anyone holding the cookie
    // could carry on. Failure is swallowed deliberately: if the call cannot be made, ending
    // the local session is still the right thing to do.
    try {
      await client.post('/auth/logout');
    } catch {
      /* ignored on purpose — see above */
    }
    setAccessToken(null);
    localStorage.removeItem('activeCompanyId');
    setUser(null);
    setActiveCompanyIdState(null);
  }, []);

  // Raised by the axios interceptor once a refresh has failed, i.e. the refresh token is gone
  // too and there is nothing left to restore.
  useEffect(() => {
    const handleSessionExpired = () => {
      setAccessToken(null);
      setUser(null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  const isAdmin = useCallback(() => user?.roleId === 1, [user]);
  const isAuditor = useCallback(() => user?.roleId === 2, [user]);
  const isFullAccess = useCallback(() => user?.roleId === 3, [user]);

  // Memoised for identity, not for the cost of the map — a user has a handful of
  // permissions. A fresh array on every render is a foot-gun: the moment any consumer puts
  // one of these in a useEffect or useMemo dependency array it becomes an infinite loop,
  // and nothing about the call site would look wrong.
  const allowedCountries = useMemo(
    () => user?.permissions?.map(p => p.countryID) ?? [],
    [user],
  );
  const allowedCompanies = useMemo(
    () => user?.permissions?.map(p => p.companyID) ?? [],
    [user],
  );

  useEffect(() => {
    const handlePermissionsRevoked = async () => {
      if (!user) return;
      try {
        const { data: perms } = await client.get<UserPermission[]>(`/users/${user.userId}/permissions`);
        setUser({ ...user, permissions: perms });
        const allowedIds = perms.map(p => p.companyID);
        setActiveCompanyIdState(prev => {
          if (prev !== null && !allowedIds.includes(prev)) {
            localStorage.removeItem('activeCompanyId');
            return null;
          }
          return prev;
        });
      } catch {
        void logout();
      }
    };
    window.addEventListener('permissions-revoked', handlePermissionsRevoked);
    return () => window.removeEventListener('permissions-revoked', handlePermissionsRevoked);
  }, [user, logout]);

  // null = "All Companies" — no forced fallback to first company
  const resolvedActiveCompanyId = activeCompanyId;

  // A new object literal here gives every useAuth consumer a changed context value on each
  // render of this provider, so all of them re-render even when nothing they read changed.
  // In practice this provider only re-renders on login, logout and a company switch — page
  // state lives in the pages themselves — so this is correctness and future-proofing rather
  // than a hot-path win.
  const value = useMemo(
    () => ({
      user, isBootstrapping, login, logout, isAdmin, isAuditor, isFullAccess,
      allowedCountries, allowedCompanies,
      activeCompanyId: resolvedActiveCompanyId,
      setActiveCompanyId,
    }),
    [
      user, isBootstrapping, login, logout, isAdmin, isAuditor, isFullAccess,
      allowedCountries, allowedCompanies, resolvedActiveCompanyId, setActiveCompanyId,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
