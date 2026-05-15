import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import client from '../api/client';
import type { User, LoginResponse, UserPermission } from '../types';

interface AuthContextValue {
  user: User | null;
  login: (userName: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
  isAuditor: () => boolean;
  isFullAccess: () => boolean;
  allowedCountries: string[];
  allowedCompanies: number[];
  activeCompanyId: number | null;
  setActiveCompanyId: (id: number | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function loadActiveCompany(): number | null {
  try {
    const raw = localStorage.getItem('activeCompanyId');
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);
  const [activeCompanyId, setActiveCompanyIdState] = useState<number | null>(loadActiveCompany);

  const setActiveCompanyId = useCallback((id: number | null) => {
    if (id === null) localStorage.removeItem('activeCompanyId');
    else localStorage.setItem('activeCompanyId', String(id));
    setActiveCompanyIdState(id);
  }, []);

  const login = useCallback(async (userName: string, password: string) => {
    const { data } = await client.post<LoginResponse>('/auth/login', { userName, password });
    localStorage.setItem('token', data.token);
    const u: User = {
      userId: data.userId,
      userName: data.userName,
      fullName: data.fullName,
      roleId: data.roleId,
    };
    try {
      const { data: perms } = await client.get<UserPermission[]>(`/users/${data.userId}/permissions`);
      u.permissions = perms;
    } catch {
      u.permissions = [];
    }
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeCompanyId');
    setUser(null);
    setActiveCompanyIdState(null);
  }, []);

  const isAdmin = useCallback(() => user?.roleId === 1, [user]);
  const isAuditor = useCallback(() => user?.roleId === 2, [user]);
  const isFullAccess = useCallback(() => user?.roleId === 3, [user]);

  const allowedCountries = user?.permissions?.map(p => p.countryID) ?? [];
  const allowedCompanies = user?.permissions?.map(p => p.companyID) ?? [];

  // null = "All Companies" — no forced fallback to first company
  const resolvedActiveCompanyId = activeCompanyId;

  return (
    <AuthContext.Provider value={{
      user, login, logout, isAdmin, isAuditor, isFullAccess,
      allowedCountries, allowedCompanies,
      activeCompanyId: resolvedActiveCompanyId,
      setActiveCompanyId,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

