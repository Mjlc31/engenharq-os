import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Search, AlertCircle, Upload, Download, Edit2, HardHat, ChevronLeft, ChevronRight, Trash2, MapPin, Briefcase, ShieldCheck, UserCircle2, Mail, Phone } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
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

  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      const searchLower = debouncedSearch.toLowerCase();
      const matchSearch = (w.full_name || '').toLowerCase().includes(searchLower) ||
        (w.cpf || '').includes(debouncedSearch) ||
        (w.registration_number || '').includes(debouncedSearch) ||
        (w.email || '').toLowerCase().includes(searchLower);
      
      const matchSector = sectorFilter ? w.work_sector === sectorFilter : true;
      const matchStatus = statusFilter ? (w.status || 'ACTIVE') === statusFilter : true;

      return matchSearch && matchSector && matchStatus;
    });
  }, [workers, debouncedSearch, sectorFilter, statusFilter]);

  const totalPages = Math.ceil(filteredWorkers.length / itemsPerPage);
  const paginatedWorkers = useMemo(() => {
    return filteredWorkers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredWorkers, currentPage, itemsPerPage]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importCSV(file);
    } finally {
      e.target.value = '';
    }
  };

  const handleAddSubmit = async (data: Partial<Worker>) => {
    await addWorker(data);
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWorker(id);
      toast({ type: 'success', title: 'Sucesso', message: 'Trabalhador excluído com sucesso.' });
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message || 'Erro ao excluir trabalhador.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Força de Trabalho</h1>
          <p className="text-muted mt-2">Gerencie os trabalhadores e as alocações nas obras.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          <label className="flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium bg-surface text-foreground border border-border rounded-md cursor-pointer hover:bg-surface-hover transition-colors">
            <Upload className="w-4 h-4" /> Importar CSV
            <input type="file" accept=".csv" onChange={handleImport} className="sr-only" />
          </label>
          <button 
            onClick={exportCSV}
            className="flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium bg-surface text-foreground border border-border rounded-md hover:bg-surface-hover transition-colors"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <div className="hidden sm:block w-px h-6 mx-1 bg-border"></div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium bg-primary text-background rounded-md hover:bg-primary-dark transition-colors"
          >
            {isAdding ? 'Cancelar' : <><Plus className="w-4 h-4" /> Registrar</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg">
          <AlertCircle className="shrink-0 w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {isAdding && (
        <div className="p-6 bg-surface border border-border rounded-xl shadow-sm">
          <h3 className="mb-4 text-lg font-medium">Registro de Novo Trabalhador</h3>
          <WorkerForm sites={sites} onSubmit={handleAddSubmit} />
        </div>
      )}

      <div className="bg-surface border border-border rounded flex flex-col overflow-hidden shadow-sm">
        <div className="p-3 border-b border-border flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-surface-hover/30">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar por Nome, CPF, Matrícula ou E-mail..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-background text-foreground border border-border rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-stretch w-full sm:w-auto gap-3">
            <select 
              value={sectorFilter}
              onChange={e => { setSectorFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-1.5 text-sm bg-background text-foreground border border-border rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
               <option value="">Todos os setores</option>
              {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-1.5 text-sm bg-background text-foreground border border-border rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">Todos os status</option>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
              <option value="VACATION">Férias</option>
              <option value="DISMISSED">Desligado</option>
            </select>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          {loading ? (
             <div className="p-8 text-center text-muted flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              <span>Carregando trabalhadores...</span>
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="p-8 text-center text-muted flex flex-col items-center gap-2">
              <UserCircle2 className="w-8 h-8 opacity-50" />
              <p>Nenhum trabalhador encontrado.</p>
            </div>
          ) : (
            <div className="min-w-[1200px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface/50 text-xs uppercase tracking-wider text-muted font-semibold">
                    <th className="p-3">TRABALHADOR</th>
                    <th className="p-3">MATRÍCULA / CPF</th>
                    <th className="p-3">CONTATO</th>
                    <th className="p-3">OBRA</th>
                    <th className="p-3">SETOR / FUNÇÃO</th>
                    <th className="p-3">DATA ADMISSÃO</th>
                    <th className="p-3">STATUS</th>
                    <th className="p-3 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {paginatedWorkers.map(worker => (
                    <tr key={worker.id} className="border-b border-border hover:bg-surface-hover/30 transition-colors">
                      <td className="p-3">
                         <div className="flex items-center gap-3">
                           {worker.reference_photo_url ? (
                             <img src={worker.reference_photo_url} alt={worker.full_name} className="w-8 h-8 rounded-full object-cover border border-border" />
                           ) : (
                             <div className="w-8 h-8 rounded-full bg-surface-hover border border-border flex items-center justify-center">
                               <UserCircle2 className="w-5 h-5 text-muted" />
                             </div>
                           )}
                           <div className="font-medium text-foreground">{worker.full_name}</div>
                         </div>
                      </td>
                      <td className="p-3 font-mono text-xs">
                        <div className="text-foreground">{worker.registration_number}</div>
                        <div className="text-muted">{worker.cpf}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1 text-xs">
                          {worker.email ? (
                            <div className="flex items-center gap-1.5 text-muted">
                              <Mail className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[150px]">{worker.email}</span>
                            </div>
                          ) : <span className="text-muted">-</span>}
                          {worker.phone_contact && (
                             <div className="flex items-center gap-1.5 text-muted">
                               <Phone className="w-3.5 h-3.5" />
                               <span>{worker.phone_contact}</span>
                             </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                         <div className="flex items-center gap-2">
                           <MapPin className="w-4 h-4 text-primary" />
                           <span>{worker.site?.name || 'Não alocado'}</span>
                         </div>
                      </td>
                      <td className="p-3">
                        <div className="text-foreground font-medium">{worker.initial_role || '-'}</div>
                        <div className="text-muted text-xs">{worker.work_sector || '-'}</div>
                      </td>
                      <td className="p-3">
                        {worker.admission_date ? format(new Date(worker.admission_date), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-1 text-[11px] font-bold rounded uppercase ${
                          (worker.status || 'ACTIVE') === 'ACTIVE' 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-zinc-600 text-white'
                        }`}>
                          {worker.status === 'ACTIVE' ? 'Ativo' : 
                           worker.status === 'INACTIVE' ? 'Inativo' : 
                           worker.status === 'VACATION' ? 'Férias' :
                           worker.status === 'DISMISSED' ? 'Desligado' : (worker.status || 'ACTIVE')}
                        </span>
                      </td>
                      <td className="flex justify-end gap-2 p-3">
                        <button 
                          onClick={() => navigate(`/workers/${worker.id}`)} 
                          className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded transition-colors"
                          title="Perfil"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => navigate(`/workers/${worker.id}?tab=epi`)} 
                          className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          title="Histórico de EPIs"
                        >
                          <HardHat className="w-4 h-4" />
                        </button>
                        {role && ['ADMIN', 'SAFETY_ENGINEER'].includes(role) && (
                          <button 
                            onClick={() => setDeleteConfirmId(worker.id)} 
                            className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
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
        
        {!loading && filteredWorkers.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 text-sm text-muted bg-surface/30 border-t border-border">
            <div>
              Mostrando {filteredWorkers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredWorkers.length)} de {filteredWorkers.length} registros
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-foreground bg-surface rounded border border-border disabled:opacity-50 hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1 text-foreground bg-surface rounded border border-border disabled:opacity-50 hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-2">Confirmar Exclusão</h3>
            <p className="text-sm text-muted mb-6">Tem certeza que deseja excluir este trabalhador? Essa ação não pode ser desfeita.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-6 py-3 min-h-[48px] text-base font-medium text-muted hover:text-foreground border border-border rounded-lg transition-colors"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setIsDeleting(true);
                  await handleDelete(deleteConfirmId);
                  setIsDeleting(false);
                  setDeleteConfirmId(null);
                }}
                className="px-6 py-3 min-h-[48px] text-base font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir Trabalhador'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
