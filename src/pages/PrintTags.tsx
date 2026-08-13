import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Tag, Users } from 'lucide-react';
import { Worker, EpiInventory } from '../types';
import { CardSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

export function PrintTags() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [epis, setEpis] = useState<EpiInventory[]>([]);
  const [selectedType, setSelectedType] = useState<'WORKERS' | 'EPIS'>('WORKERS');
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [workersRes, episRes] = await Promise.all([
          supabase.from('workers').select('*'),
          supabase.from('epi_inventory').select('*')
        ]);
        
        if (workersRes.data) setWorkers(workersRes.data);
        if (episRes.data) setEpis(episRes.data);
      } catch (err) {
        console.error('Error fetching data for tags:', err);
        toast({ type: 'error', title: 'Erro de Carregamento', message: 'Falha ao carregar dados.' });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full gap-4 print-container">
      <div className="flex justify-between items-center no-print bg-surface p-4 rounded-xl border border-border">
        <div>
          <h1 className="text-xl font-bold">Gerador de Etiquetas (QR)</h1>
          <p className="text-muted text-sm">Selecione a categoria para imprimir as tags</p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as 'WORKERS' | 'EPIS')}
            className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none"
          >
            <option value="WORKERS">Crachás de Colaboradores</option>
            <option value="EPIS">Etiquetas de EPIs</option>
          </select>
          <button 
            onClick={handlePrint}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md font-bold text-sm transition-colors flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Imprimir (A4)
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white p-8 rounded-xl print-area">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; background: white; }
            .no-print { display: none; }
          }
        `}</style>
        
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {selectedType === 'WORKERS' ? workers.map(w => (
              <div key={w.id} className="border-2 border-zinc-200 rounded-lg p-4 flex flex-col items-center text-center bg-white shadow-sm break-inside-avoid">
                <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-zinc-400" />
                </div>
                <QRCodeSVG value={`WK-${w.id}`} size={100} level="H" includeMargin />
                <h3 className="font-bold text-zinc-900 mt-3 uppercase text-sm truncate w-full">{w.full_name}</h3>
                <p className="text-xs text-zinc-500 font-mono mt-1">MAT: {w.registration_number}</p>
                <p className="text-[10px] text-zinc-400 mt-2 font-bold uppercase tracking-widest border-t border-zinc-100 pt-2 w-full">EngenharQ OS</p>
              </div>
            )) : epis.map(e => (
              <div key={e.id} className="border border-zinc-200 rounded p-3 flex flex-row items-center gap-4 bg-white break-inside-avoid">
                <QRCodeSVG value={`EPI-${e.id}`} size={64} level="M" />
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="font-bold text-zinc-900 text-xs truncate">{e.category}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{e.tracking_code}</span>
                  <span className="text-[9px] text-zinc-400 mt-1">CA: {e.ca_number}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
