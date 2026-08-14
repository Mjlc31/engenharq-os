import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Search, AlertCircle, Upload, Download, Edit2, HardHat, ChevronLeft, ChevronRight, Trash2, MapPin, Briefcase, Calendar, ShieldCheck, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkers } from '../hooks/useWorkers';
import { WorkerForm } from '../components/features/workers/WorkerForm';
import { Worker } from '../types';

export function Workers() {
  const navigate = useNavigate();
  const { workers, sites, loading, error, setError, addWorker, deleteWorker, importCSV, exportCSV } = useWorkers();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [isAdding, setIsAdding] = useState(false);

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
        (w.registration_number || '').includes(debouncedSearch);
      
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
    if (window.confirm('Tem certeza que deseja excluir este trabalhador?')) {
      try {
        await deleteWorker(id);
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir.');
      }
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

      <div className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-surface/50">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar por Nome, CPF ou Matrícula..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm bg-background text-foreground border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-stretch w-full sm:w-auto gap-3">
            <select 
              value={sectorFilter}
              onChange={e => { setSectorFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 text-sm bg-background text-foreground border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">Todos os setores</option>
              {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 text-sm bg-background text-foreground border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">Todos os status</option>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
              <option value="VACATION">Férias</option>
              <option value="DISMISSED">Desligado</option>
            </select>
          </div>
        </div>
        
        <div className="flex-1 p-4 bg-background/50 min-h-[400px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-muted">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <span className="text-sm font-medium">Carregando trabalhadores...</span>
              </div>
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted gap-2">
              <UserCircle2 className="w-12 h-12 opacity-20" />
              <p>Nenhum trabalhador encontrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedWorkers.map(worker => (
                <div key={worker.id} className="group flex flex-col bg-surface border border-border rounded-xl hover:border-border/80 hover:shadow-lg transition-all overflow-hidden relative">
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-surface-hover border border-border flex shrink-0 items-center justify-center">
                        {worker.reference_photo_url ? (
                          <img src={worker.reference_photo_url} alt={worker.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle2 className="w-8 h-8 text-muted" />
                        )}
                      </div>
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                        (worker.status || 'ACTIVE') === 'ACTIVE' 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                          : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                      }`}>
                        {worker.status === 'ACTIVE' ? 'Ativo' : 
                         worker.status === 'INACTIVE' ? 'Inativo' : 
                         worker.status === 'VACATION' ? 'Férias' :
                         worker.status === 'DISMISSED' ? 'Desligado' : worker.status}
                      </span>
                    </div>

                    <div className="mb-4">
                      <h3 className="font-bold text-foreground text-lg truncate" title={worker.full_name}>{worker.full_name}</h3>
                      <p className="text-xs font-mono text-muted mt-0.5">Matrícula: {worker.registration_number}</p>
                    </div>

                    <div className="space-y-2 mt-auto text-sm">
                      <div className="flex items-center gap-2 text-muted">
                        <Briefcase className="w-4 h-4 shrink-0 text-primary/70" />
                        <span className="truncate">{worker.initial_role || 'Sem função'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted">
                        <MapPin className="w-4 h-4 shrink-0 text-primary/70" />
                        <span className="truncate">{worker.site?.name || 'Não alocado'}</span>
                      </div>
                      {worker.apt_for_height_and_confined_space && (
                        <div className="flex items-center gap-2 text-amber-500/90 text-xs font-medium">
                          <ShieldCheck className="w-4 h-4 shrink-0" />
                          <span>Apto para Altura/Confinado</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 border-t border-border bg-surface-hover/30 divide-x divide-border">
                    <button 
                      onClick={() => navigate(`/workers/${worker.id}`)} 
                      className="p-3 text-muted hover:text-foreground hover:bg-surface-hover flex items-center justify-center gap-2 transition-colors text-xs font-medium"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Perfil
                    </button>
                    <button 
                      onClick={() => navigate(`/workers/${worker.id}?tab=epi`)} 
                      className="p-3 text-muted hover:text-primary hover:bg-primary/5 flex items-center justify-center gap-2 transition-colors text-xs font-medium"
                    >
                      <HardHat className="w-3.5 h-3.5" />
                      EPIs
                    </button>
                    <button 
                      onClick={() => handleDelete(worker.id)} 
                      className="p-3 text-muted hover:text-red-500 hover:bg-red-500/5 flex items-center justify-center gap-2 transition-colors text-xs font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!loading && filteredWorkers.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 text-sm text-muted bg-surface/50 border-t border-border">
            <div>
              Mostrando {filteredWorkers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredWorkers.length)} de {filteredWorkers.length} registros
            </div>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1.5 bg-surface border border-border rounded hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1.5 bg-surface border border-border rounded hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
