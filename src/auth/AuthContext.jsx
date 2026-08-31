import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, setOnUnauthorized } from '../api/client';

const AuthContext = createContext(null);

const STORAGE_KEY = 'pinoyride_auth';

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* corrupted storage */
  }
  return null;
}

export function AuthProvider({ children }) {
  const [auth, setAuthState] = useState(readStoredAuth);

  // Keep the api client's module-level token in sync, and register the global
  // 401 handler so an expired session logs the user out automatically.
  useEffect(() => {
    setToken(auth ? auth.token : null);
    setOnUnauthorized(() => logout());
    return () => setOnUnauthorized(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthState(null);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    const value = { token: data.token, role: data.role, fullName: data.full_name };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    setAuthState(value);
    return value;
  }, []);

  const can = useCallback(
    (level) => {
      if (!auth) return false;
      if (level === '*') return true;
      if (level === 'approver') return auth.role === 'approver' || auth.role === 'hr_admin';
      if (level === 'hr_admin') return auth.role === 'hr_admin';
      return false;
    },
    [auth]
  );

  return (
    <AuthContext.Provider value={{ auth, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}