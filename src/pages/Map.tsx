import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker as LeafletMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { supabase } from '../lib/supabase';
import { HardHat, MapPin, Plus, X, AlertCircle, Users, Package, Activity, Navigation2, Filter } from 'lucide-react';
import { ConstructionSite, EpiAssignment, EpiInventory, Worker } from '../types';

// Fix for default marker icons in leaflet with bundlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)['_getIconUrl'];
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon
const customIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/2.0.2/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const CustomMarkerIcon = (count: number) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="background-color: #ef4444; border: 2px solid white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.5);">
        ${count}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

function MapBounds({ sites }: { sites: any[] }) {
  const map = useMap();
  useEffect(() => {
    const coords = sites.filter(s => s.latitude && s.longitude).map(s => [s.latitude, s.longitude] as [number, number]);
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [sites, map]);
  return null;
}

export function MapTracking() {
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [assignments, setAssignments] = useState<EpiAssignment[]>([]);
  const [availableEpis, setAvailableEpis] = useState<EpiInventory[]>([]);
  const [allWorkers, setAllWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  
  // Panel State
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEpi, setSelectedEpi] = useState('');
  const [selectedWorker, setSelectedWorker] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMapData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch sites and active assignments, plus workers and epis for the modal
      const [sitesData, assignmentsData, episData, workersData] = await Promise.all([
        supabase.from('construction_sites').select('*'),
        supabase.from('epi_assignments')
          .select(`*, epi:epi_inventory(*), worker:workers(*)`)
          .is('returned_at', null),
        supabase.from('epi_inventory').select('*').eq('status', 'AVAILABLE'),
        supabase.from('workers').select('*, site:construction_sites(*)')
      ]);

      if (sitesData.error) throw sitesData.error;
      if (assignmentsData.error) throw assignmentsData.error;
      if (episData.error) throw episData.error;
      if (workersData.error) throw workersData.error;
      
      setSites(sitesData.data as ConstructionSite[]);
      setAssignments(assignmentsData.data as EpiAssignment[]);
      setAvailableEpis(episData.data as EpiInventory[]);
      setAllWorkers(workersData.data as Worker[]);
    } catch (err: any) {
      console.error('Error loading map data:', err);
      setError('Falha ao carregar dados do mapa. Verifique a conexão.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMapData();
  }, [loadMapData]);

  // Process data to group EPIs by site
  const siteData = useMemo(() => {
    return sites.map(site => {
      // Find all workers at this site
      const workersAtSite = allWorkers.filter(w => w.current_site_id === site.id);
      const workerIds = workersAtSite.map(w => w.id);
      
      // Find EPIs assigned to these workers
      const episAtSite = assignments.filter(a => workerIds.includes(a.worker_id));
      
      // Filter by category if selected
      const filteredEpis = filterCategory === 'ALL' 
        ? episAtSite 
        : episAtSite.filter(a => a.epi?.category.toLowerCase().includes(filterCategory.toLowerCase()));

      return {
        ...site,
        epis: filteredEpis,
        totalWorkers: workersAtSite.length,
        activeEpis: episAtSite.length
      };
    }).filter(site => site.epis.length > 0 || filterCategory === 'ALL'); // Show all sites if no filter, otherwise only sites with matching EPIs
  }, [sites, assignments, filterCategory, allWorkers]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    assignments.forEach(a => {
      if (a.epi?.category) cats.add(a.epi.category);
    });
    return Array.from(cats);
  }, [assignments]);

  const handleAssignFromMap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEpi || !selectedWorker) return;
    setIsSubmitting(true);

    try {
      const expectedReturn = new Date();
      expectedReturn.setDate(expectedReturn.getDate() + 180);

      const { error: assignError } = await supabase.from('epi_assignments').insert([
        { epi_id: selectedEpi, worker_id: selectedWorker, expected_return_date: expectedReturn.toISOString() }
      ]);
      
      if (!assignError) {
        await supabase.from('epi_inventory').update({ status: 'IN_USE' }).eq('id', selectedEpi);
      }

      // Reload Data
      setIsModalOpen(false);
      setSelectedEpi('');
      setSelectedWorker('');
      await loadMapData();
      
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSiteInfo = useMemo(() => {
    return siteData.find(s => s.id === selectedSiteId);
  }, [siteData, selectedSiteId]);

  return (
    <div className="flex flex-col h-full space-y-4 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mapa Operacional</h1>
          <p className="text-muted mt-1">Visão em tempo real das obras e distribuição de equipamentos.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted" />
            <select 
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              <option value="ALL">Todos os Equipamentos</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md font-bold text-sm transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Alocar EPI
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg">
          <AlertCircle className="shrink-0 w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="flex flex-1 gap-4 overflow-hidden h-[calc(100vh-140px)] min-h-[500px]">
        {/* Main Map Area */}
        <div className="flex-1 border border-border rounded-xl overflow-hidden relative bg-surface shadow-md">
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-primary font-medium">Carregando dados geoespaciais...</span>
              </div>
            </div>
          )}
          {!loading && (
            <MapContainer 
              center={[-9.6658, -35.7351]} 
              zoom={12} 
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%', zIndex: 10 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                className="dark-tiles"
              />
              <MapBounds sites={siteData} />
              <MarkerClusterGroup
                chunkedLoading
                showCoverageOnHover={false}
              >
                {siteData.map(site => (
                  site.latitude && site.longitude && (
                    <LeafletMarker 
                      key={site.id} 
                      position={[site.latitude, site.longitude]}
                      icon={CustomMarkerIcon(site.epis.length)}
                      eventHandlers={{
                        click: () => {
                          setSelectedSiteId(site.id);
                        },
                      }}
                    />
                  )
                ))}
              </MarkerClusterGroup>
            </MapContainer>
          )}
        </div>

        {/* Side Panel for Site Details */}
        {selectedSiteId && selectedSiteInfo && (
          <div className="w-80 lg:w-96 bg-surface border border-border rounded-xl shadow-lg flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
            <div className="p-4 border-b border-border bg-surface-hover/50 flex justify-between items-start">
              <div className="flex gap-3 items-start">
                <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0 mt-1">
                  <HardHat className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground leading-tight">{selectedSiteInfo.name}</h2>
                  <p className="text-xs text-muted mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Maceió, AL
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSiteId(null)}
                className="text-muted hover:text-red-500 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-px bg-border border-b border-border">
              <div className="bg-surface p-4 flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 text-muted mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Trabalhadores</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{selectedSiteInfo.totalWorkers}</span>
              </div>
              <div className="bg-surface p-4 flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">EPIs Ativos</span>
                </div>
                <span className="text-2xl font-bold text-primary">{selectedSiteInfo.activeEpis}</span>
              </div>
            </div>

            <div className="p-4 bg-surface flex-1 overflow-y-auto">
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" /> Equipamentos Alocados
              </h3>
              
              <div className="space-y-2">
                {selectedSiteInfo.epis.length === 0 ? (
                  <p className="text-sm text-zinc-500 italic py-4 text-center border border-dashed border-zinc-800 rounded-lg">
                    Nenhum equipamento correspondente aos filtros atuais nesta obra.
                  </p>
                ) : (
                  selectedSiteInfo.epis.map(a => (
                    <div key={a.id} className="p-3 bg-background border border-border rounded-lg hover:border-zinc-700 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm text-foreground">{a.epi?.category}</span>
                        <span className="text-[10px] bg-surface-hover text-muted px-2 py-0.5 rounded font-mono border border-border">
                          {a.epi?.tracking_code}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <Users className="w-3 h-3" />
                        <span className="truncate" title={a.worker?.full_name}>{a.worker?.full_name}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-background">
               <button 
                 onClick={() => {
                   setSelectedSiteId(null);
                   setIsModalOpen(true);
                 }}
                 className="w-full bg-surface-hover hover:bg-border text-foreground font-medium py-2 rounded-lg text-sm transition-colors border border-border flex items-center justify-center gap-2"
               >
                 <Plus className="w-4 h-4" /> Adicionar EPI nesta obra
               </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal / Pop up de cadastro de EPI no Mapa */}
      {isModalOpen && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-hover/30">
              <h3 className="font-bold text-foreground">Registrar Entrega de EPI</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-red-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignFromMap} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted uppercase tracking-wider">Selecionar Colaborador / Obra</label>
                <select 
                  required
                  value={selectedWorker}
                  onChange={e => setSelectedWorker(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">-- Escolha um colaborador --</option>
                  {allWorkers.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.full_name} • {w.site?.name || 'Não alocado'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted uppercase tracking-wider">Selecionar EPI Disponível</label>
                <select 
                  required
                  value={selectedEpi}
                  onChange={e => setSelectedEpi(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">-- Escolha um equipamento --</option>
                  {availableEpis.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.category} (CA: {e.ca_number}) - {e.tracking_code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 mt-2 border-t border-border flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 py-3 rounded-lg font-bold text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-primary text-white hover:bg-primary-dark py-3 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Confirmar Alocação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
