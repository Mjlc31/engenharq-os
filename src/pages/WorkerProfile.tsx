import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Worker, WorkerRole, ConstructionSite, EpiAssignment } from '../types';
import { ArrowLeft, Save, AlertCircle, Plus, Briefcase, Camera, UserCircle, Download, PenTool, Archive, HardHat } from 'lucide-react';
import { generateEpiRecordPdf } from '../lib/pdfGenerator';
import { SignaturePadModal } from '../components/ui/SignaturePadModal';

export function WorkerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [roles, setRoles] = useState<WorkerRole[]>([]);
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [epiAssignments, setEpiAssignments] = useState<EpiAssignment[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit states
  const [formData, setFormData] = useState<Partial<Worker>>({});
  
  // New Role states
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleStartDate, setNewRoleStartDate] = useState('');

  // Tabs state
  const [activeTab, setActiveTab] = useState<'profile' | 'epi'>(searchParams.get('tab') === 'epi' ? 'epi' : 'profile');

  // Signature state
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!id) return;

      const [workerRes, rolesRes, sitesRes, epiRes] = await Promise.all([
        supabase.from('workers').select('*, site:construction_sites(*)').eq('id', id).single(),
        supabase.from('worker_roles').select('*').eq('worker_id', id).order('start_date', { ascending: false }),
        supabase.from('construction_sites').select('*').order('name'),
        supabase.from('epi_assignments').select('*, catalog:epi_catalog(*)').eq('worker_id', id).order('assigned_at', { ascending: false })
      ]);

      if (workerRes.error) throw workerRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (sitesRes.error) throw sitesRes.error;

      setWorker(workerRes.data as Worker);
      setFormData(workerRes.data as Worker);
      setRoles(rolesRes.data as WorkerRole[]);
      setSites(sitesRes.data as ConstructionSite[]);
      setEpiAssignments(epiRes.data || []);
    } catch (err: unknown) {
      console.error('Erro ao buscar perfil:', err);
      setError('Erro Supabase: ' + (err instanceof Error ? err.message : JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleChange = (field: keyof Worker, value: Worker[keyof Worker]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { site, roles, created_at, ...updateData } = formData as Omit<Worker, 'id'> & { id?: string }; // remove nested relations and read-only before update
      
      const { error: updateError } = await supabase
        .from('workers')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;
      
      setSuccess('Perfil atualizado com sucesso!');
      await loadData();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error('Erro ao atualizar perfil:', err);
      setError('Falha ao atualizar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName || !newRoleStartDate) return;
    
    setError(null);
    setSuccess(null);

    try {
      const { error: roleError } = await supabase.from('worker_roles').insert([{
        worker_id: id,
        role_name: newRoleName,
        start_date: newRoleStartDate
      }]);

      if (roleError) throw roleError;

      setIsAddingRole(false);
      setNewRoleName('');
      setNewRoleStartDate('');
      await loadData();
      setSuccess('Cargo adicionado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error('Erro ao adicionar cargo:', err);
      setError('Falha ao registrar novo cargo.');
    }
  };

  const handleSaveSignature = async (dataUrl: string) => {
    if (!selectedAssignmentId) return;
    try {
      const { error: sigError } = await supabase
        .from('epi_assignments')
        .update({ digital_signature_url: dataUrl })
        .eq('id', selectedAssignmentId);

      if (sigError) throw sigError;
      
      setSuccess('Assinatura salva com sucesso!');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Erro ao salvar assinatura:', err);
      setError('Erro ao salvar assinatura digital.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 text-center text-muted flex items-center justify-center gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        <span>Carregando perfil...</span>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="p-8 text-center text-muted">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg flex items-center justify-center gap-2 mb-6 mx-auto max-w-lg">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
        <p>Trabalhador não encontrado.</p>
        <button onClick={() => navigate('/workers')} className="mt-4 text-primary underline">Voltar para a lista</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/workers')}
            className="bg-surface border border-border hover:bg-surface-hover text-foreground p-2 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          {worker.reference_photo_url && (
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border bg-surface-hover shrink-0">
              <img src={worker.reference_photo_url} alt={worker.full_name} className="w-full h-full object-cover" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{worker.full_name}</h1>
              {worker.status && (
                <span className={`px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full ${
                  worker.status.toLowerCase() === 'ativo' 
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                    : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                }`}>
                  {worker.status}
                </span>
              )}
            </div>
            <p className="text-muted mt-1">
              Matrícula: {worker.registration_number} • CPF: {worker.cpf}
            </p>
          </div>
        </div>
        
        {/* Conformidade */}
        <div className="flex flex-col sm:flex-row gap-2">
           <div className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium ${worker.apt_for_height_and_confined_space ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-surface border-border text-muted'}`}>
             <AlertCircle className="w-4 h-4" />
             {worker.apt_for_height_and_confined_space ? 'Apto Altura/Confinado' : 'Não Apto Altura/Confinado'}
           </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 font-medium text-sm transition-colors relative ${activeTab === 'profile' ? 'text-primary' : 'text-muted hover:text-foreground'}`}
        >
          Dados e Cargos
          {activeTab === 'profile' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab('epi')}
          className={`pb-3 font-medium text-sm transition-colors relative ${activeTab === 'epi' ? 'text-primary' : 'text-muted hover:text-foreground'}`}
        >
          Ficha de EPI
          {activeTab === 'epi' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-3 rounded-lg flex items-center gap-2">
          <div className="w-5 h-5 shrink-0 flex items-center justify-center rounded-full bg-green-500 text-background">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      {activeTab === 'profile' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Profile Info Form */}
          <div className="xl:col-span-2 bg-surface border border-border rounded-xl p-6">
            <h3 className="text-lg font-medium mb-6 flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-primary" /> Dados Pessoais e Profissionais
            </h3>
            
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name || ''}
                    onChange={e => handleChange('full_name', e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">CPF</label>
                  <input
                    type="text"
                    required
                    value={formData.cpf || ''}
                    onChange={e => handleChange('cpf', e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">Matrícula</label>
                  <input
                    type="text"
                    required
                    value={formData.registration_number || ''}
                    onChange={e => handleChange('registration_number', e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">Obra Atual</label>
                  <select
                    value={formData.current_site_id || ''}
                    onChange={e => handleChange('current_site_id', e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="">Não alocado</option>
                    {sites.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">Cargo Inicial</label>
                  <input
                    type="text"
                    value={formData.initial_role || ''}
                    onChange={e => handleChange('initial_role', e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">Data de Admissão</label>
                  <input
                    type="date"
                    value={formData.admission_date || ''}
                    onChange={e => handleChange('admission_date', e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">Data de Nascimento</label>
                  <input
                    type="date"
                    value={formData.birth_date || ''}
                    onChange={e => handleChange('birth_date', e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">Setor de Trabalho</label>
                  <input
                    type="text"
                    value={formData.work_sector || ''}
                    onChange={e => handleChange('work_sector', e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">Tamanho Uniforme</label>
                  <input
                    type="text"
                    value={formData.uniform_size || ''}
                    onChange={e => handleChange('uniform_size', e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">Tamanho Bota</label>
                  <input
                    type="text"
                    value={formData.boot_size || ''}
                    onChange={e => handleChange('boot_size', e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">Contato (Telefone)</label>
                  <input
                    type="text"
                    value={formData.phone_contact || ''}
                    onChange={e => handleChange('phone_contact', e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-2 flex items-center pt-8">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={formData.apt_for_height_and_confined_space || false}
                      onChange={e => handleChange('apt_for_height_and_confined_space', e.target.checked)}
                      className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-background"
                    />
                    Apto para Altura e Espaço Confinado
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">URL da Foto de Referência</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.reference_photo_url || ''}
                    onChange={e => handleChange('reference_photo_url', e.target.value)}
                    className="flex-1 bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                    placeholder="https://..."
                  />
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={async (ev) => {
                      const file = ev.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        const dataUrl = e.target?.result as string;
                        handleChange('reference_photo_url', dataUrl);
                      };
                      reader.readAsDataURL(file);
                      ev.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="bg-surface-hover border border-border p-2 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Capturar foto de referência"
                  >
                    <Camera className="w-5 h-5 text-muted" />
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary hover:bg-primary-dark text-background font-medium py-2 px-6 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>

          {/* Roles History */}
          <div className="bg-surface border border-border rounded-xl flex flex-col h-fit max-h-[800px]">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" /> Histórico de Cargos
              </h3>
              <button
                onClick={() => setIsAddingRole(!isAddingRole)}
                className="bg-surface-hover border border-border text-foreground p-1.5 rounded-md hover:bg-zinc-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {isAddingRole && (
                <form onSubmit={handleAddRole} className="bg-background border border-border p-4 rounded-lg mb-6 space-y-4">
                  <h4 className="text-sm font-bold text-foreground">Novo Cargo</h4>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted">Nome do Cargo</label>
                    <input
                      type="text"
                      required
                      value={newRoleName}
                      onChange={e => setNewRoleName(e.target.value)}
                      className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted">Data de Início</label>
                    <input
                      type="date"
                      required
                      value={newRoleStartDate}
                      onChange={e => setNewRoleStartDate(e.target.value)}
                      className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingRole(false)}
                      className="text-xs text-muted hover:text-foreground px-3 py-1.5 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-primary hover:bg-primary-dark text-background text-xs font-bold py-1.5 px-4 rounded transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>
                </form>
              )}

              {roles.length === 0 ? (
                <div className="text-center text-muted py-8 text-sm">
                  Nenhum histórico de cargos registrado.
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:ml-[9px] md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  {roles.map((role, idx) => (
                    <div key={role.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full border border-primary bg-background text-primary shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      </div>
                      <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-background p-3 rounded border border-border shadow-sm">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div className="font-bold text-foreground text-sm">{role.role_name}</div>
                          <time className="font-mono text-xs text-primary">{role.start_date}</time>
                        </div>
                        <div className="text-xs text-muted">
                          Registrado em {new Date(role.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-foreground">Ficha de Entrega de EPIs</h3>
              <p className="text-sm text-muted">Visualize os equipamentos sob posse do funcionário e exporte o recibo oficial em PDF.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/scanner')}
                className="bg-surface hover:bg-surface-hover text-foreground font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 border border-border text-sm"
              >
                <Plus className="w-4 h-4" />
                Vincular EPI
              </button>
              <button 
                onClick={() => generateEpiRecordPdf(worker, epiAssignments)}
                className="bg-zinc-800 hover:bg-zinc-700 text-primary font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 border border-primary/20 text-sm"
              >
                <Download className="w-4 h-4" />
                Imprimir Ficha (PDF)
              </button>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-x-auto">
            {epiAssignments.length === 0 ? (
              <div className="p-12 text-center text-muted">
                Este trabalhador ainda não possui EPIs designados.
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-surface-hover text-muted uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-3">EPI / CA</th>
                    <th className="px-6 py-3">Data de Entrega</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Assinatura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {epiAssignments.map(assignment => (
                    <tr key={assignment.id} className="hover:bg-surface-hover/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{assignment.catalog?.name || 'EPI Desconhecido'}</div>
                        <div className="text-xs text-muted">CA: {assignment.catalog?.ca_number} • Cód: {assignment.catalog?.code}</div>
                      </td>
                      <td className="px-6 py-4">
                        {new Date(assignment.assigned_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {assignment.returned_at ? (
                          <span className="bg-blue-500/10 border border-blue-500/20 text-blue-500 px-2 py-1 rounded text-xs font-medium">Devolvido</span>
                        ) : (
                          <span className="bg-green-500/10 border border-green-500/20 text-green-500 px-2 py-1 rounded text-xs font-medium">Em Uso</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {assignment.digital_signature_url ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                            Assinado
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedAssignmentId(assignment.id);
                              setIsSignatureModalOpen(true);
                            }}
                            className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:text-primary-dark transition-colors px-3 py-1.5 rounded-md border border-primary bg-primary/10 hover:bg-primary/20"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            Assinar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>
      )}

      <SignaturePadModal
        isOpen={isSignatureModalOpen}
        onClose={() => {
          setIsSignatureModalOpen(false);
          setSelectedAssignmentId(null);
        }}
        onSave={handleSaveSignature}
        title="Assinatura do Recebimento"
      />
    </div>
  );
}
