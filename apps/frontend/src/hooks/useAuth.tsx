'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface User { id: string; name: string; email: string; role: string; }
interface Organization { id: string; name: string; }

interface AuthCtx {
  user: User | null;
  org: Organization | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; organizationName: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('cookieguard_token');
    if (!token) { setLoading(false); return; }
    try {
      const res = await api.me();
      setUser(res.data.user);
      setOrg(res.data.organization);
      router.push('/');
    } catch {
      localStorage.removeItem('cookieguard_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    localStorage.setItem('cookieguard_token', res.data.token);
    setUser(res.data.user);
    setOrg(res.data.organization);
    router.push('/');
  };

  const register = async (data: { name: string; email: string; password: string; organizationName: string }) => {
    const res = await api.register(data);
    localStorage.setItem('cookieguard_token', res.data.token);
    setUser(res.data.user);
    setOrg(res.data.organization);
    router.push('/');
  };

  const logout = () => {
    localStorage.removeItem('cookieguard_token');
    setUser(null);
    setOrg(null);
    router.push('/login');
  };

  return <AuthContext.Provider value={{ user, org, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
