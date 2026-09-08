import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type UserRole = 'ADMIN' | 'SAFETY_ENGINEER' | 'SITE_MANAGER';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  signOut: async () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Forçar refresh para capturar metadados atualizados (role)
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error || !session) {
        const fallback = await supabase.auth.getSession();
        if (fallback.error) {
           console.warn("Erro ao obter sessão:", fallback.error.message);
        }
        setSession(fallback.data.session);
        setUser(fallback.data.session?.user ?? null);
        setRole((fallback.data.session?.user?.app_metadata?.role as UserRole) ?? null);
      } else {
        setSession(session);
        setUser(session.user);
        setRole((session.user.app_metadata?.role as UserRole) ?? null);
      }
      setLoading(false);
    };
    initAuth();
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setRole((session?.user?.app_metadata?.role as UserRole) ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
