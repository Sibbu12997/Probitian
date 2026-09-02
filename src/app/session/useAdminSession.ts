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

  // Validate server-side admin session on load via HttpOnly cookie
  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      try {
        const res = await fetch('/api/admin/session', { 
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.authenticated && data.email) {
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
      await fetch('/api/admin/logout', { 
        method: 'POST', 
        credentials: 'include'
      });
    } catch (e) {
      console.warn('Logout error:', e);
    } finally {
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
