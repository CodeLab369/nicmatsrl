'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { ROUTES, ERROR_MESSAGES } from '@/lib/constants';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Intervalo de heartbeat (30 segundos)
const HEARTBEAT_INTERVAL = 30000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Enviar heartbeat de presencia
  const sendHeartbeat = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/auth/presence', { method: 'POST' });
      const data = await response.json();
      
      // Si el usuario fue desactivado, forzar logout
      if (data.forceLogout) {
        console.log('Usuario desactivado, cerrando sesión...');
        setUser(null);
        router.push(ROUTES.LOGIN);
      }
    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  }, [user, router]);

  // Verificar sesión al cargar
  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      
      if (data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Session check error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Iniciar heartbeat cuando hay usuario
  useEffect(() => {
    if (user) {
      // Enviar heartbeat inmediatamente
      sendHeartbeat();
      
      // Configurar intervalo
      heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
      
      // Enviar presencia offline al cerrar/recargar
      const handleBeforeUnload = () => {
        navigator.sendBeacon('/api/auth/presence', JSON.stringify({ offline: true }));
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
        }
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    } else {
      // Limpiar intervalo si no hay usuario
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    }
  }, [user, sendHeartbeat]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || ERROR_MESSAGES.INVALID_CREDENTIALS };
      }

      setUser(data.user);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: ERROR_MESSAGES.GENERIC };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Marcar como offline antes de cerrar sesión
      await fetch('/api/auth/presence', { method: 'DELETE' });
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push(ROUTES.LOGIN);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    await checkSession();
  }, [checkSession]);

  const value = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  }), [user, isLoading, login, logout, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
