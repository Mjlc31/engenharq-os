import React, { useState } from 'react';
import { useWorkers } from '../hooks/useWorkers';
import { FileText, Download, Filter, Users, Package, Clock, AlertTriangle, CalendarRange, Search, BarChart3 } from 'lucide-react';
import { generateEpiRecordPdf } from '../lib/pdfGenerator';
import { supabase } from '../lib/supabase';
import Papa from 'papaparse';
import { useToast } from '../components/ui/Toast';

export function Reports() {
  const { workers, sites } = useWorkers();
  const { toast } = useToast();

  const [siteFilter, setSiteFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  
  // Ficha NR-6 Viewer State
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [isGeneratingFicha, setIsGeneratingFicha] = useState(false);

  
  const generateReport = async (type: string) => {
    try {
      let dataToExport = [];
      
      if (type === 'funcionarios') {
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
      } else if (type === 'epis' || type === 'estoque') {
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
      } else if (type === 'entregas') {
        const query = supabase.from('epi_assignments').select(`
          assigned_at, returned_at, condition_on_return,
          worker:workers(full_name, department),
          epi:epi_inventory(tracking_code, catalog:epi_catalog(name))
        `);
        const { data } = await query;
        dataToExport = (data || []).map(a => ({
          Trabalhador: (a.worker as any)?.full_name,
          Setor: (a.worker as any)?.department,
          EPI: (a.epi as any)?.catalog?.name,
          Codigo_Rastreio: (a.epi as any)?.tracking_code,
          Data_Entrega: new Date(a.assigned_at).toLocaleDateString(),
          Data_Devolucao: a.returned_at ? new Date(a.returned_at).toLocaleDateString() : 'Em Uso',
          Condicao_Retorno: a.condition_on_return || '-'
        }));
      } else if (type === 'vencimentos' || type === 'trocas') {
        const { data } = await supabase.from('epi_assignments').select('assigned_at, catalog:epi_catalog(name, ca_validity, lifespan_days)').is('returned_at', null);
        dataToExport = (data || []).map(e => {
          const expDate = (e.catalog as any)?.ca_validity ? new Date((e.catalog as any)?.ca_validity).toLocaleDateString() : 'N/A';
          return {
            Codigo_Rastreio: (e.catalog as any)?.code,
            Nome_EPI: (e.catalog as any)?.name,
            Validade_CA: expDate,
            Vida_Util_Dias: (e.catalog as any)?.recommended_lifespan_days || 'N/A'
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


  const handleGenerateFicha = async () => {
    if (!selectedWorkerId) return;
    setIsGeneratingFicha(true);
    try {
      const worker = workers.find(w => w.id === selectedWorkerId);
      if (!worker) throw new Error("Trabalhador não encontrado.");

      const { data: assignments } = await supabase
        .from('epi_assignments')
        .select('*, epi:epi_inventory(*, catalog:epi_catalog(*))')
        .eq('worker_id', worker.id)
        .order('assigned_at', { ascending: false });

      generateEpiRecordPdf(worker, assignments || []);
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

      {/* Report Cards Grid */}
      <div>
        <h2 className="text-xl font-bold mb-4">Exportações Disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportCards.map(card => (
            <div key={card.id} className="bg-surface border border-border rounded-xl p-6 flex flex-col hover:border-primary/50 transition-colors group cursor-pointer" onClick={() => generateReport(card.id)}>
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

      {/* Ficha NR-6 Generator */}
      <div className="bg-surface border border-border rounded-xl p-6 mt-8">
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" /> Ficha de EPI (NR-6)
        </h2>
        <p className="text-sm text-muted mb-6">Selecione o trabalhador para visualizar ou imprimir o documento formal (PDF).</p>
        
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
          
          <button 
            onClick={handleGenerateFicha}
            disabled={!selectedWorkerId || isGeneratingFicha}
            className="w-full md:w-auto px-6 py-2 bg-primary text-background font-bold rounded-md hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isGeneratingFicha ? 'Gerando...' : 'Visualizar / Baixar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
