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

  async updateUserPermissions(
    userId: string,
    permissions: UserPermissions,
    role?: UserRole,
    custom_role?: string | null,
    full_name?: string
  ) {
    const updatePayload: any = { permissions, updated_at: new Date().toISOString() };
    if (role) updatePayload.role = role === 'VIEWER' ? 'SITE_MANAGER' : role;
    if (custom_role !== undefined) updatePayload.custom_role = custom_role;
    if (full_name) updatePayload.full_name = full_name;

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
    custom_role?: string | null;
    permissions?: UserPermissions;
    password?: string;
  }) {
    const userPermissions = payload.permissions || (payload.role === 'ADMIN' ? ADMIN_PERMISSIONS : DEFAULT_PERMISSIONS);
    const dbRole = (payload.role === 'VIEWER' ? 'SITE_MANAGER' : payload.role);

    // 1. Executa via RPC SECURITY DEFINER (não desloga a sessão do administrador e confirma o e-mail imediatamente)
    try {
      const { data, error } = await supabase.rpc('admin_create_user', {
        new_email: payload.email.trim(),
        new_password: payload.password || 'Engenharq@2026',
        new_full_name: payload.full_name.trim(),
        new_role: dbRole as any,
        new_custom_role: payload.custom_role ? payload.custom_role.trim() : null,
        new_permissions: userPermissions
      });

      if (!error && data) {
        return data as unknown as User;
      }
      if (error) {
        console.warn('admin_create_user RPC retornou erro:', error.message);
        throw error;
      }
    } catch (rpcErr: any) {
      // Se for validação (duplicidade ou permissão), propaga imediatamente
      if (rpcErr.message && (rpcErr.message.includes('já existe') || rpcErr.message.includes('Apenas administradores') || rpcErr.message.includes('obrigatório'))) {
        throw rpcErr;
      }

      // 2. Fallback via client-side caso RPC falhe
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password || 'Engenharq@2026',
        options: {
          data: {
            full_name: payload.full_name,
            role: dbRole,
            custom_role: payload.custom_role
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .upsert({
            id: authData.user.id,
            email: payload.email,
            full_name: payload.full_name,
            role: dbRole as any,
            custom_role: payload.custom_role || null,
            permissions: userPermissions as any
          })
          .select()
          .single();

        if (userError) throw userError;
        return userData as User;
      }
      throw rpcErr;
    }

    throw new Error('Não foi possível obter dados do usuário criado.');
  },

  async deactivateUser(userId: string) {
    const { data, error } = await supabase.rpc('admin_deactivate_user', {
      target_user_id: userId
    });
    if (error) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', userId);
      if (updateError) throw updateError;
      return true;
    }
    return data;
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
