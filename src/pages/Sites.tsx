import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, AlertCircle, Upload, Download, Edit2, Trash2, ChevronLeft, ChevronRight, MapPin, Users, Calendar, Navigation } from 'lucide-react';
import Papa from 'papaparse';
import { ConstructionSite } from '../types';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../components/AuthProvider';
import { useToast } from '../components/ui/Toast';

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;


function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export function Sites() {
  const { role } = useAuth();
  const [sites, setSites] = useState<(ConstructionSite & { worker_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const setError = (message: string | null) => {
    if (message) toast({ type: 'error', title: 'Erro', message });
  };
  const error = null;
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingSite, setEditingSite] = useState<ConstructionSite | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  
  // Form state
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cno, setCno] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [address, setAddress] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('construction_sites')
        .select('*, workers(count)')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;

      const formattedData = data.map((s: any) => ({
        ...s,
        worker_count: s.workers?.[0]?.count ?? 0
      }));

      setSites(formattedData || []);
    } catch (err: unknown) {
      console.error('Erro ao buscar obras:', err);
      setError('Falha ao carregar dados das obras.');
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
      const payload = {
        name,
        latitude: lat,
        longitude: lng,
        cnpj: cnpj || null,
        cno: cno || null,
        start_date: startDate || null,
        end_date: endDate || null,
        address: address || null,
        image_url: imageUrl || null,
        status: status || 'ACTIVE'
      };

      if (editingSite) {
        const { error: updateError } = await supabase
          .from('construction_sites')
          .update(payload)
          .eq('id', editingSite.id);
          
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('construction_sites').insert([payload]);
        if (insertError) throw insertError;
      }

      setIsAdding(false);
      setEditingSite(null);
      setName('');
      setLatitude('');
      setLongitude('');
      setCnpj('');
      setCno('');
      setStartDate('');
      setEndDate('');
      setAddress('');
      setImageUrl('');
      setStatus('ACTIVE');
      loadData();
    } catch (err: unknown) {
      console.error('Erro ao salvar obra:', err);
      setError((err as any)?.message || 'Falha ao salvar obra. Verifique os dados e tente novamente.');
    }
  };

  const handleEditClick = (site: ConstructionSite) => {
    setEditingSite(site);
    setName(site.name || '');
    setLatitude(site.latitude?.toString() || '');
    setLongitude(site.longitude?.toString() || '');
    setCnpj(site.cnpj || '');
    setCno(site.cno || '');
    setStartDate(site.start_date || '');
    setEndDate(site.end_date || '');
    setAddress(site.address || '');
    setImageUrl(site.image_url || '');
    setStatus(site.status || 'ACTIVE');
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSite = async (id: string) => {
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
    } catch (err: unknown) {
      console.error('Erro ao excluir obra:', err);
      setError(err instanceof Error ? err.message : 'Falha ao excluir obra.');
    }
  };

  const debouncedSearch = useDebounce(search, 300);

  const filteredSites = useMemo(() => {
    if (!debouncedSearch) return sites;
    return sites.filter(s => 
      s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
      (s.address && s.address.toLowerCase().includes(debouncedSearch.toLowerCase()))
    );
  }, [sites, debouncedSearch]);

  const totalPages = Math.ceil(filteredSites.length / itemsPerPage);

  const paginatedSites = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSites.slice(start, start + itemsPerPage);
  }, [filteredSites, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

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
          const newSites = results.data.map((row: Record<string, string>) => ({
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
        } catch (err: unknown) {
          console.error('Erro ao importar CSV:', err);
          setError('Falha ao importar obras. Verifique o formato dos dados.');
        } finally {
          setLoading(false);
          event.target.value = '';
        }
      },
      error: (error) => {
        console.error('Erro no parse do CSV:', error);
        setError('Erro ao ler o arquivo CSV.');
      }
    });
  };

  return (
    <div data-testid="sites-container" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="bg-surface border border-border rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-2">Dados Base da Empresa (Matriz)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-muted block">Razão Social:</span><span className="font-medium">EngenharQ Construções e Soluções LTDA</span></div>
            <div><span className="text-muted block">CNPJ:</span><span className="font-medium">00.000.000/0001-00</span></div>
            <div><span className="text-muted block">Endereço Principal:</span><span className="font-medium">Maceió - AL</span></div>
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Obras Ativas</h1>
          <p className="text-muted mt-2">Gerencie os canteiros de obra ativos, mapas e efetivo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label role="button" tabIndex={0} className="bg-surface border border-border hover:bg-surface-hover text-foreground font-medium py-2 px-3 rounded-md transition-colors flex items-center gap-2 cursor-pointer text-sm">
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
                 setCnpj('');
                 setCno('');
                 setStartDate('');
                 setEndDate('');
                 setAddress('');
                 setImageUrl('');
                 setStatus('ACTIVE');
              }
              setIsAdding(!isAdding);
            }}
            className="bg-primary hover:bg-primary-dark text-background font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 text-sm"
          >
            {isAdding ? 'Cancelar' : <><Plus className="w-4 h-4" /> Nova Obra</>}
          </button>
        </div>
        {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-4xl shadow-2xl relative my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-foreground">
                {editingSite ? 'Editar Obra' : 'Nova Obra'}
              </h3>
              <button 
                onClick={() => {
                  setIsAdding(false);
                  setEditingSite(null);
                }}
                className="text-muted hover:text-red-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveSite} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">Nome da Obra *</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Ex: Edf. Varandas"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">Latitude</label>
                <input
                  type="text"
                  value={latitude}
                  onChange={e => setLatitude(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="-9.6659"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">Longitude</label>
                <input
                  type="text"
                  value={longitude}
                  onChange={e => setLongitude(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="-35.7143"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">CNPJ</label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={e => setCnpj(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">CNO</label>
                <input
                  type="text"
                  value={cno}
                  onChange={e => setCno(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">Data de Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">Data de Término</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium text-muted">Endereço</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium text-muted">Imagem (URL)</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="ACTIVE">Ativa</option>
                  <option value="FINISHED">Finalizada</option>
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end mt-4 pt-4 border-t border-border gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-muted hover:text-foreground font-medium py-2 px-6 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-dark text-background font-medium py-2 px-6 rounded-md transition-colors"
                >
                  {editingSite ? 'Atualizar Obra' : 'Salvar Obra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}  </div>

      <div className="flex-1 flex flex-col">
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar obras por nome ou endereço..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12 text-muted">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
              <span className="text-sm font-medium">Carregando obras...</span>
            </div>
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="flex-1 p-12 text-center text-muted bg-surface/50 rounded-xl border border-border/50 flex flex-col items-center justify-center">
             <Navigation className="w-12 h-12 opacity-20 mb-2" />
             <p>Nenhuma obra encontrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {paginatedSites.map((site) => (
              <div key={site.id} className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden hover:border-border/80 hover:shadow-lg transition-all group">
                
                {/* Mini-map */}
                <div className="h-40 w-full bg-zinc-800 relative z-0">
                  {site.latitude && site.longitude ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 text-muted">
                      <MapPin className="w-8 h-8 mb-2 opacity-50 text-emerald-500" />
                      <span className="text-xs font-mono">{site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted text-sm">
                      Sem coordenadas
                    </div>
                  )}
                  <div className="absolute top-3 right-3 z-10">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${site.status === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                      {site.status === 'ACTIVE' ? 'Ativa' : 'Finalizada'}
                    </span>
                  </div>
                </div>
                
                {/* Info */}
                <div className="p-5 flex-1 flex flex-col z-10 bg-surface">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{site.name}</h3>
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted mb-6">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary/70" />
                      <span className="line-clamp-2">{site.address || 'Endereço não informado'}</span>
                    </div>
                    {site.start_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 shrink-0 text-primary/70" />
                        <span>Início: {new Date(site.start_date).toLocaleDateString('pt-BR')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <Users className="w-4 h-4 shrink-0 text-blue-500" />
                      <span>{site.worker_count} trabalhador(es) alocado(s)</span>
                    </div>
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleEditClick(site)}
                      className="py-2 px-4 rounded-md text-sm font-medium bg-surface-hover hover:bg-zinc-800 text-foreground transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" /> Editar
                    </button>
                    {role && ['ADMIN', 'SAFETY_ENGINEER'].includes(role) && (
                      <button 
                        onClick={() => setDeleteConfirmId(site.id)}
                        className="py-2 px-4 rounded-md text-sm font-medium bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" /> Excluir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {filteredSites.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
            <div>
              Mostrando <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, filteredSites.length)}</span> de <span className="font-medium text-foreground">{filteredSites.length}</span> obras
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-border"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-medium px-2 text-foreground">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-border"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-2">Confirmar Exclusão</h3>
            <p className="text-sm text-muted mb-6">Tem certeza que deseja excluir esta obra? Essa ação não pode ser desfeita.</p>
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
                  await handleDeleteSite(deleteConfirmId);
                  setIsDeleting(false);
                  setDeleteConfirmId(null);
                }}
                className="px-6 py-3 min-h-[48px] text-base font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir Obra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
