import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker as LeafletMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../lib/supabase';
import { HardHat, MapPin, Plus, X } from 'lucide-react';
import { ConstructionSite, EpiAssignment, EpiInventory, Worker } from '../types';
// Fix for default marker icons in leaflet with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
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

export function MapTracking() {
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [assignments, setAssignments] = useState<EpiAssignment[]>([]);
  const [availableEpis, setAvailableEpis] = useState<EpiInventory[]>([]);
  const [allWorkers, setAllWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEpi, setSelectedEpi] = useState('');
  const [selectedWorker, setSelectedWorker] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadMapData() {
      setLoading(true);
      // Fetch sites and active assignments, plus workers and epis for the modal
      const [sitesData, assignmentsData, episData, workersData] = await Promise.all([
        supabase.from('construction_sites').select('*'),
        supabase.from('epi_assignments')
          .select(`*, epi:epi_inventory(*), worker:workers(*)`)
          .is('returned_at', null),
        supabase.from('epi_inventory').select('*').eq('status', 'AVAILABLE'),
        supabase.from('workers').select('*, site:construction_sites(*)')
      ]);

      if (sitesData.error) console.error(sitesData.error);
      
      if (sitesData.data) setSites(sitesData.data);
      if (assignmentsData.data) setAssignments(assignmentsData.data as any);
      if (episData.data) setAvailableEpis(episData.data);
      if (workersData.data) setAllWorkers(workersData.data);
      setLoading(false);
    }
    loadMapData();
  }, []);

  // Process data to group EPIs by site
  const siteData = useMemo(() => {
    return sites.map(site => {
      // Find workers at this site
      const workersAtSite = assignments.map(a => a.worker).filter(w => w?.current_site_id === site.id);
      const workerIds = workersAtSite.map(w => w?.id);
      
      // Find EPIs assigned to these workers
      const episAtSite = assignments.filter(a => workerIds.includes(a.worker_id));
      
      // Filter by category if selected
      const filteredEpis = filterCategory === 'ALL' 
        ? episAtSite 
        : episAtSite.filter(a => a.epi?.category.toLowerCase().includes(filterCategory.toLowerCase()));

      return {
        ...site,
        epis: filteredEpis
      };
    }).filter(site => site.epis.length > 0 || filterCategory === 'ALL'); // Show all sites if no filter, otherwise only sites with matching EPIs
  }, [sites, assignments, filterCategory]);

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
      // Simple reload by simulating unmount/mount logic
      const btn = document.getElementById('reload-map');
      if (btn) btn.click();
      
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Live Tracking Map</h1>
          <p className="text-muted mt-1">Geolocate active PPE allocations across construction sites.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted">Filter Category:</label>
          <select 
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-surface border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Equipment</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-1.5 rounded-md font-bold text-sm transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Subir EPI na Obra
          </button>
          <button id="reload-map" className="hidden" onClick={() => {
            setLoading(true);
            setTimeout(() => {
              // Trigger reload
              window.location.reload();
            }, 100);
          }}></button>
        </div>
      </div>

      <div className="flex-1 min-h-[500px] border border-border rounded-xl overflow-hidden relative bg-surface">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <span className="text-primary font-medium">Loading geospatial data...</span>
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
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {siteData.map(site => (
              site.latitude && site.longitude && (
                <LeafletMarker 
                  key={site.id} 
                  position={[site.latitude, site.longitude]}
                  icon={customIcon}
                >
                  <Popup className="custom-popup">
                    <div className="p-1 min-w-[200px]">
                      <p className="text-xs font-bold uppercase tracking-tighter text-black">{site.name}</p>
                      <p className="text-xs text-red-600 font-mono mb-2">{site.epis.length} EPIs ativos</p>
                      
                      <div className="space-y-1 max-h-32 overflow-y-auto mt-2 border-t border-gray-200 pt-1">
                        {site.epis.length === 0 ? (
                          <p className="text-[10px] text-gray-500">Nenhum EPI filtrado.</p>
                        ) : (
                          site.epis.map(a => (
                            <div key={a.id} className="flex justify-between items-center text-[10px] font-mono gap-4">
                              <span className="text-gray-600 font-bold">{a.epi?.tracking_code}</span>
                              <span className="text-gray-800 truncate max-w-[100px]" title={a.worker?.full_name}>{a.worker?.full_name}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </Popup>
                </LeafletMarker>
              )
            ))}
          </MapContainer>
        )}
      </div>

      {/* Modal / Pop up de cadastro de EPI no Mapa */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-hover/30">
              <h3 className="font-bold text-foreground">Subir EPI no Mapa</h3>
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
                      {w.full_name} • {(w as any).site?.name || 'Não alocado'}
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
