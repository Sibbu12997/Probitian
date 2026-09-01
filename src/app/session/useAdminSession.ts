import { useState, useEffect, useCallback } from 'react';

export interface AdminSessionState {
  adminUser: string | null;
  adminRole: 'admin' | 'editor' | null;
  isLoading: boolean;
  handleAdminLoginSuccess: (email: string, role?: 'admin' | 'editor') => void;
  handleAdminLogout: () => Promise<void>;
}

export function useAdminSession(): AdminSessionState {
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState<'admin' | 'editor' | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate server-side admin session on load
  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      try {
        const headers: Record<string, string> = {};
        try {
          const token = localStorage.getItem('admin_session_token');
          if (token && token.trim()) {
            headers['Authorization'] = `Bearer ${token.trim()}`;
            headers['x-admin-token'] = token.trim();
          }
        } catch {}

        const res = await fetch('/api/admin/session', { 
          credentials: 'include',
          headers
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.authenticated && data.email) {
            if (data.token) {
              try {
                localStorage.setItem('admin_session_token', data.token);
              } catch {}
            }
            setAdminUser(data.email);
            setAdminRole(data.role || 'admin');
          }
        }
      } catch (err) {
        console.warn('Admin session validation error:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    checkSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAdminLoginSuccess = useCallback((email: string, role: 'admin' | 'editor' = 'admin') => {
    setAdminUser(email);
    setAdminRole(role);
  }, []);

  const handleAdminLogout = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      try {
        const token = localStorage.getItem('admin_session_token');
        if (token && token.trim()) {
          headers['Authorization'] = `Bearer ${token.trim()}`;
          headers['x-admin-token'] = token.trim();
        }
      } catch {}

      await fetch('/api/admin/logout', { 
        method: 'POST', 
        credentials: 'include',
        headers
      });
    } catch (e) {
      console.warn('Logout error:', e);
    } finally {
      try {
        localStorage.removeItem('admin_session_token');
      } catch {}
      setAdminUser(null);
      setAdminRole(null);
    }
  }, []);

  return {
    adminUser,
    adminRole,
    isLoading,
    handleAdminLoginSuccess,
    handleAdminLogout,
  };
}
