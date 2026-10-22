import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { Settings as SettingsIcon, User as UserIcon, Shield, Key, Plus, Check, X, ShieldCheck, Edit3, Users, Search, Trash2, Briefcase, AlertTriangle } from 'lucide-react';
import { rbacService, DEFAULT_PERMISSIONS, ADMIN_PERMISSIONS } from '../services/rbacService';
import { User, UserPermissions, UserRole } from '../types';
import { useToast } from '../components/ui/Toast';
import { SystemSettingsForm } from '../components/features/settings/SystemSettingsForm';

export const PRESET_FUNCTIONS: { label: string; defaultRole: UserRole }[] = [
  { label: 'Encarregado de Obra', defaultRole: 'SITE_MANAGER' },
  { label: 'Engenheiro SST', defaultRole: 'SAFETY_ENGINEER' },
  { label: 'Técnico de Segurança do Trabalho (TST)', defaultRole: 'SAFETY_ENGINEER' },
  { label: 'Almoxarife / Estoquista', defaultRole: 'SITE_MANAGER' },
  { label: 'Mestre de Obras', defaultRole: 'SITE_MANAGER' },
  { label: 'Engenheiro Residente', defaultRole: 'SAFETY_ENGINEER' },
  { label: 'Administrador do Sistema', defaultRole: 'ADMIN' },
  { label: 'Visualizador / Auditor', defaultRole: 'VIEWER' }
];

