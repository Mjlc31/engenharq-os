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
      const { data } = await supabase
        .from('users')
        .select('role, permissions')
        .eq('id', userId)
        .maybeSingle();

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
      setPermissions(DEFAULT_PERMISSIONS);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: sessionData, error } = await supabase.auth.getSession();
        const activeSession = sessionData?.session;
        if (activeSession) {
          setSession(activeSession);
          setUser(activeSession.user);
          const resolvedRole = (activeSession.user.app_metadata?.role as UserRole) ?? null;
          setRole(resolvedRole);
          if (activeSession.user.id) {
            await fetchUserPermissions(activeSession.user.id, resolvedRole);
          }
        } else {
          setSession(null);
          setUser(null);
          setRole(null);
          setPermissions(null);
        }
      } catch (err) {
        console.warn('Erro ao inicializar auth:', err);
      } finally {
        setLoading(false);
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
