import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Tag, Settings2, PackageCheck, PackageX, UserPlus, Undo2, AlertCircle, Upload, Download } from 'lucide-react';
import Papa from 'papaparse';
import { EpiInventory, EpiStatus, Worker } from '../types';
import { CardSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { useEpiInventory } from '../hooks/useEpiInventory';
import { useWorkers } from '../hooks/useWorkers';

export function Assets() {
  const { epis, loading: episLoading, error: episError, fetchEpis, addEpi, assignEpi, returnEpi } = useEpiInventory();
  const { workers, fetchWorkers } = useWorkers();
  
  const loading = episLoading;
  const error = episError;
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [assigningEpiId, setAssigningEpiId] = useState<string | null>(null);
  
  const { toast } = useToast();
  
  // Form state
  const [category, setCategory] = useState('');
  const [caNumber, setCaNumber] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState('');

  useEffect(() => {
    fetchEpis();
    fetchWorkers();
  }, [fetchEpis, fetchWorkers]);

  const handleAddEpi = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const prefix = category.substring(0, 3).toUpperCase();
    const existingSamePrefix = epis.filter(e => e.tracking_code.startsWith(prefix));
    let nextNum = 1;
    if (existingSamePrefix.length > 0) {
      const nums = existingSamePrefix.map(e => parseInt(e.tracking_code.replace(prefix, '') || '0'));
      nextNum = Math.max(...nums) + 1;
    }
    const tracking_code = `${prefix}${nextNum.toString().padStart(2, '0')}`;
    const success = await addEpi({ category, tracking_code, ca_number: caNumber, status: 'AVAILABLE' });
    if (success) {
      setIsAdding(false);
      setCategory('');
      setCaNumber('');
    }
  };

  const handleAssignEpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningEpiId || !selectedWorkerId) return;
    const success = await assignEpi(assigningEpiId, selectedWorkerId);
    if (success) {
      setAssigningEpiId(null);
      setSelectedWorkerId('');
    }
  };

  const handleReturnEpi = async (epiId: string) => {
    await returnEpi(epiId);
  };

  const filteredEpis = epis.filter(e => 
    e.tracking_code.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    const csvData = epis.map(e => ({
      'Categoria': e.category,
      'Código Rastreio': e.tracking_code,
      'CA': e.ca_number,
      'Tamanho': e.size || 'Único',
      'Validade CA': e.ca_expiration_date || '',
      'Vida Útil (dias)': e.recommended_lifespan_days || 180,
      'Status': e.status
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `engenharq_estoque_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          setLoading(true);
          const newEpis = results.data.map((row: any) => ({
            category: row['Categoria'] || row['category'],
            tracking_code: row['Código Rastreio'] || row['Codigo Rastreio'] || row['tracking_code'],
            ca_number: row['CA'] || row['ca_number'],
            size: row['Tamanho'] || row['size'] || 'Único',
            ca_expiration_date: row['Validade CA'] || row['ca_expiration_date'] || null,
            recommended_lifespan_days: parseInt(row['Vida Útil (dias)'] || row['recommended_lifespan_days'] || '180', 10),
            status: row['Status'] || row['status'] || 'AVAILABLE'
          })).filter(e => e.category && e.tracking_code && e.ca_number);

          if (newEpis.length === 0) {
            setError('Nenhum dado válido encontrado no CSV.');
            return;
          }

          const { error: insertError } = await supabase.from('epi_inventory').insert(newEpis);
          if (insertError) throw insertError;
          
          await fetchEpis();
        } catch (err: any) {
          console.error('Erro ao importar CSV:', err);
          setError('Falha ao importar EPIs. Verifique se os Códigos de Rastreio já existem.');
        } finally {
          setLoading(false);
          event.target.value = ''; // reset input
        }
      },
      error: (error) => {
        console.error('Erro no parse do CSV:', error);
        setError('Erro ao ler o arquivo CSV.');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Inventário de EPIs</h1>
          <p className="text-muted mt-1">Gerencie os equipamentos de segurança e as certificações CA.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="bg-surface border border-border hover:bg-surface-hover text-foreground font-medium py-2 px-3 rounded-md transition-colors flex items-center gap-2 cursor-pointer text-sm">
            <Upload className="w-4 h-4" /> Importar CSV
            <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
          </label>
          <button 
            onClick={handleExportCSV}
            className="bg-surface border border-border hover:bg-surface-hover text-foreground font-medium py-2 px-3 rounded-md transition-colors flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <div className="w-px h-6 bg-border mx-1 hidden sm:block"></div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-primary hover:bg-primary-dark text-background font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 text-sm"
          >
            {isAdding ? 'Cancelar' : <><Plus className="w-4 h-4" /> Novo Equipamento</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {isAdding && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-lg font-medium mb-4">Registrar Novo Equipamento</h3>
          <form onSubmit={handleAddEpi} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-muted">Categoria (ex: Luva, Capacete)</label>
              <input
                type="text"
                required
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                placeholder="Luva de Raspa"
              />
            </div>
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-muted">Número CA</label>
              <input
                type="text"
                required
                value={caNumber}
                onChange={e => setCaNumber(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                placeholder="12345"
              />
            </div>
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark text-background font-medium py-2 px-6 rounded-md transition-colors h-[42px]"
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
          <form onSubmit={handleAssignEpi} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-muted">Selecione o Trabalhador</label>
              <select
                required
                value={selectedWorkerId}
                onChange={e => setSelectedWorkerId(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">-- Escolha um Trabalhador --</option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>{w.full_name} ({w.cpf})</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark text-background font-medium py-2 px-6 rounded-md transition-colors h-[42px]"
            >
              Confirmar Designação
            </button>
          </form>
        </div>
      )}

      <div className="flex-1 bg-surface border border-border rounded flex flex-col">
        <div className="p-3 border-b border-border flex gap-2 items-center bg-surface-hover/30">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar por Código de Rastreio ou Categoria..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded text-[11px] font-mono focus:outline-none focus:border-primary text-foreground"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : filteredEpis.length === 0 ? (
            <div className="p-8 text-center text-muted">Nenhum equipamento encontrado.</div>
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
                    <span className="font-mono bg-background px-2 py-1 rounded-md border border-border">CA: {epi.ca_number}</span>
                  </div>

                  <div className="mt-2 flex justify-end">
                    {epi.status === 'AVAILABLE' && (
                      <button 
                        onClick={() => setAssigningEpiId(epi.id)}
                        className="bg-primary/10 text-primary hover:bg-primary hover:text-white uppercase tracking-widest text-xs font-bold px-4 py-2 min-h-[44px] rounded-lg transition-colors flex-1 cursor-pointer"
                      >
                        Designar
                      </button>
                    )}
                    {epi.status === 'IN_USE' && (
                      <button 
                        onClick={() => handleReturnEpi(epi.id)}
                        className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 uppercase tracking-widest text-xs font-bold px-4 py-2 min-h-[44px] rounded-lg transition-colors flex-1 cursor-pointer"
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
    </div>
  );
}

