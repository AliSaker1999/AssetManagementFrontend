import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import client from '../api/client';
import type { User, LoginResponse } from '../types';

interface AuthContextValue {
  user: User | null;
  login: (userName: string, password: string) => Promise<void>;
  logout: () => void;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);

  const login = useCallback(async (userName: string, password: string) => {
    const { data } = await client.post<LoginResponse>('/auth/login', { userName, password });
    localStorage.setItem('token', data.token);
    const u: User = {
      userId: data.userId,
      userName: data.userName,
      fullName: data.fullName,
      hr: data.hr,
      asset: data.asset,
      contact: data.contact,
    };
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
