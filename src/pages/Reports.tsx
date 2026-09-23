import React, { useState } from 'react';
import { useWorkers } from '../hooks/useWorkers';
import { FileText, Download, Filter, Users, Package, Clock, AlertTriangle, CalendarRange, Search, BarChart3, X, Eye } from 'lucide-react';
import { generateEpiRecordPdf } from '../lib/pdfGenerator';
import { supabase } from '../lib/supabase';
import Papa from 'papaparse';
import { useToast } from '../components/ui/Toast';
import { addDays, isAfter, isBefore, startOfDay, endOfDay, parseISO } from 'date-fns';

export function Reports() {
  const { workers, sites } = useWorkers();
  const { toast } = useToast();

  const [siteFilter, setSiteFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  
  // Ficha NR-6 Viewer State
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [isGeneratingFicha, setIsGeneratingFicha] = useState(false);

  const [showDaysModal, setShowDaysModal] = useState(false);
  const [daysValue, setDaysValue] = useState<number>(30);
  const [pendingReportType, setPendingReportType] = useState<string | null>(null);
  
  const generateReport = async (type: string, days?: number) => {
    try {
      let dataToExport = [];
      
      if (type === 'workers') {
        const { data } = await supabase.from('workers').select('full_name, registration_number, cpf, work_sector, current_role, admission_date, current_site_id, status');
        dataToExport = (data || []).map(w => ({
          Nome: w.full_name,
          Matricula: w.registration_number,
          CPF: w.cpf,
          Setor: w.work_sector,
          Funcao: w.current_role,
          Admissao: w.admission_date ? new Date(w.admission_date).toLocaleDateString() : 'N/A',
          Status: w.status
        }));
      } else if (type === 'inventory_catalog' || type === 'inventory_status') {
        const { data } = await supabase.from('epi_catalog').select('code, name, category, brand, model, ca_number, current_stock, minimum_stock');
        dataToExport = (data || []).map(c => ({
          Codigo: c.code,
          Nome: c.name,
          Categoria: c.category,
          Marca: c.brand,
          Modelo: c.model,
          CA: c.ca_number,
          Estoque_Atual: c.current_stock,
          Estoque_Minimo: c.minimum_stock,
          Status_Estoque: c.current_stock <= c.minimum_stock ? 'BAIXO' : 'OK'
        }));
      } else if (type === 'deliveries') {
        const query = supabase.from('epi_assignments').select(`
          assigned_at, returned_at, condition_on_return,
          worker:workers(full_name, department),
          catalog:epi_catalog!catalog_id(name, code)
        `);
        const { data } = await query;
        dataToExport = (data || []).map(a => ({
          Trabalhador: (a.worker as any)?.full_name,
          Setor: (a.worker as any)?.department,
          EPI: (a.catalog as any)?.name,
          Codigo: (a.catalog as any)?.code,
          Data_Entrega: new Date(a.assigned_at).toLocaleDateString(),
          Data_Devolucao: a.returned_at ? new Date(a.returned_at).toLocaleDateString() : 'Em Uso',
          Condicao_Retorno: a.condition_on_return || '-'
        }));
      } else if (type === 'expiring' || type === 'forecast') {
        const { data } = await supabase.from('epi_assignments').select('tracking_code, assigned_at, catalog:epi_catalog(name, ca_validity, recommended_lifespan_days)').is('returned_at', null);
        
        let filteredData = data || [];
        if (days !== undefined) {
          const today = startOfDay(new Date());
          const limitDate = endOfDay(addDays(today, days));

          filteredData = filteredData.filter((e: any) => {
            if (type === 'expiring') {
              const validityStr = e.catalog?.ca_validity;
              if (!validityStr) return false;
              const validityDate = parseISO(validityStr);
              return !isBefore(validityDate, today) && !isAfter(validityDate, limitDate);
            } else if (type === 'forecast') {
              const validityStr = e.catalog?.ca_validity;
              if (!validityStr) return false;
              const validityDate = parseISO(validityStr);
              return !isBefore(validityDate, today) && !isAfter(validityDate, limitDate);
            }
            return false;
          });
        }

        dataToExport = filteredData.map((e: any) => {
          const expDate = e.catalog?.ca_validity ? new Date(e.catalog.ca_validity).toLocaleDateString() : 'N/A';
          return {
            Codigo_Rastreio: e.tracking_code,
            Nome_EPI: e.catalog?.name,
            Validade_CA: expDate,
            Vida_Util_Dias: e.catalog?.recommended_lifespan_days || 'N/A'
          };
        });
      }

      if (dataToExport.length === 0) {
        toast({ type: 'error', title: 'Sem Dados', message: 'Não há dados para exportar.' });
        return;
      }

      // Import papaparse dynamically or assume it's imported
      
      const csv = Papa.unparse(dataToExport);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `relatorio_${type}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ type: 'success', title: 'Relatório Gerado', message: 'O download foi iniciado com sucesso.' });
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message });
    }
  };

  const handleCardClick = (id: string) => {
    if (id === 'expiring' || id === 'forecast') {
      setPendingReportType(id);
      setShowDaysModal(true);
    } else {
      generateReport(id);
    }
  };

  const confirmModalReport = () => {
    if (pendingReportType) {
      generateReport(pendingReportType, daysValue);
    }
    setShowDaysModal(false);
  };


  const fetchFichaData = async () => {
    const worker = workers.find(w => w.id === selectedWorkerId);
    if (!worker) throw new Error("Trabalhador não encontrado.");

    const { data: assignments } = await supabase
      .from('epi_assignments')
      .select('*, catalog:epi_catalog!catalog_id(*)')
      .eq('worker_id', worker.id)
      .order('assigned_at', { ascending: false });

    return { worker, assignments: assignments || [] };
  };

  const handlePreviewFicha = async () => {
    if (!selectedWorkerId) return;
    setIsGeneratingFicha(true);
    try {
      const { worker, assignments } = await fetchFichaData();
      await generateEpiRecordPdf(worker, assignments, 'preview');
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message });
    } finally {
      setIsGeneratingFicha(false);
    }
  };

  const handleDownloadFicha = async () => {
    if (!selectedWorkerId) return;
    setIsGeneratingFicha(true);
    try {
      const { worker, assignments } = await fetchFichaData();
      await generateEpiRecordPdf(worker, assignments, 'download');
      toast({ type: 'success', title: 'PDF Gerado', message: 'Download da Ficha de EPI iniciado.' });
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message });
    } finally {
      setIsGeneratingFicha(false);
    }
  };

  const reportCards = [
    { id: 'workers', title: 'Relatório de Funcionários', icon: Users, desc: 'Lista de funcionários ativos e inativos com seus EPIs', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'inventory_catalog', title: 'Relatório de EPIs cadastrados', icon: FileText, desc: 'Catálogo completo de equipamentos e C.A', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { id: 'deliveries', title: 'Relatório de Entregas', icon: Package, desc: 'Histórico de todas as movimentações no período', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'inventory_status', title: 'Relatório de Estoque', icon: BarChart3, desc: 'Posição atual do estoque e valor imobilizado', color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { id: 'expiring', title: 'EPIs Vencendo', icon: AlertTriangle, desc: 'Equipamentos com C.A ou validade técnica próximos do fim', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'forecast', title: 'Previsão de Trocas', icon: Clock, desc: 'Projeção de substituições baseada no tempo de vida útil', color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Relatórios Gerenciais</h1>
        <p className="text-muted mt-2">Extração de dados para conformidade e análise.</p>
      </div>

      {/* Global Filters */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2"><Filter className="w-5 h-5" /> Filtros Globais</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted">Obra</label>
            <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-md text-sm">
              <option value="">Todas as Obras</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted">Setor</label>
            <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-md text-sm">
              <option value="">Todos os Setores</option>
              <option value="Operacional">Operacional</option>
              <option value="Administrativo">Administrativo</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-muted">Período</label>
            <div className="flex items-center gap-2">
              <input type="date" className="w-full px-4 py-2 bg-background border border-border rounded-md text-sm" />
              <span className="text-muted">até</span>
              <input type="date" className="w-full px-4 py-2 bg-background border border-border rounded-md text-sm" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Ficha NR-6 Generator */}
      <div className="bg-surface border border-border rounded-xl p-6 mt-8">
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" /> Ficha de EPI (NR-6)
        </h2>
        <p className="text-sm text-muted mb-6">Selecione o trabalhador para visualizar ou baixar o documento formal (PDF).</p>
        
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full space-y-2">
            <label className="text-sm font-medium text-foreground">Trabalhador</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted" />
              <select 
                value={selectedWorkerId} 
                onChange={e => setSelectedWorkerId(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md"
              >
                <option value="">Selecione um funcionário...</option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>{w.full_name} (Mat: {w.registration_number})</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={handlePreviewFicha}
              disabled={!selectedWorkerId || isGeneratingFicha}
              className="flex-1 md:flex-none px-5 py-2 bg-surface border border-border text-foreground font-bold rounded-md hover:bg-surface-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" /> Visualizar
            </button>
            <button 
              onClick={handleDownloadFicha}
              disabled={!selectedWorkerId || isGeneratingFicha}
              className="flex-1 md:flex-none px-5 py-2 bg-primary text-background font-bold rounded-md hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isGeneratingFicha ? 'Gerando...' : <><Download className="w-4 h-4" /> Baixar PDF</>}
            </button>
          </div>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Exportações Disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportCards.map(card => (
            <div key={card.id} className="bg-surface border border-border rounded-xl p-6 flex flex-col hover:border-primary/50 transition-colors group cursor-pointer" onClick={() => handleCardClick(card.id)}>
              <div className={`w-12 h-12 ${card.bg} ${card.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <card.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-foreground text-lg mb-1">{card.title}</h3>
              <p className="text-sm text-muted mb-6 flex-1">{card.desc}</p>
              <div className="flex items-center text-primary text-sm font-medium gap-1">
                <Download className="w-4 h-4" /> Gerar Relatório
              </div>
            </div>
          ))}
        </div>
      </div>



      {/* Days Modal */}
      {showDaysModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-lg w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-border">
              <h3 className="text-lg font-bold">Filtro de Relatório</h3>
              <button onClick={() => setShowDaysModal(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Prazo em dias (ex: 30)
                </label>
                <input
                  type="number"
                  value={daysValue}
                  onChange={e => setDaysValue(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-surface border border-border rounded-md focus:outline-none focus:border-primary"
                  min={1}
                />
              </div>
              <button onClick={confirmModalReport} className="w-full px-4 py-2 bg-primary text-background font-bold rounded-md hover:bg-primary-dark transition-colors">
                Gerar Relatório
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