export function Settings() {
  const { session, role } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'USERS' | 'SYSTEM'>('USERS');

  // Edit Permissions Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [tempPermissions, setTempPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS);
  const [tempRole, setTempRole] = useState<UserRole>('SITE_MANAGER');
  const [tempCustomRole, setTempCustomRole] = useState('');
  const [tempFullName, setTempFullName] = useState('');
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [deactivateConfirmUser, setDeactivateConfirmUser] = useState<User | null>(null);

  // New User Modal
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('SITE_MANAGER');
  const [newCustomRole, setNewCustomRole] = useState('');
  const [newPassword, setNewPassword] = useState('Engenharq@2026');
  const [creatingUser, setCreatingUser] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await rbacService.fetchUsers();
      setUsers(data);
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setTempRole(u.role);
    setTempCustomRole(u.custom_role || roleLabels[u.role] || '');
    setTempFullName(u.full_name || '');
    setTempPermissions(u.permissions || (u.role === 'ADMIN' ? ADMIN_PERMISSIONS : DEFAULT_PERMISSIONS));
  };

  const handleTogglePermission = (moduleKey: keyof UserPermissions, actionKey: string) => {
    setTempPermissions(prev => {
      const currentModule = (prev[moduleKey] as Record<string, boolean>) || {};
      return {
        ...prev,
        [moduleKey]: {
          ...currentModule,
          [actionKey]: !currentModule[actionKey]
        }
      };
    });
  };

  const handleSavePermissions = async () => {
    if (!editingUser) return;
    setSavingPermissions(true);
    try {
      await rbacService.updateUserPermissions(
        editingUser.id,
        tempPermissions,
        tempRole,
        tempCustomRole.trim() || null,
        tempFullName.trim() || undefined
      );
      toast({ type: 'success', title: 'Sucesso', message: 'Dados e permissões atualizados com sucesso!' });
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message || 'Falha ao atualizar permissões.' });
    } finally {
      setSavingPermissions(false);
    }
  };

  const handlePromptDeactivate = (u: User) => {
    if (u.id === session?.user?.id) {
      toast({ type: 'warning', title: 'Atenção', message: 'Você não pode desativar seu próprio usuário administrador.' });
      return;
    }
    setDeactivateConfirmUser(u);
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateConfirmUser) return;
    const target = deactivateConfirmUser;
    setDeactivatingId(target.id);
    try {
      await rbacService.deactivateUser(target.id);
      toast({ type: 'success', title: 'Usuário Desativado', message: 'O usuário foi desativado com sucesso.' });
      if (editingUser?.id === target.id) setEditingUser(null);
      setDeactivateConfirmUser(null);
      await loadUsers();
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message || 'Falha ao desativar usuário.' });
    } finally {
      setDeactivatingId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) {
      toast({ type: 'warning', title: 'Campo Obrigatório', message: 'Informe o nome completo do usuário.' });
      return;
    }
    if (!newEmail.trim()) {
      toast({ type: 'warning', title: 'Campo Obrigatório', message: 'Informe o e-mail do usuário.' });
      return;
    }
    if (!newCustomRole.trim()) {
      toast({ type: 'warning', title: 'Campo Obrigatório', message: 'Digite ou selecione a função / cargo do usuário.' });
      return;
    }

    setCreatingUser(true);
    try {
      await rbacService.createUser({
        email: newEmail.trim(),
        full_name: newFullName.trim(),
        role: newRole,
        custom_role: newCustomRole.trim(),
        password: newPassword,
        permissions: newRole === 'ADMIN' ? ADMIN_PERMISSIONS : DEFAULT_PERMISSIONS
      });
      toast({ type: 'success', title: 'Usuário Criado', message: `Novo usuário ${newFullName} registrado com sucesso!` });
      setIsNewUserModalOpen(false);
      setNewEmail('');
      setNewFullName('');
      setNewCustomRole('');
      setNewRole('SITE_MANAGER');
      setNewPassword('Engenharq@2026');
      await loadUsers();
    } catch (err: any) {
      console.error('Erro ao criar usuário:', err);
      toast({ type: 'error', title: 'Erro ao Criar Usuário', message: err.message || 'Falha ao registrar usuário.' });
    } finally {
      setCreatingUser(false);
    }
  };

  const roleLabels: Record<UserRole, string> = {
    ADMIN: 'Administrador',
    SAFETY_ENGINEER: 'Engenheiro SST',
    SITE_MANAGER: 'Encarregado / Obra',
    VIEWER: 'Visualizador'
  };

  const roleColors: Record<UserRole, string> = {
    ADMIN: 'bg-primary/10 text-primary border-primary/20',
    SAFETY_ENGINEER: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    SITE_MANAGER: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    VIEWER: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
  };

  const filteredUsers = users.filter(u => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.custom_role && u.custom_role.toLowerCase().includes(q)) ||
      (roleLabels[u.role] && roleLabels[u.role].toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Configurações & Governança</h1>
          <p className="text-muted mt-1">Gerencie os acessos, permissões granulares e regras do sistema.</p>
        </div>
      </div>

      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('USERS')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'USERS' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Usuários & Permissões (RBAC)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SYSTEM')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'SYSTEM' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          Regras do Sistema & NR-6
        </button>
      </div>

      {activeTab === 'SYSTEM' ? (
        <SystemSettingsForm />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-surface border border-border rounded-xl p-6 text-center shadow-sm">
            <div className="w-24 h-24 bg-surface-hover rounded-full mx-auto flex items-center justify-center mb-4 border-2 border-primary/20">
              <UserIcon className="w-12 h-12 text-primary" />
            </div>
            <h3 className="font-bold text-foreground text-lg truncate">{session?.user?.email}</h3>
            <span className={`inline-block mt-2 px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider border ${role ? roleColors[role as UserRole] || 'bg-zinc-500/10 text-zinc-400' : 'bg-zinc-500/10 text-zinc-400'}`}>
              {role ? roleLabels[role as UserRole] || role : 'Visualizador'}
            </span>
            <div className="mt-4 pt-4 border-t border-border text-xs text-muted text-left space-y-2">
              <div><strong className="text-foreground">Sessão:</strong> Ativa</div>
              <div><strong className="text-foreground">Cidade / Base:</strong> Maceió, AL</div>
              <div><strong className="text-foreground">SGEPI Versão:</strong> v2.7.0</div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6">
            <h3 className="text-base font-bold flex items-center gap-2 mb-3 text-foreground">
              <Key className="w-4 h-4 text-primary" /> Segurança & Acesso
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              As senhas são criptografadas com hash bcrypt no Supabase Auth. Para redefinir senha individual, utilize a recuperação de credencial.
            </p>
          </div>
        </div>

        {/* Permissões & Perfis Card */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <ShieldCheck className="w-5 h-5 text-primary" /> Usuários & Permissões Granulares (RBAC)
                </h3>
                <p className="text-xs text-muted mt-1">Controle o acesso a cada módulo e ação dentro do EngenharQ OS.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewUserModalOpen(true)}
                className="px-3 py-2 bg-primary text-background font-bold rounded-md text-xs hover:bg-primary-dark transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> Novo Usuário
              </button>
            </div>

            {/* Search and Action Bar */}
            <div className="p-4 border-b border-border bg-surface-hover/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nome, email ou cargo..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-md text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary"
                />
              </div>
              <div className="text-xs text-muted font-medium self-end sm:self-auto">
                Total: <strong className="text-foreground">{filteredUsers.length}</strong> de {users.length} usuários ativos
              </div>
            </div>

            <div className="p-0">
              {loading ? (
                <div className="p-12 text-center text-muted flex items-center justify-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  Carregando usuários e permissões...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-muted text-sm">
                  {userSearch ? 'Nenhum usuário encontrado com os filtros aplicados.' : 'Nenhum usuário cadastrado na base de dados.'}
                </div>
              ) : (
                <div className="divide-y divide-border overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-surface-hover text-muted uppercase font-semibold">
                      <tr>
                        <th className="px-6 py-3">Usuário</th>
                        <th className="px-6 py-3">Cargo / Função</th>
                        <th className="px-6 py-3">Nível de Acesso (RBAC)</th>
                        <th className="px-6 py-3">Módulos Liberados</th>
                        <th className="px-6 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredUsers.map(u => {
                        const perm = u.permissions || {};
                        const modulesAllowed = Object.entries(perm)
                          .filter(([_, val]) => {
                            if (typeof val === 'boolean') return val;
                            if (typeof val === 'object' && val !== null) {
                              return Object.values(val).some(Boolean);
                            }
                            return false;
                          })
                          .map(([key]) => key);

                        const displayedCustomRole = u.custom_role || roleLabels[u.role] || u.role;
                        const isCurrentUser = u.id === session?.user?.id;

                        return (
                          <tr key={u.id} className="hover:bg-surface-hover/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                                {u.full_name || 'Sem Nome'}
                                {isCurrentUser && (
                                  <span className="text-[10px] px-1.5 py-0.2 bg-primary/20 text-primary rounded font-mono font-normal">você</span>
                                )}
                              </div>
                              <div className="text-xs text-muted font-mono">{u.email}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                <Briefcase className="w-3.5 h-3.5 text-muted shrink-0" />
                                <span className="font-medium text-foreground text-xs">
                                  {displayedCustomRole}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${roleColors[u.role] || 'bg-zinc-500/10 text-zinc-400'}`}>
                                {roleLabels[u.role] || u.role}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {modulesAllowed.length === 0 ? (
                                  <span className="text-muted text-[11px]">Nenhum</span>
                                ) : (
                                  modulesAllowed.slice(0, 4).map(m => (
                                    <span key={m} className="px-1.5 py-0.5 rounded bg-surface-hover border border-border text-[10px] text-muted capitalize">
                                      {m}
                                    </span>
                                  ))
                                )}
                                {modulesAllowed.length > 4 && (
                                  <span className="text-[10px] text-muted self-center">+{modulesAllowed.length - 4}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(u)}
                                  className="px-3 py-1.5 bg-surface hover:bg-surface-hover text-primary border border-primary/30 rounded-md font-semibold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                                  title="Editar perfil, cargo e permissões"
                                >
                                  <Edit3 className="w-3.5 h-3.5" /> Editar
                                </button>
                                {!isCurrentUser && (
                                  <button
                                    type="button"
                                    disabled={deactivatingId === u.id}
                                    onClick={() => handlePromptDeactivate(u)}
                                    className="p-1.5 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-md border border-transparent hover:border-red-500/20 transition-colors cursor-pointer"
                                    title="Desativar usuário"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Modal Editar Permissões Granulares */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground text-base">Editar Usuário & Permissões: {editingUser.full_name}</h3>
                <p className="text-xs text-muted font-mono">{editingUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-muted hover:text-foreground p-1 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 flex-1">
              {/* Nome Completo */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Nome Completo</label>
                <input
                  type="text"
                  value={tempFullName}
                  onChange={e => setTempFullName(e.target.value)}
                  placeholder="Nome completo do usuário"
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              {/* Cargo / Função Digitável */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Cargo / Função Digitável
                  </label>
                  <span className="text-[10px] text-muted">Personalize livremente a função</span>
                </div>
                <input
                  type="text"
                  list="roles-suggestions-edit"
                  placeholder="Ex: Técnico em Segurança, Almoxarife, Encarregado..."
                  value={tempCustomRole}
                  onChange={e => setTempCustomRole(e.target.value)}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
                <datalist id="roles-suggestions-edit">
                  {PRESET_FUNCTIONS.map(p => (
                    <option key={p.label} value={p.label} />
                  ))}
                </datalist>

                {/* Sugestões rápidas de cargos pré-cadastrados */}
                <div className="pt-1">
                  <span className="text-[10px] text-muted block mb-1">Sugestões rápidas:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_FUNCTIONS.map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setTempCustomRole(p.label);
                          setTempRole(p.defaultRole);
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                          tempCustomRole === p.label
                            ? 'bg-primary/20 text-primary border-primary font-bold'
                            : 'bg-surface hover:bg-surface-hover text-muted hover:text-foreground border-border'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Perfil de Acesso Geral */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Perfil de Acesso Geral (RBAC)</label>
                <select
                  value={tempRole}
                  onChange={e => setTempRole(e.target.value as UserRole)}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="SITE_MANAGER">Encarregado / Obra (Almoxarifado & Entregas)</option>
                  <option value="SAFETY_ENGINEER">Engenheiro / Técnico SST (Treinamentos & ASO)</option>
                  <option value="ADMIN">Administrador (Acesso Total)</option>
                  <option value="VIEWER">Visualizador (Somente Leitura)</option>
                </select>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Matriz de Permissões Granulares</h4>
                
                {/* Cadastros */}
                <div className="p-3 bg-background border border-border rounded-lg space-y-2">
                  <div className="font-bold text-xs text-foreground">1. Cadastros (Obras & Colaboradores)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {(['view', 'create', 'edit', 'delete'] as const).map(act => (
                      <label key={act} className="flex items-center gap-2 cursor-pointer text-muted hover:text-foreground">
                        <input
                          type="checkbox"
                          checked={!!tempPermissions.cadastros?.[act]}
                          onChange={() => handleTogglePermission('cadastros', act)}
                          className="w-4 h-4 rounded border-border text-primary cursor-pointer"
                        />
                        <span className="capitalize">{act === 'view' ? 'Visualizar' : act === 'create' ? 'Cadastrar' : act === 'edit' ? 'Editar' : 'Excluir'}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Estoque */}
                <div className="p-3 bg-background border border-border rounded-lg space-y-2">
                  <div className="font-bold text-xs text-foreground">2. Estoque (NR-6)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {(['view', 'create', 'edit', 'descarte'] as const).map(act => (
                      <label key={act} className="flex items-center gap-2 cursor-pointer text-muted hover:text-foreground">
                        <input
                          type="checkbox"
                          checked={!!tempPermissions.estoque?.[act]}
                          onChange={() => handleTogglePermission('estoque', act)}
                          className="w-4 h-4 rounded border-border text-primary cursor-pointer"
                        />
                        <span className="capitalize">{act === 'view' ? 'Visualizar' : act === 'create' ? 'Adicionar Lote' : act === 'edit' ? 'Editar' : 'Descarte'}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Operações */}
                <div className="p-3 bg-background border border-border rounded-lg space-y-2">
                  <div className="font-bold text-xs text-foreground">3. Operações & Transferências</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-muted hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={!!tempPermissions.operacoes?.entregas}
                        onChange={() => handleTogglePermission('operacoes', 'entregas')}
                        className="w-4 h-4 rounded border-border text-primary cursor-pointer"
                      />
                      <span>Entregas de EPI</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-muted hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={!!tempPermissions.operacoes?.transferencias_enviar}
                        onChange={() => handleTogglePermission('operacoes', 'transferencias_enviar')}
                        className="w-4 h-4 rounded border-border text-primary cursor-pointer"
                      />
                      <span>Enviar Transferência</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-muted hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={!!tempPermissions.operacoes?.transferencias_receber}
                        onChange={() => handleTogglePermission('operacoes', 'transferencias_receber')}
                        className="w-4 h-4 rounded border-border text-primary cursor-pointer"
                      />
                      <span>Receber Transferência</span>
                    </label>
                  </div>
                </div>

                {/* SST */}
                <div className="p-3 bg-background border border-border rounded-lg space-y-2">
                  <div className="font-bold text-xs text-foreground">4. Saúde e Segurança (SST)</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-muted hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={!!tempPermissions.sst?.treinamentos}
                        onChange={() => handleTogglePermission('sst', 'treinamentos')}
                        className="w-4 h-4 rounded border-border text-primary cursor-pointer"
                      />
                      <span>Gestão de Treinamentos (NR)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-muted hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={!!tempPermissions.sst?.aso}
                        onChange={() => handleTogglePermission('sst', 'aso')}
                        className="w-4 h-4 rounded border-border text-primary cursor-pointer"
                      />
                      <span>Controle de ASO</span>
                    </label>
                  </div>
                </div>

                {/* Relatórios */}
                <div className="p-3 bg-background border border-border rounded-lg space-y-2">
                  <div className="font-bold text-xs text-foreground">5. Relatórios & Documentos</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-muted hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={!!tempPermissions.relatorios?.ficha_epi}
                        onChange={() => handleTogglePermission('relatorios', 'ficha_epi')}
                        className="w-4 h-4 rounded border-border text-primary cursor-pointer"
                      />
                      <span>Ficha EPI (NR-6)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-muted hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={!!tempPermissions.relatorios?.historico_financeiro}
                        onChange={() => handleTogglePermission('relatorios', 'historico_financeiro')}
                        className="w-4 h-4 rounded border-border text-primary cursor-pointer"
                      />
                      <span>Cautela de Cobrança</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-muted hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={!!tempPermissions.relatorios?.medidas_disciplinares}
                        onChange={() => handleTogglePermission('relatorios', 'medidas_disciplinares')}
                        className="w-4 h-4 rounded border-border text-primary cursor-pointer"
                      />
                      <span>Medidas Disciplinares</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border flex items-center justify-between gap-3 bg-surface-hover/20">
              {editingUser.id !== session?.user?.id ? (
                <button
                  type="button"
                  disabled={deactivatingId === editingUser.id}
                  onClick={() => handlePromptDeactivate(editingUser)}
                  className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Desativar Usuário
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingPermissions}
                  onClick={handleSavePermissions}
                  className="px-5 py-2 bg-primary text-background text-sm font-bold rounded-md hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer shadow"
                >
                  {savingPermissions ? (
                    <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Usuário */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">Novo Usuário do Sistema</h3>
                  <p className="text-[11px] text-muted">Cadastre o colaborador e defina seus acessos no SGEPI.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewUserModalOpen(false)}
                className="text-muted hover:text-foreground p-1 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted">E-mail de Acesso *</label>
                <input
                  type="email"
                  required
                  placeholder="usuario@engenharq.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              {/* Cargo / Função Digitável com sugestões */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted">
                    Cargo / Função <span className="text-primary">*</span>
                  </label>
                  <span className="text-[10px] text-primary font-medium">Área digitável</span>
                </div>
                <input
                  type="text"
                  required
                  list="new-roles-suggestions"
                  placeholder="Digite a função (Ex: Almoxarife, Encarregado, Técnico SST...)"
                  value={newCustomRole}
                  onChange={e => {
                    const val = e.target.value;
                    setNewCustomRole(val);
                    const match = PRESET_FUNCTIONS.find(p => p.label.toLowerCase() === val.toLowerCase());
                    if (match) {
                      setNewRole(match.defaultRole);
                    }
                  }}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
                <datalist id="new-roles-suggestions">
                  {PRESET_FUNCTIONS.map(p => (
                    <option key={p.label} value={p.label} />
                  ))}
                </datalist>

                {/* Chips de funções pré-cadastradas */}
                <div className="pt-1">
                  <span className="text-[10px] text-muted block mb-1">Ou selecione uma pré-cadastrada:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_FUNCTIONS.map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setNewCustomRole(p.label);
                          setNewRole(p.defaultRole);
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                          newCustomRole === p.label
                            ? 'bg-primary/20 text-primary border-primary font-bold'
                            : 'bg-surface hover:bg-surface-hover text-muted hover:text-foreground border-border'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Perfil de Acesso Geral */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted">Perfil de Acesso & Permissões Base</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="SITE_MANAGER">Encarregado / Obra (Almoxarifado & Entregas)</option>
                  <option value="SAFETY_ENGINEER">Engenheiro / Técnico SST (Treinamentos & ASO)</option>
                  <option value="ADMIN">Administrador (Acesso Total)</option>
                  <option value="VIEWER">Visualizador (Somente Leitura)</option>
                </select>
                <p className="text-[11px] text-muted">
                  Você poderá customizar permissões individuais detalhadas após o cadastro.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted">Senha Provisória</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono text-xs"
                />
                <p className="text-[10px] text-muted">O usuário poderá alterar a senha após o primeiro acesso.</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-5 py-2 bg-primary text-background text-sm font-bold rounded-md hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer shadow"
                >
                  {creatingUser ? (
                    <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {creatingUser ? 'Cadastrando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Confirmar Desativação de Usuário */}
      {deactivateConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Confirmar Desativação
            </h3>
            <p className="text-sm text-muted mb-6">
              Tem certeza que deseja desativar o usuário <strong className="text-foreground">{deactivateConfirmUser.full_name || deactivateConfirmUser.email}</strong>? Ele perderá imediatamente o acesso ao sistema.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                disabled={deactivatingId === deactivateConfirmUser.id}
                onClick={() => setDeactivateConfirmUser(null)}
                className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deactivatingId === deactivateConfirmUser.id}
                onClick={handleConfirmDeactivate}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {deactivatingId === deactivateConfirmUser.id && (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                )}
                {deactivatingId === deactivateConfirmUser.id ? 'Desativando...' : 'Desativar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

