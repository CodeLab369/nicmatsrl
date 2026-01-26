'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);

  const fetchUser = useCallback(async (authId?: string) => {
    try {
      let userId = authId;
      
      if (!userId) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
      }
      
      if (!userId) {
        setUser(null);
        return;
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select('id, username, full_name, role, is_active, last_login, created_at, updated_at')
        .eq('auth_id', userId)
        .single();

      if (error || !userData) {
        setUser(null);
        return;
      }

      setUser({
        id: userData.id,
        username: userData.username,
        fullName: userData.full_name,
        role: userData.role,
        isActive: userData.is_active,
        lastLogin: userData.last_login,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at,
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && session?.user) {
          await fetchUser(session.user.id);
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (event === 'SIGNED_IN' && session) {
          await fetchUser(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchUser]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const email = `${username.toLowerCase()}@nicmat.local`;
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        return { success: false, error: ERROR_MESSAGES.INVALID_CREDENTIALS };
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, username, full_name, role, is_active, last_login, created_at, updated_at')
        .eq('auth_id', authData.user.id)
        .eq('is_active', true)
        .single();

      if (userError || !userData) {
        await supabase.auth.signOut();
        return { success: false, error: ERROR_MESSAGES.INVALID_CREDENTIALS };
      }

      // Actualizar último login en background
      supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', userData.id).then(() => {});

      setUser({
        id: userData.id,
        username: userData.username,
        fullName: userData.full_name,
        role: userData.role,
        isActive: userData.is_active,
        lastLogin: userData.last_login,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: ERROR_MESSAGES.GENERIC };
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const logout = useCallback(async () => {
    setUser(null);
    await supabase.auth.signOut();
    router.push(ROUTES.LOGIN);
  }, [supabase, router]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

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
