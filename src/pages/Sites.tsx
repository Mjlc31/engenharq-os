import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, MapPin, AlertCircle, Building2, Upload, Download } from 'lucide-react';
import Papa from 'papaparse';
import { ConstructionSite } from '../types';
import { CardSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

export function Sites() {
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingSite, setEditingSite] = useState<ConstructionSite | null>(null);
  
  const { toast } = useToast();
  
  // Form state
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sitesData, error: fetchError } = await supabase
        .from('construction_sites')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setSites(sitesData as ConstructionSite[] || []);
    } catch (err: any) {
      console.error('Erro ao buscar dados:', err);
      setError('Falha ao carregar as obras. Tente novamente.');
      toast({ type: 'error', title: 'Erro de Carregamento', message: 'Falha ao carregar as obras.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      setError('Latitude e Longitude devem ser valores numéricos válidos (ex: -9.6631).');
      return;
    }

    try {
      if (editingSite) {
        const { error: updateError } = await supabase
          .from('construction_sites')
          .update({ name, latitude: lat, longitude: lng })
          .eq('id', editingSite.id);
          
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('construction_sites').insert([
          { name, latitude: lat, longitude: lng }
        ]);
        if (insertError) throw insertError;
      }

      setIsAdding(false);
      setEditingSite(null);
      setName('');
      setLatitude('');
      setLongitude('');
      loadData();
      toast({ type: 'success', title: 'Sucesso', message: 'Obra registrada com sucesso.' });
    } catch (err: any) {
      console.error('Erro ao criar obra:', err);
      setError('Falha ao registrar nova obra.');
      toast({ type: 'error', title: 'Erro no Registro', message: 'Falha ao registrar nova obra.' });
    }
  };

  const handleEditClick = (site: ConstructionSite) => {
    setEditingSite(site);
    setName(site.name);
    setLatitude(site.latitude.toString());
    setLongitude(site.longitude.toString());
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSite = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta obra?')) return;
    
    try {
      const { error: deleteError } = await supabase
        .from('construction_sites')
        .delete()
        .eq('id', id);
        
      if (deleteError) {
        if (deleteError.code === '23503') {
            throw new Error('Não é possível excluir esta obra pois existem colaboradores vinculados a ela.');
        }
        throw deleteError;
      }
      
      loadData();
    } catch (err: any) {
      console.error('Erro ao excluir obra:', err);
      setError(err.message || 'Falha ao excluir obra.');
    }
  };

  const filteredSites = sites.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    const csvData = sites.map(s => ({
      'Nome da Obra': s.name,
      'Latitude': s.latitude,
      'Longitude': s.longitude
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `engenharq_obras_${new Date().toISOString().slice(0,10)}.csv`);
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
          const newSites = results.data.map((row: any) => ({
            name: row['Nome da Obra'] || row['Nome'] || row['name'],
            latitude: parseFloat(row['Latitude'] || row['latitude']?.replace(',', '.')),
            longitude: parseFloat(row['Longitude'] || row['longitude']?.replace(',', '.'))
          })).filter(s => s.name && !isNaN(s.latitude) && !isNaN(s.longitude));

          if (newSites.length === 0) {
            setError('Nenhum dado válido encontrado no CSV.');
            return;
          }

          const { error: insertError } = await supabase.from('construction_sites').insert(newSites);
          if (insertError) throw insertError;
          
          await loadData();
        } catch (err: any) {
          console.error('Erro ao importar CSV:', err);
          setError('Falha ao importar obras. Verifique o formato dos dados.');
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Obras & Locais</h1>
          <p className="text-muted mt-1">Gerencie os canteiros de obra ativos e suas coordenadas para alocação.</p>
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
            onClick={() => {
              if (isAdding) {
                 setEditingSite(null);
                 setName('');
                 setLatitude('');
                 setLongitude('');
              }
              setIsAdding(!isAdding);
            }}
            className="bg-primary hover:bg-primary-dark text-background font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 text-sm"
          >
            {isAdding ? 'Cancelar' : <><Plus className="w-4 h-4" /> Nova Obra</>}
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
          <h3 className="text-lg font-medium mb-4">{editingSite ? 'Editar Obra' : 'Registro de Nova Obra'}</h3>
          <form onSubmit={handleSaveSite} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted">Nome da Obra</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                placeholder="Ex: Residencial Pajuçara"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted">Latitude</label>
              <input
                type="text"
                required
                value={latitude}
                onChange={e => setLatitude(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                placeholder="-9.6705"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted">Longitude</label>
              <input
                type="text"
                required
                value={longitude}
                onChange={e => setLongitude(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                placeholder="-35.7143"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end mt-2">
              <button
                type="submit"
                className="bg-primary hover:bg-primary-dark text-background font-medium py-2 px-6 rounded-md transition-colors"
              >
                {editingSite ? 'Atualizar Obra' : 'Salvar Obra'}
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
              placeholder="Buscar por Nome da Obra..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded text-[11px] font-mono focus:outline-none focus:border-primary text-foreground"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="p-8 text-center text-muted">Nenhuma obra encontrada.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSites.map((site) => (
                <div key={site.id} className="bg-surface-hover/30 border border-border/60 rounded-xl p-4 flex flex-col gap-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 border border-border flex items-center justify-center font-bold text-lg text-primary">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-base text-foreground">{site.name}</div>
                      <div className="text-xs text-zinc-500 font-mono">ID: {site.id.substring(0, 8)}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="bg-background px-3 py-2 rounded-lg border border-border flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-medium text-zinc-300 font-mono truncate">
                        {site.latitude}, {site.longitude}
                      </span>
                    </div>
                  </div>

                  <div className="mt-1 flex gap-2">
                    <button 
                      onClick={() => handleEditClick(site)}
                      className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 uppercase tracking-widest text-xs font-bold px-4 py-2 min-h-[44px] rounded-lg transition-colors flex-1 cursor-pointer"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDeleteSite(site.id)}
                      className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white uppercase tracking-widest text-xs font-bold px-4 py-2 min-h-[44px] rounded-lg transition-colors flex-1 cursor-pointer"
                    >
                      Excluir
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
