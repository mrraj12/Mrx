import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getAdminSession,
  getAdminPanelPath,
  adminLogout,
  validateAdminToken,
  updateSessionActivity,
  listAdminSessions,
  revokeAdminSession,
  revokeAllOtherSessions
} from '../lib/adminService';
import type { AdminUser, AdminSessionInfo } from '../types';

interface AdminContextType {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  adminPath: string;
  sessions: AdminSessionInfo[];
  currentSessionId: string | null;
  login: (admin: AdminUser, token: string) => void;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  fetchSessions: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<boolean>;
  revokeAllOtherSessions: () => Promise<boolean>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminPath, setAdminPath] = useState('admin');
  const [sessions, setSessions] = useState<AdminSessionInfo[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const login = useCallback((adminUser: AdminUser, token: string) => {
    console.log('[AdminContext] login called with:', { adminUser, token: token ? 'present' : 'missing' });
    setAdmin(adminUser);
    localStorage.setItem('admin_token', token);
    const sessionData = {
      id: crypto.randomUUID(),
      admin_id: adminUser.id,
      admin: adminUser,
      expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    };
    localStorage.setItem('admin_session', JSON.stringify(sessionData));
    console.log('[AdminContext] Session stored:', sessionData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminLogout();
    } finally {
      setAdmin(null);
      setSessions([]);
      setCurrentSessionId(null);
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_session');
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    const isValid = await validateAdminToken();
    if (!isValid) {
      await logout();
    }
  }, [logout]);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await listAdminSessions();
      setSessions(data);
    } catch (error) {
      console.error('[AdminContext] Failed to fetch sessions:', error);
    }
  }, []);

  const revokeSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const result = await revokeAdminSession(sessionId);
      if (result.success) {
        await fetchSessions();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[AdminContext] Failed to revoke session:', error);
      return false;
    }
  }, [fetchSessions]);

  const revokeAllOtherSessions = useCallback(async (): Promise<boolean> => {
    try {
      const result = await revokeAllOtherSessions();
      if (result.success) {
        await fetchSessions();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[AdminContext] Failed to revoke all other sessions:', error);
      return false;
    }
  }, [fetchSessions]);

  useEffect(() => {
    const initAuth = async () => {
      console.log('[AdminContext] initAuth starting...');
      try {
        const path = await getAdminPanelPath();
        console.log('[AdminContext] adminPath:', path);
        setAdminPath(path);

        const session = getAdminSession();
        console.log('[AdminContext] session from getAdminSession():', session);
        if (session?.admin) {
          console.log('[AdminContext] validating token...');
          const isValid = await validateAdminToken();
          console.log('[AdminContext] token valid:', isValid);
          if (isValid) {
            console.log('[AdminContext] setting admin from session:', session.admin);
            setAdmin(session.admin);
          } else {
            console.log('[AdminContext] token invalid, clearing storage');
            localStorage.removeItem('admin_session');
            localStorage.removeItem('admin_token');
          }
        } else {
          console.log('[AdminContext] no session found');
        }
      } catch (error) {
        console.error('[AdminContext] initAuth error:', error);
      } finally {
        console.log('[AdminContext] initAuth complete, setting isLoading=false');
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Refresh auth status periodically and update activity
  useEffect(() => {
    if (!admin) return;

    const interval = setInterval(() => {
      refreshAuth();
      updateSessionActivity();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [admin, refreshAuth]);

  return (
    <AdminContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        adminPath,
        sessions,
        currentSessionId,
        login,
        logout,
        refreshAuth,
        fetchSessions,
        revokeSession,
        revokeAllOtherSessions
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
