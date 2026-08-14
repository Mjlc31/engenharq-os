import React, { useState, useMemo } from 'react';
import { Plus, Search, Upload, Download } from 'lucide-react';
import { EpiInventory, Worker } from '../../../types';

interface InventoryTabProps {
  epis: EpiInventory[];
  workers: Worker[];
  loading: boolean;
  addEpi: (category: string, caNumber: string) => Promise<void>;
  assignEpi: (epiId: string, workerId: string) => Promise<void>;
  returnEpi: (epiId: string) => Promise<void>;
  importInventoryCSV: (file: File) => Promise<void>;
  exportInventoryCSV: () => void;
}

export function InventoryTab({
  epis,
  workers,
  loading,
  addEpi,
  assignEpi,
  returnEpi,
  importInventoryCSV,
  exportInventoryCSV
}: InventoryTabProps) {
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [assigningEpiId, setAssigningEpiId] = useState<string | null>(null);

  // Form State
  const [category, setCategory] = useState('');
  const [caNumber, setCaNumber] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState('');

  const filteredEpis = useMemo(() => {
    return epis.filter(e => 
      e.tracking_code.toLowerCase().includes(search.toLowerCase()) ||
      (e.category && e.category.toLowerCase().includes(search.toLowerCase()))
    );
  }, [epis, search]);

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importInventoryCSV(file);
    } finally {
      event.target.value = '';
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addEpi(category, caNumber);
      setIsAdding(false);
      setCategory('');
      setCaNumber('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao registrar EPI.');
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningEpiId || !selectedWorkerId) return;
    try {
      await assignEpi(assigningEpiId, selectedWorkerId);
      setAssigningEpiId(null);
      setSelectedWorkerId('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao designar EPI.');
    }
  };

  return (
    <>
      <div className="flex justify-end gap-2">
        <label className="flex items-center gap-2 py-2 px-3 text-sm font-medium bg-surface text-foreground border border-border rounded-md cursor-pointer hover:bg-surface-hover transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:outline-none">
          <Upload className="w-4 h-4" /> Importar CSV
          <input type="file" accept=".csv" onChange={handleImportCSV} className="sr-only" />
        </label>
        <button 
          onClick={exportInventoryCSV}
          className="flex items-center gap-2 py-2 px-3 text-sm font-medium bg-surface text-foreground border border-border rounded-md hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
        <div className="hidden sm:block w-px h-6 mx-1 bg-border"></div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 py-2 px-4 text-sm font-medium bg-primary text-background rounded-md hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        >
          {isAdding ? 'Cancelar' : <><Plus className="w-4 h-4" /> Novo no Inventário</>}
        </button>
      </div>

      {isAdding && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-lg font-medium mb-4">Adicionar ao Inventário</h3>
          <form onSubmit={handleAddSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-muted">Categoria (ex: Luva, Capacete)</label>
              <input
                type="text"
                required
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Luva de Raspa"
              />
            </div>
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-muted">Número CA (Opcional se tiver no Catálogo)</label>
              <input
                type="text"
                value={caNumber}
                onChange={e => setCaNumber(e.target.value)}
                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="12345"
              />
            </div>
            <button
              type="submit"
              className="py-2 px-6 h-[42px] font-medium bg-primary text-background rounded-md hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              Salvar
            </button>
          </form>
        </div>
      )}

      {assigningEpiId && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Designar Equipamento para Trabalhador</h3>
            <button onClick={() => setAssigningEpiId(null)} className="text-muted hover:text-foreground">Cancelar</button>
          </div>
          <form onSubmit={handleAssignSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-muted">Selecione o Trabalhador</label>
              <select
                required
                value={selectedWorkerId}
                onChange={e => setSelectedWorkerId(e.target.value)}
                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">-- Escolha um Trabalhador --</option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>{w.full_name} ({w.cpf})</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="py-2 px-6 h-[42px] font-medium bg-primary text-background rounded-md hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              Confirmar Designação
            </button>
          </form>
        </div>
      )}

      <div className="flex-1 bg-surface border border-border rounded flex flex-col">
        <div className="p-3 border-b border-border flex gap-2 items-center bg-surface-hover/30">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar no inventário..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-[11px] font-mono bg-background text-foreground border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="p-8 text-center text-muted flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              <span>Carregando inventário...</span>
            </div>
          ) : filteredEpis.length === 0 ? (
            <div className="p-8 text-center text-muted">Nenhum equipamento no inventário.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEpis.map((epi) => (
                <div key={epi.id} className="bg-surface-hover/30 border border-border/60 rounded-xl p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg text-primary">{epi.tracking_code}</div>
                      <div className="text-zinc-300 font-medium">{epi.category}</div>
                    </div>
                    <div>
                      {epi.status === 'AVAILABLE' && <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 text-xs font-bold">ESTOQUE</span>}
                      {epi.status === 'IN_USE' && <span className="px-2 py-1 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 text-xs font-bold">EM USO</span>}
                      {epi.status === 'MAINTENANCE' && <span className="px-2 py-1 rounded bg-amber-900/30 text-amber-400 border border-amber-800/50 text-xs font-bold">REVISÃO</span>}
                      {epi.status === 'DISCARDED' && <span className="px-2 py-1 rounded bg-red-900/30 text-red-400 border border-red-800/50 text-xs font-bold">DESCARTE</span>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    {epi.ca_number && <span className="font-mono bg-background px-2 py-1 rounded-md border border-border">CA: {epi.ca_number}</span>}
                  </div>

                  <div className="flex justify-end mt-2">
                    {epi.status === 'AVAILABLE' && (
                      <button 
                        onClick={() => setAssigningEpiId(epi.id)}
                        className="flex-1 px-4 py-2 min-h-[44px] text-xs font-bold tracking-widest text-primary uppercase bg-primary/10 rounded-lg cursor-pointer hover:bg-primary hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        Designar
                      </button>
                    )}
                    {epi.status === 'IN_USE' && (
                      <button 
                        onClick={() => returnEpi(epi.id)}
                        className="flex-1 px-4 py-2 min-h-[44px] text-xs font-bold tracking-widest text-muted uppercase bg-surface-hover rounded-lg cursor-pointer hover:bg-surface-hover/80 hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        Devolver
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
