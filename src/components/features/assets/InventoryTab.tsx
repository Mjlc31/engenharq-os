import React, { useState, useMemo } from 'react';
import { Plus, Search, Upload, Download, CheckCircle, AlertTriangle, ArrowDownRight, Package } from 'lucide-react';
import { EpiInventory, Worker } from '../../../types';
import { useToast } from '../../../components/ui/Toast';
import { format } from 'date-fns';

interface InventoryTabProps {
  epis: EpiInventory[];
  workers: Worker[];
  loading: boolean;
  addEpi: (category: string, caNumber: string) => Promise<string>;
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
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form State
  const [category, setCategory] = useState('');
  const [caNumber, setCaNumber] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState('');

  const filteredEpis = useMemo(() => {
    return epis.filter(e => 
      e.tracking_code.toLowerCase().includes(search.toLowerCase()) ||
      (e.category && e.category.toLowerCase().includes(search.toLowerCase())) ||
      (e.ca_number && e.ca_number.toLowerCase().includes(search.toLowerCase()))
    );
  }, [epis, search]);

  const totalItems = filteredEpis.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEpis = useMemo(() => {
    return filteredEpis.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEpis, startIndex, itemsPerPage]);

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
      const trackingCode = await addEpi(category, caNumber || 'N/A');
      setIsAdding(false);
      setCategory('');
      setCaNumber('');
      toast({ type: 'success', title: 'Sucesso', message: `EPI cadastrado com código: ${trackingCode}` });
    } catch (err: unknown) {
      toast({ type: 'error', title: 'Erro', message: err instanceof Error ? err.message : 'Falha ao registrar EPI.' });
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningEpiId || !selectedWorkerId) return;
    try {
      await assignEpi(assigningEpiId, selectedWorkerId);
      setAssigningEpiId(null);
      setSelectedWorkerId('');
      toast({ type: 'success', title: 'Sucesso', message: 'EPI designado com sucesso.' });
    } catch (err: unknown) {
      toast({ type: 'error', title: 'Erro', message: err instanceof Error ? err.message : 'Falha ao designar EPI.' });
    }
  };

  const handleReturnEpi = async (id: string) => {
    try {
      await returnEpi(id);
      toast({ type: 'success', title: 'Sucesso', message: 'EPI devolvido com sucesso.' });
    } catch (err: unknown) {
      toast({ type: 'error', title: 'Erro', message: err instanceof Error ? err.message : 'Falha ao devolver EPI.' });
    }
  };

  return (
    <>
      <div className="flex justify-end gap-2">
        <label role="button" tabIndex={0} className="flex items-center gap-2 py-2 px-3 text-sm font-medium bg-surface text-foreground border border-border rounded-md cursor-pointer hover:bg-surface-hover transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:outline-none">
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
          <h3 className="text-lg font-medium mb-4">Adicionar ao Inventário Físico</h3>
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
              <label className="text-sm font-medium text-muted">Número CA (Opcional)</label>
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

      <div className="flex-1 bg-surface border border-border rounded flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border flex gap-2 items-center bg-surface-hover/30">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar no inventário por rastreio, categoria ou CA..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-1.5 text-[11px] font-mono bg-background text-foreground border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-muted flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              <span>Carregando inventário...</span>
            </div>
          ) : filteredEpis.length === 0 ? (
            <div className="p-8 text-center text-muted">Nenhum equipamento no inventário físico.</div>
          ) : (
            <div className="min-w-[800px]">
              <table className="w-full whitespace-nowrap text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface/50 text-xs uppercase tracking-wider text-muted font-semibold">
                    <th className="p-3">CÓDIGO DE RASTREIO</th>
                    <th className="p-3">TIPO/CATEGORIA</th>
                    <th className="p-3">C.A.</th>
                    <th className="p-3">VALIDADE CA</th>
                    <th className="p-3">STATUS</th>
                    <th className="p-3 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {paginatedEpis.map(epi => (
                    <tr key={epi.id} className="border-b border-border hover:bg-surface-hover/30 transition-colors">
                      <td className="p-3 font-mono text-primary font-medium">{epi.tracking_code}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-muted" />
                          <span className="font-medium text-foreground">{epi.category}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono">{epi.ca_number || '-'}</td>
                      <td className="p-3">
                        {epi.ca_expiration_date ? (
                          <div className="flex items-center gap-1.5">
                            {new Date(epi.ca_expiration_date).getTime() < Date.now() + 30 * 24 * 60 * 60 * 1000 ? (
                              <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            )}
                            <span>{format(new Date(epi.ca_expiration_date), 'dd/MM/yyyy')}</span>
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {epi.status === 'AVAILABLE' && <span className="inline-flex px-2 py-1 text-[11px] font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 rounded uppercase">ESTOQUE</span>}
                        {epi.status === 'IN_USE' && <span className="inline-flex px-2 py-1 text-[11px] font-bold text-emerald-400 bg-emerald-900/30 border border-emerald-800/50 rounded uppercase">EM USO</span>}
                        {epi.status === 'MAINTENANCE' && <span className="inline-flex px-2 py-1 text-[11px] font-bold text-amber-400 bg-amber-900/30 border border-amber-800/50 rounded uppercase">REVISÃO</span>}
                        {epi.status === 'DISCARDED' && <span className="inline-flex px-2 py-1 text-[11px] font-bold text-red-400 bg-red-900/30 border border-red-800/50 rounded uppercase">DESCARTE</span>}
                      </td>
                      <td className="flex justify-end gap-2 p-3">
                        {epi.status === 'AVAILABLE' && (
                          <button 
                            onClick={() => setAssigningEpiId(epi.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 rounded cursor-pointer hover:bg-primary hover:text-white transition-colors"
                          >
                            <ArrowDownRight className="w-3.5 h-3.5" /> DESIGNAR
                          </button>
                        )}
                        {epi.status === 'IN_USE' && (
                          <button 
                            onClick={() => handleReturnEpi(epi.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-muted bg-surface-hover rounded cursor-pointer hover:bg-surface-hover/80 hover:text-foreground transition-colors"
                          >
                            DEVOLVER
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
        
        {!loading && filteredEpis.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 text-sm text-muted bg-surface/30 border-t border-border">
            <div>
              Mostrando {totalItems === 0 ? 0 : startIndex + 1} a {Math.min(startIndex + itemsPerPage, totalItems)} de {totalItems} registros
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
    </>
  );
}
