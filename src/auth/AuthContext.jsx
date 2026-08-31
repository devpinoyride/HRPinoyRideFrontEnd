import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setOnUnauthorized } from '../api/client';

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

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthState(null);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    // The API camelCases all JSON (fullName); keep the snake_case fallback for
    // older deployed builds that still serialized the profile name verbatim.
    const value = { token: data.token, role: data.role, fullName: data.fullName ?? data.full_name ?? null };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    setAuthState(value);
    return value;
  }, []);

  // Register the global 401 handler so an expired session logs the user out
  // automatically. The api client reads the token straight from localStorage,
  // so no separate token syncing is needed here (syncing from an effect raced
  // with pages that fetch on mount — children's effects run first).
  useEffect(() => {
    setOnUnauthorized(() => logout());
    return () => setOnUnauthorized(null);
  }, [logout]);

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