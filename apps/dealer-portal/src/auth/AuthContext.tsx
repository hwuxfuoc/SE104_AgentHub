import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { AuthUser, LoginResult } from '@/lib/api/types';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) { setLoading(false); return; }
    api
      .get<AuthUser>('/auth/profile')
      .then((r) => (r.data.role === 'DEALER' ? setUser(r.data) : tokenStore.clear()))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<LoginResult>('/auth/login', { email, password });
    if (res.data.user.role !== 'DEALER') {
      throw new ApiError(403, {
        code: 'FORBIDDEN',
        message: 'Tài khoản nội bộ không truy cập được Dealer Portal. Vui lòng dùng Admin Portal.',
      });
    }
    tokenStore.set(res.data.token);
    setUser(res.data.user);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
