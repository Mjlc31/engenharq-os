import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserPermissions } from '../types';
import { ADMIN_PERMISSIONS, DEFAULT_PERMISSIONS } from '../services/rbacService';

export type UserRole = 'ADMIN' | 'SAFETY_ENGINEER' | 'SITE_MANAGER';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  permissions: UserPermissions | null;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  permissions: null,
  signOut: async () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserPermissions = async (userId: string, currentRole?: UserRole | null) => {
    try {
      const fetchPromise = supabase
        .from('users')
        .select('role, permissions')
        .eq('id', userId)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 2500)
      );

      const res = await Promise.race([fetchPromise, timeoutPromise]) as any;
      const data = res?.data;

      if (data) {
        if (data.role) setRole(data.role as UserRole);
        if (data.permissions) {
          setPermissions(data.permissions as UserPermissions);
          return;
        }
      }

      // Fallback baseado no cargo
      if (currentRole === 'ADMIN' || data?.role === 'ADMIN') {
        setPermissions(ADMIN_PERMISSIONS);
      } else {
        setPermissions(DEFAULT_PERMISSIONS);
      }
    } catch (e) {
      console.warn('Erro ao carregar permissões do usuário:', e);
      setPermissions(currentRole === 'ADMIN' ? ADMIN_PERMISSIONS : DEFAULT_PERMISSIONS);
    }
  };

  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 2500)
        );

        const res = await Promise.race([sessionPromise, timeoutPromise]) as any;
        const activeSession = res?.data?.session;

        if (activeSession && mounted) {
          setSession(activeSession);
          setUser(activeSession.user);
          const resolvedRole = (activeSession.user.app_metadata?.role as UserRole) ?? null;
          setRole(resolvedRole);
          if (activeSession.user.id) {
            await fetchUserPermissions(activeSession.user.id, resolvedRole);
          }
        } else if (mounted) {
          setSession(null);
          setUser(null);
          setRole(null);
          setPermissions(null);
        }
      } catch (err) {
        console.warn('Erro ao inicializar auth:', err);
        if (mounted) {
          setSession(null);
          setUser(null);
          setRole(null);
          setPermissions(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    initAuth();
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      const resolvedRole = (session?.user?.app_metadata?.role as UserRole) ?? null;
      setRole(resolvedRole);
      if (session?.user?.id) {
        await fetchUserPermissions(session.user.id, resolvedRole);
      } else {
        setPermissions(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, permissions, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
