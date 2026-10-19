import { supabase } from '../lib/supabase';
import { User, UserPermissions, UserRole } from '../types';

export const DEFAULT_PERMISSIONS: UserPermissions = {
  dashboard: { view: true },
  cadastros: { view: true, create: false, edit: false, delete: false },
  estoque: { view: true, create: false, edit: false, descarte: false },
  operacoes: { entregas: true, transferencias_enviar: false, transferencias_receber: false },
  sst: { treinamentos: false, aso: false },
  relatorios: { ficha_epi: true, historico_financeiro: false, medidas_disciplinares: false },
  configuracoes: { gerenciar_usuarios: false }
};

export const ADMIN_PERMISSIONS: UserPermissions = {
  dashboard: { view: true },
  cadastros: { view: true, create: true, edit: true, delete: true },
  estoque: { view: true, create: true, edit: true, descarte: true },
  operacoes: { entregas: true, transferencias_enviar: true, transferencias_receber: true },
  sst: { treinamentos: true, aso: true },
  relatorios: { ficha_epi: true, historico_financeiro: true, medidas_disciplinares: true },
  configuracoes: { gerenciar_usuarios: true }
};

export const rbacService = {
  async fetchUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .is('deleted_at', null)
      .order('full_name');
    if (error) throw error;
    return (data || []) as User[];
  },

  async updateUserPermissions(userId: string, permissions: UserPermissions, role?: UserRole) {
    const updatePayload: any = { permissions };
    if (role) updatePayload.role = role;

    const { data, error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as User;
  },

  async createUser(payload: {
    email: string;
    full_name: string;
    role: UserRole;
    permissions?: UserPermissions;
    password?: string;
  }) {
    // 1. Criar usuário no auth do Supabase
    const userPermissions = payload.permissions || (payload.role === 'ADMIN' ? ADMIN_PERMISSIONS : DEFAULT_PERMISSIONS);
    
    // Tentativa via Supabase Auth SignUp
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password || 'Engenharq@2026',
      options: {
        data: {
          full_name: payload.full_name,
          role: payload.role
        }
      }
    });

    if (authError) throw authError;

    if (authData.user) {
      // Inserir / Atualizar na tabela public.users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          email: payload.email,
          full_name: payload.full_name,
          role: (payload.role === 'VIEWER' ? 'SITE_MANAGER' : payload.role) as any,
          permissions: userPermissions as any
        })
        .select()
        .single();

      if (userError) throw userError;
      return userData as User;
    }

    throw new Error('Não foi possível obter dados do usuário criado.');
  },

  hasPermission(permissions: UserPermissions | undefined, moduleKey: string, actionKey: string = 'view'): boolean {
    if (!permissions) return true; // Se não houver restrição explícita, permite visualização básica
    const modulePerm = permissions[moduleKey];
    if (typeof modulePerm === 'boolean') return modulePerm;
    if (typeof modulePerm === 'object' && modulePerm !== null) {
      return !!modulePerm[actionKey];
    }
    return false;
  }
};
