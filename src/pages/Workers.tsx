import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, MapPin, AlertCircle, Upload, Download } from 'lucide-react';
import Papa from 'papaparse';
import { Worker, ConstructionSite } from '../types';
import { CardSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { useWorkers } from '../hooks/useWorkers';
import { useSites } from '../hooks/useSites';

export function Workers() {
  const { workers, loading: workersLoading, error: workersError, fetchWorkers, addWorker } = useWorkers();
  const { sites, fetchSites } = useSites();
  
  const loading = workersLoading;
  const error = workersError;
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const { toast } = useToast();
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [registration, setRegistration] = useState('');
  const [siteId, setSiteId] = useState('');

  useEffect(() => {
    fetchWorkers();
    fetchSites();
  }, [fetchWorkers, fetchSites]);

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await addWorker({
      full_name: fullName, 
      cpf, 
      registration_number: registration,
      current_site_id: siteId || null
    });
    
    if (success) {
      setIsAdding(false);
      setFullName('');
      setCpf('');
      setRegistration('');
      setSiteId('');
    }
  };

  const filteredWorkers = workers.filter(w => 
    w.full_name.toLowerCase().includes(search.toLowerCase()) ||
    w.cpf.includes(search) ||
    w.registration_number.includes(search)
  );

  const handleExportCSV = () => {
    const csvData = workers.map(w => ({
      'Nome Completo': w.full_name,
      'CPF': w.cpf,
      'Matrícula': w.registration_number,
      'Obra Atual': w.site?.name || 'Não alocado'
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `engenharq_colaboradores_${new Date().toISOString().slice(0,10)}.csv`);
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
          const newWorkers = results.data.map((row: any) => ({
            full_name: row['Nome Completo'] || row['Nome'] || row['full_name'],
            cpf: row['CPF'] || row['cpf'],
            registration_number: row['Matrícula'] || row['Matricula'] || row['registration_number']
          })).filter(w => w.full_name && w.cpf && w.registration_number);

          if (newWorkers.length === 0) {
            setError('Nenhum dado válido encontrado no CSV.');
            return;
          }

          const { error: insertError } = await supabase.from('workers').insert(newWorkers);
          if (insertError) throw insertError;
          
          await fetchWorkers();
        } catch (err: any) {
          console.error('Erro ao importar CSV:', err);
          setError('Falha ao importar. Verifique se os CPFs ou Matrículas já existem no sistema.');
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Força de Trabalho</h1>
          <p className="text-muted mt-1">Gerencie os trabalhadores e as alocações nas obras.</p>
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
            {isAdding ? 'Cancelar' : <><Plus className="w-4 h-4" /> Registrar</>}
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
          <h3 className="text-lg font-medium mb-4">Registro de Novo Trabalhador</h3>
          <form onSubmit={handleAddWorker} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted">Nome Completo</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted">CPF</label>
              <input
                type="text"
                required
                value={cpf}
                onChange={e => setCpf(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted">Matrícula</label>
              <input
                type="text"
                required
                value={registration}
                onChange={e => setRegistration(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                placeholder="MAT-1234"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted">Obra Atual</label>
              <select
                value={siteId}
                onChange={e => setSiteId(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">Não alocado</option>
                {sites.map(site => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end mt-2">
              <button
                type="submit"
                className="bg-primary hover:bg-primary-dark text-background font-medium py-2 px-6 rounded-md transition-colors"
              >
                Salvar Registro
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex-1 bg-surface border border-border rounded flex flex-col">
        <div className="p-3 border-b border-border flex gap-2 items-center bg-surface-hover/30">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar por Nome, CPF ou Matrícula..."
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
          ) : filteredWorkers.length === 0 ? (
            <div className="p-8 text-center text-muted">Nenhum trabalhador encontrado.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWorkers.map((worker) => (
                <div key={worker.id} className="bg-surface-hover/30 border border-border/60 rounded-xl p-4 flex flex-col gap-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 border border-border flex items-center justify-center font-bold text-lg text-zinc-400 uppercase">
                      {worker.full_name.substring(0, 2)}
                    </div>
                    <div>
                      <div className="font-bold text-base text-foreground">{worker.full_name}</div>
                      <div className="text-xs text-zinc-500 font-mono">MAT: {worker.registration_number}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="text-sm text-zinc-400 font-mono bg-background px-3 py-2 rounded-lg border border-border">
                      CPF: {worker.cpf}
                    </div>
                    <div className="bg-background px-3 py-2 rounded-lg border border-border flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-medium text-zinc-300 truncate">
                        {worker.site ? worker.site.name : <span className="italic text-zinc-600">Não alocado</span>}
                      </span>
                    </div>
                  </div>

                  <div className="mt-1 flex gap-2">
                    <button className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 uppercase tracking-widest text-xs font-bold px-4 py-2 min-h-[44px] rounded-lg transition-colors flex-1 cursor-pointer">
                      Editar
                    </button>
                    <button className="bg-primary/10 text-primary hover:bg-primary hover:text-white uppercase tracking-widest text-xs font-bold px-4 py-2 min-h-[44px] rounded-lg transition-colors flex-1 cursor-pointer">
                      Ver EPIs
                    </button>
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

