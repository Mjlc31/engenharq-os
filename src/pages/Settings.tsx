import React from 'react';
import { useAuth } from '../components/AuthProvider';
import { Settings as SettingsIcon, User, Shield, Key } from 'lucide-react';

export function Settings() {
  const { session, role } = useAuth();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Configurações</h1>
        <p className="text-muted mt-2">Gerencie suas preferências e perfil.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-surface border border-border rounded-xl p-6 text-center">
            <div className="w-24 h-24 bg-surface-hover rounded-full mx-auto flex items-center justify-center mb-4 border-2 border-primary/20">
              <User className="w-12 h-12 text-muted" />
            </div>
            <h3 className="font-bold text-foreground text-lg">{session?.user?.email}</h3>
            <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
              {role === 'ADMIN' ? 'Administrador' : role === 'SAFETY_ENGINEER' ? 'Engenheiro' : 'Visualizador'}
            </span>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Permissões & Perfis</h3>
            </div>
            <div className="p-12 text-center text-muted">
              <SettingsIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium text-foreground">Módulo em Desenvolvimento</p>
              <p className="mt-2">O painel de gerenciamento de níveis de acesso e configurações globais será liberado na próxima atualização do sistema.</p>
            </div>
          </div>
          
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold flex items-center gap-2"><Key className="w-5 h-5 text-primary" /> Segurança</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted">A alteração de senha deve ser realizada através do e-mail de redefinição.</p>
              <button disabled className="mt-4 px-4 py-2 bg-surface-hover text-muted rounded-md cursor-not-allowed">Alterar Senha</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
