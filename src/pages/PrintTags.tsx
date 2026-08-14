import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Users, Search, Filter } from 'lucide-react';
import { EpiInventory, Worker } from '../types';

export function PrintTags() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [epis, setEpis] = useState<EpiInventory[]>([]);
  const [selectedType, setSelectedType] = useState<'WORKERS' | 'EPIS'>('WORKERS');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [workersRes, episRes] = await Promise.all([
        supabase.from('workers').select('*'),
        supabase.from('epi_inventory').select('*')
      ]);
      
      if (workersRes.data) setWorkers(workersRes.data);
      if (episRes.data) setEpis(episRes.data);
      setLoading(false);
    }
    loadData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const filteredItems = useMemo(() => {
    if (selectedType === 'WORKERS') {
      return workers.filter(w => 
        w.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        w.registration_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      return epis.filter(e => 
        e.category.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.ca_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  }, [workers, epis, selectedType, searchTerm]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="flex flex-col h-full gap-4 print-container">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center no-print bg-surface p-4 rounded-xl border border-border gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Gerador de Etiquetas (QR)</h1>
          <p className="text-muted text-sm mt-1">Selecione e filtre os itens para impressão em lote</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input 
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-md pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          
          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as 'WORKERS' | 'EPIS')}
            className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            <option value="WORKERS">Crachás de Colaboradores</option>
            <option value="EPIS">Etiquetas de EPIs</option>
          </select>
          
          <button 
            onClick={handlePrint}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md font-bold text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Printer className="w-4 h-4" /> Imprimir ({filteredItems.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white p-8 rounded-xl print-area shadow-sm">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area { position: absolute; left: 0; top: 0; width: 100%; height: 100%; padding: 10mm; background: white; margin: 0; overflow: visible; box-shadow: none; border: none; border-radius: 0; }
            .no-print { display: none !important; }
            @page { margin: 10mm; }
            .print-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 10mm !important; }
            .tag-card { page-break-inside: avoid; margin-bottom: 5mm; }
          }
        `}</style>
        
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-500 font-medium">Carregando dados para etiquetas...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-400">
            <Filter className="w-8 h-8 mb-2 opacity-50" />
            <p>Nenhum item encontrado com os filtros atuais.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 print-grid">
            {selectedType === 'WORKERS' ? (filteredItems as Worker[]).map(w => (
              <div key={w.id} className="border-2 border-zinc-200 rounded-lg p-5 flex flex-col items-center text-center bg-white tag-card">
                <div className="w-14 h-14 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-zinc-400" />
                </div>
                <QRCodeSVG value={`WK-${w.id}`} size={110} level="H" includeMargin />
                <h3 className="font-bold text-zinc-900 mt-4 uppercase text-sm truncate w-full leading-tight" title={w.full_name}>{w.full_name}</h3>
                <p className="text-xs text-zinc-600 font-mono mt-1">MAT: {w.registration_number}</p>
                <div className="w-full border-t border-zinc-200 mt-3 pt-3">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">EngenharQ OS</p>
                </div>
              </div>
            )) : (filteredItems as EpiInventory[]).map(e => (
              <div key={e.id} className="border-2 border-zinc-300 rounded-lg p-4 flex flex-row items-center gap-4 bg-white tag-card">
                <QRCodeSVG value={`EPI-${e.id}`} size={72} level="M" />
                <div className="flex flex-col text-left overflow-hidden w-full">
                  <span className="font-bold text-zinc-900 text-sm truncate uppercase" title={e.category}>{e.category}</span>
                  <span className="text-[11px] text-zinc-600 font-mono font-bold mt-0.5">{e.tracking_code}</span>
                  <div className="flex flex-col gap-0.5 mt-2 bg-zinc-50 p-1.5 rounded border border-zinc-100">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">CA: <span className="text-zinc-800">{e.ca_number || 'N/A'}</span></span>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">VAL: <span className="text-zinc-800">{formatDate(e.ca_expiration_date)}</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
