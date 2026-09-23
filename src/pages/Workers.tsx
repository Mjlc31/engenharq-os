
import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Search, Upload, Download, Edit2, HardHat, ChevronLeft, ChevronRight, Trash2, MapPin, UserCircle2, Mail, Phone, MoreVertical, FileText, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkers } from '../hooks/useWorkers';
import { WorkerForm } from '../components/features/workers/WorkerForm';
import { Worker } from '../types';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../components/AuthProvider';
import { format } from 'date-fns';

export function Workers() {
  const navigate = useNavigate();
  const { workers, sites, loading, error, setError, addWorker, deleteWorker, importCSV, exportCSV } = useWorkers();
  const { role } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const uniqueSectors = useMemo(() => {
    return Array.from(new Set(workers.map(w => w.work_sector).filter(Boolean))) as string[];
  }, [workers]);

  const uniqueRoles = useMemo(() => {
    return Array.from(new Set(workers.map(w => w.current_role || w.initial_role).filter(Boolean))) as string[];
  }, [workers]);


  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      const searchLower = debouncedSearch.toLowerCase();
      const matchSearch = (w.full_name || '').toLowerCase().includes(searchLower) ||
                          (w.cpf || '').toLowerCase().includes(searchLower) ||
                          (w.registration_number || '').toLowerCase().includes(searchLower);
      const matchSector = sectorFilter ? w.work_sector === sectorFilter : true;
      const matchStatus = statusFilter ? w.status === statusFilter : true;
      const matchRole = roleFilter ? (w.current_role === roleFilter || w.initial_role === roleFilter) : true;
      const matchSite = siteFilter ? w.current_site_id === siteFilter : true;
      return matchSearch && matchSector && matchStatus && matchRole && matchSite;
    });
  }, [workers, debouncedSearch, sectorFilter, statusFilter, roleFilter, siteFilter]);

  const totalPages = Math.ceil(filteredWorkers.length / itemsPerPage);
  const paginatedWorkers = filteredWorkers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) importCSV(file);
    event.target.value = '';
  };

  const handleExportCSV = () => {
    exportCSV();
  };

  const handleDelete = async (id: string) => {
    await deleteWorker(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Funcionários</h1>
          <p className="text-muted mt-2">Gerencie o cadastro de funcionários</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label role="button" tabIndex={0} className="bg-surface border border-border hover:bg-surface-hover text-foreground font-medium py-2 px-3 rounded-md transition-colors flex items-center gap-2 text-sm cursor-pointer">
            <Upload className="w-4 h-4" /> Importar
            <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
          </label>
          <button onClick={handleExportCSV} className="bg-surface border border-border hover:bg-surface-hover text-foreground font-medium py-2 px-3 rounded-md transition-colors flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button onClick={() => setIsAdding(true)} className="bg-primary text-primary-foreground font-medium py-2 px-4 rounded-md transition-all flex items-center gap-2 text-sm hover:opacity-90">
            <Plus className="w-4 h-4" /> Novo Funcionário
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 items-center justify-between bg-surface-hover/20">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar por nome, matrícula ou CPF..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary text-foreground"
            />
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <select
              value={sectorFilter}
              onChange={e => setSectorFilter(e.target.value)}
              className="w-full sm:w-auto bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">Todos os setores</option>
              {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">Todos os status</option>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
              <option value="VACATION">Férias</option>
              <option value="DISMISSED">Desligado</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/50 text-[11px] uppercase tracking-wider text-muted">
                <th className="p-4 font-medium">Funcionário</th>
                <th className="p-4 font-medium">Matrícula</th>
                <th className="p-4 font-medium">CPF</th>
                <th className="p-4 font-medium">Setor</th>
                <th className="p-4 font-medium">Função</th>
                <th className="p-4 font-medium">Admissão</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {paginatedWorkers.map(worker => (
                <tr key={worker.id} className="border-b border-border hover:bg-surface-hover/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {worker.reference_photo_url ? (
                        <img src={worker.reference_photo_url} alt={worker.full_name} className="w-10 h-10 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-surface-hover border border-border flex items-center justify-center">
                          <UserCircle2 className="w-6 h-6 text-muted" />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-foreground">{worker.full_name}</div>
                        {worker.email && <div className="text-xs text-muted">{worker.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-foreground">{worker.registration_number}</td>
                  <td className="p-4 text-foreground">{worker.cpf}</td>
                  <td className="p-4 text-foreground">{worker.work_sector || '-'}</td>
                  <td className="p-4 text-foreground font-medium">{worker.current_role || worker.initial_role || '-'}</td>
                  <td className="p-4 text-foreground">{(worker.admission_date && !isNaN(new Date(worker.admission_date).getTime())) ? format(new Date(worker.admission_date), 'dd/MM/yyyy') : '-'}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full ${(worker.status || 'ACTIVE') === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${(worker.status || 'ACTIVE') === 'ACTIVE' ? 'bg-emerald-500' : 'bg-zinc-400'}`}></span>
                      {worker.status === 'ACTIVE' ? 'Ativo' : worker.status === 'INACTIVE' ? 'Inativo' : worker.status === 'VACATION' ? 'Férias' : 'Desligado'}
                    </span>
                  </td>
                  <td className="p-4 flex justify-end gap-2 relative group">
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/workers/${worker.id}`)} className="p-2 text-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors" title="Editar Perfil">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => navigate(`/workers/${worker.id}?tab=epi`)} className="p-2 text-muted hover:text-primary hover:bg-primary/10 rounded-md transition-colors" title="Ver Ficha EPI">
                        <FileText className="w-4 h-4" />
                      </button>
                      {role && ['ADMIN', 'SAFETY_ENGINEER'].includes(role) && (
                        <button onClick={() => setDeleteConfirmId(worker.id)} className="p-2 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedWorkers.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted">Nenhum funcionário encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-border bg-surface flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
          <div className="flex items-center gap-3">
            <span>Por página:</span>
            <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-background border border-border rounded px-2 py-1 focus:outline-none focus:border-primary">
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div>
            Mostrando <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, filteredWorkers.length)}</span> de <span className="font-medium text-foreground">{filteredWorkers.length}</span> registros
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-md hover:bg-surface-hover disabled:opacity-50 border border-border">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 rounded-md hover:bg-surface-hover disabled:opacity-50 border border-border">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isAdding && (
        <WorkerForm sites={sites} onClose={() => setIsAdding(false)} onSave={async (data) => {
          try {
            await addWorker(data);
            setIsAdding(false);
          } catch (e: unknown) {
            console.error(e);
            toast({ type: 'error', title: 'Erro', message: e.message || 'Falha ao registrar trabalhador.' });
            throw e;
          }
        }} />
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-2">Confirmar Exclusão</h3>
            <p className="text-sm text-muted mb-6">Tem certeza que deseja excluir este trabalhador? Essa ação não pode ser desfeita.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-muted hover:text-foreground">Cancelar</button>
              <button onClick={async () => {
                setIsDeleting(true);
                try {
                  await handleDelete(deleteConfirmId);
                } catch(e) {
                  console.error(e);
                } finally {
                  setIsDeleting(false);
                  setDeleteConfirmId(null);
                }
              }} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700" disabled={isDeleting}>
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
