'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      verifyToken(storedToken).then(valid => {
        if (!valid) {
          handleSessionExpired();
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  async function verifyToken(t) {
    try {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data.valid === true;
    } catch {
      return false;
    }
  }

  function handleSessionExpired() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setSessionExpired(true);
  }

  const login = useCallback(async (username, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    setSessionExpired(false);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setSessionExpired(false);
    router.replace('/');
  }, [router]);

  // Authenticated fetch wrapper — auto-handles 401, network errors, bad JSON
  const authFetch = useCallback(async (path, options = {}) => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      handleSessionExpired();
      throw new Error('Not authenticated');
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${currentToken}`,
      ...options.headers,
    };

    let res;
    try {
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } catch (networkErr) {
      throw new Error('Unable to connect to the server. Please check that the backend is running.');
    }

    if (res.status === 401) {
      handleSessionExpired();
      router.replace('/');
      throw new Error('Session expired');
    }

    if (res.status === 403) {
      throw new Error('Access denied. You do not have permission for this action.');
    }

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server returned an invalid response (${res.status})`);
    }

    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }, [router]);

  // Role checks
  const isDoctor = user?.role === 'doctor';
  const isNurse = user?.role === 'nurse';
  const isAdmin = user?.role === 'admin';
  const canAccessAI = isDoctor || isAdmin;
  const canManageUsers = isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        sessionExpired,
        isAuthenticated: !!token && !!user,
        isDoctor,
        isNurse,
        isAdmin,
        canAccessAI,
        canManageUsers,
        login,
        logout,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Return safe defaults when context isn't available (SSR / outside provider)
    return {
      user: null, token: null, loading: true, sessionExpired: false,
      isAuthenticated: false, isDoctor: false, isNurse: false, isAdmin: false,
      canAccessAI: false, canManageUsers: false,
      login: async () => { }, logout: () => { }, authFetch: async () => { },
    };
  }
  return ctx;
}
