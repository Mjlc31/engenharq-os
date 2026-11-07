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

export const ALMOXARIFADO_PERMISSIONS: UserPermissions = {
  dashboard: { view: false },
  cadastros: { view: true, create: false, edit: false, delete: false },
  estoque: { view: true, create: true, edit: true, descarte: false },
  operacoes: { entregas: true, transferencias_enviar: true, transferencias_receber: true },
  sst: { treinamentos: false, aso: false },
  relatorios: { ficha_epi: false, historico_financeiro: false, medidas_disciplinares: false },
  configuracoes: { gerenciar_usuarios: false }
};

export const MANAGEMENT_ROLES: UserRole[] = ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'];
export const GOVERNANCE_ROLES: UserRole[] = ['ADMIN', 'SAFETY_ENGINEER'];
export const ALL_ROLES: UserRole[] = [...MANAGEMENT_ROLES, 'ALMOXARIFADO'];

/** Papel usado nas telas: cargo customizado de almoxarife rebaixa para ALMOXARIFADO (exceto ADMIN). Nulo = sem acesso. */
export function effectiveRole(role: UserRole | null, customRole: string | null): UserRole | null {
  if (role === 'ADMIN') return role;
  if (role === 'ALMOXARIFADO' || customRole?.toLowerCase().includes('almoxarif')) return 'ALMOXARIFADO';
  return role;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  SAFETY_ENGINEER: 'Engenheiro SST',
  SITE_MANAGER: 'Encarregado / Obra',
  ALMOXARIFADO: 'Almoxarifado',
  VIEWER: 'Visualizador'
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
    const userPermissions = payload.permissions || (
      payload.role === 'ADMIN' || payload.role === 'SAFETY_ENGINEER'
        ? ADMIN_PERMISSIONS
        : payload.role === 'ALMOXARIFADO'
          ? ALMOXARIFADO_PERMISSIONS
          : DEFAULT_PERMISSIONS
    );
    const dbRole = (payload.role === 'VIEWER' ? 'SITE_MANAGER' : payload.role);

    // Só via RPC: ela aplica a hierarquia (can_manage_role). Sem fallback de signUp, que burlava essa regra.
    const { data, error } = await supabase.rpc('admin_create_user', {
      new_email: payload.email.trim(),
      new_password: payload.password || 'Engenharq@2026',
      new_full_name: payload.full_name.trim(),
      new_role: dbRole as any,
      new_custom_role: payload.custom_role ? payload.custom_role.trim() : null,
      new_permissions: userPermissions
    });
    if (error) throw error;
    if (data) return data as unknown as User;

    throw new Error('Não foi possível obter dados do usuário criado.');
  },

  async deactivateUser(userId: string) {
    const { data, error } = await supabase.rpc('admin_deactivate_user', {
      target_user_id: userId
    });
    if (error) throw error;
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
