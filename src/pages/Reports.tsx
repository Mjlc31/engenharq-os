import React, { useState } from 'react';
import { useWorkers } from '../hooks/useWorkers';
import { FileText, Download, Filter, Users, Package, Clock, AlertTriangle, CalendarRange, Search, BarChart3, X, Eye, CheckSquare, Square, Receipt } from 'lucide-react';
import { generateEpiRecordPdf, generateSelectiveLostChargePdf } from '../lib/pdfGenerator';
import { supabase } from '../lib/supabase';
import Papa from 'papaparse';
import { useToast } from '../components/ui/Toast';
import { addDays, isAfter, isBefore, startOfDay, endOfDay, parseISO, format } from 'date-fns';

export function Reports() {
  const { workers, sites } = useWorkers();
  const { toast } = useToast();

  const [siteFilter, setSiteFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  
  // Ficha NR-6 & Selective Report State
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [workerSearchTerm, setWorkerSearchTerm] = useState('');
  const [workerAssignments, setWorkerAssignments] = useState<any[]>([]);
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [isGeneratingFicha, setIsGeneratingFicha] = useState(false);
  const [isGeneratingSelective, setIsGeneratingSelective] = useState(false);

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


  const handleSelectWorker = async (workerId: string) => {
    setSelectedWorkerId(workerId);
    setSelectedAssignmentIds([]);
    if (!workerId) {
      setWorkerAssignments([]);
      return;
    }
    setLoadingAssignments(true);
    try {
      const { data, error } = await supabase
        .from('epi_assignments')
        .select('*, catalog:epi_catalog!catalog_id(*)')
        .eq('worker_id', workerId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setWorkerAssignments(data || []);
      // Auto-select all by default
      setSelectedAssignmentIds((data || []).map(a => a.id));
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message });
    } finally {
      setLoadingAssignments(false);
    }
  };

  const toggleSelectAssignment = (id: string) => {
    setSelectedAssignmentIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllAssignments = () => {
    if (selectedAssignmentIds.length === workerAssignments.length) {
      setSelectedAssignmentIds([]);
    } else {
      setSelectedAssignmentIds(workerAssignments.map(a => a.id));
    }
  };

  const selectedAssignmentsList = workerAssignments.filter(a => selectedAssignmentIds.includes(a.id));
  const selectedTotalAmount = selectedAssignmentsList.reduce((acc, a) => {
    const unitPrice = Number(a.unit_price_at_delivery ?? a.catalog?.unit_price ?? 0);
    return acc + unitPrice;
  }, 0);

  const handleGenerateSelectiveReport = async (mode: 'download' | 'preview' = 'download') => {
    const worker = workers.find(w => w.id === selectedWorkerId);
    if (!worker) {
      toast({ type: 'error', title: 'Atenção', message: 'Selecione um colaborador primeiro.' });
      return;
    }
    if (selectedAssignmentsList.length === 0) {
      toast({ type: 'error', title: 'Atenção', message: 'Selecione ao menos um item de EPI para o relatório.' });
      return;
    }

    setIsGeneratingSelective(true);
    try {
      const site = sites.find(s => s.id === worker.current_site_id);
      await generateSelectiveLostChargePdf(worker, selectedAssignmentsList, site?.name, mode);
      if (mode === 'download') {
        toast({ type: 'success', title: 'Sucesso', message: 'Relatório de extravio/cobrança gerado com sucesso!' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message });
    } finally {
      setIsGeneratingSelective(false);
    }
  };

  const handlePreviewFicha = async () => {
    const worker = workers.find(w => w.id === selectedWorkerId);
    if (!worker) return;
    setIsGeneratingFicha(true);
    try {
      await generateEpiRecordPdf(worker, workerAssignments, 'preview');
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message });
    } finally {
      setIsGeneratingFicha(false);
    }
  };

  const handleDownloadFicha = async () => {
    const worker = workers.find(w => w.id === selectedWorkerId);
    if (!worker) return;
    setIsGeneratingFicha(true);
    try {
      await generateEpiRecordPdf(worker, workerAssignments, 'download');
      toast({ type: 'success', title: 'PDF Gerado', message: 'Download da Ficha de EPI iniciado.' });
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message });
    } finally {
      setIsGeneratingFicha(false);
    }
  };

  const filteredWorkers = workers.filter(w => {
    const term = workerSearchTerm.toLowerCase().trim();
    if (!term) return true;
    const nameMatch = w.full_name?.toLowerCase().includes(term);
    const matMatch = w.registration_number?.toLowerCase().includes(term);
    const cpfMatch = w.cpf?.toLowerCase().includes(term);
    return nameMatch || matMatch || cpfMatch;
  });

  const selectedWorkerObj = workers.find(w => w.id === selectedWorkerId);

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
      
      {/* Ficha NR-6 & Cautela Seletiva Generator */}
      <div className="bg-surface border border-border rounded-xl p-6 mt-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <FileText className="w-6 h-6 text-primary" /> Ficha de EPI (NR-6) & Cautela Seletiva de Extravio
            </h2>
            <p className="text-sm text-muted">
              Busque o colaborador por Nome ou Matrícula, selecione os itens desejados e emita o relatório formal ou a ficha de entrega completa.
            </p>
          </div>
          {selectedWorkerObj && (
            <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-surface-hover border border-border flex items-center gap-2">
              <span className="text-muted">Obra Atual:</span>
              <span className="text-primary">{sites.find(s => s.id === selectedWorkerObj.current_site_id)?.name || 'Central'}</span>
            </div>
          )}
        </div>
        
        {/* Filtro duplo: Busca textual + Seletor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted">Filtrar Colaborador (Nome, Matrícula ou CPF)</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
              <input
                type="text"
                placeholder="Ex: Arthur, 12345, 080..."
                value={workerSearchTerm}
                onChange={e => setWorkerSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted">Selecione o Colaborador ({filteredWorkers.length} encontrados)</label>
            <select 
              value={selectedWorkerId} 
              onChange={e => handleSelectWorker(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="">Selecione um funcionário...</option>
              {filteredWorkers.map(w => (
                <option key={w.id} value={w.id}>
                  {w.full_name} — Mat: {w.registration_number} (CPF: {w.cpf})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabela de Itens do Colaborador para Seleção */}
        {selectedWorkerId && (
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background/50 p-3 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAllAssignments}
                  disabled={workerAssignments.length === 0}
                  className="flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
                >
                  {selectedAssignmentIds.length === workerAssignments.length && workerAssignments.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-primary" />
                  ) : (
                    <Square className="w-4 h-4 text-muted" />
                  )}
                  Selecionar Todos ({workerAssignments.length})
                </button>
                <span className="text-xs text-muted">
                  • <strong>{selectedAssignmentIds.length}</strong> de {workerAssignments.length} itens marcados
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Subtotal Acumulado:</span>
                <span className="text-sm font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                  R$ {selectedTotalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {loadingAssignments ? (
              <div className="p-8 text-center text-muted flex items-center justify-center gap-2 text-sm">
                <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                Carregando histórico de entregas...
              </div>
            ) : workerAssignments.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm bg-background/20 rounded-lg border border-dashed border-border">
                Nenhum EPI registrado ou entregue para este colaborador.
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-surface-hover text-muted uppercase font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="w-10 px-4 py-2.5 text-center">Sel.</th>
                      <th className="px-4 py-2.5">Item / EPI</th>
                      <th className="px-4 py-2.5">C.A.</th>
                      <th className="px-4 py-2.5">Data Entrega</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Valor Unit.</th>
                      <th className="px-4 py-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {workerAssignments.map((assignment) => {
                      const isSelected = selectedAssignmentIds.includes(assignment.id);
                      const unitVal = Number(assignment.unit_price_at_delivery ?? assignment.catalog?.unit_price ?? 0);
                      const isReturned = !!assignment.returned_at;

                      return (
                        <tr
                          key={assignment.id}
                          onClick={() => toggleSelectAssignment(assignment.id)}
                          className={`hover:bg-surface-hover/50 cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/5' : ''
                          }`}
                        >
                          <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectAssignment(assignment.id)}
                              className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-2.5 font-medium text-foreground">
                            {assignment.catalog?.name || 'EPI Não Identificado'}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-muted">
                            {assignment.catalog?.ca_number || '-'}
                          </td>
                          <td className="px-4 py-2.5 text-muted">
                            {assignment.assigned_at ? format(new Date(assignment.assigned_at), 'dd/MM/yyyy') : '-'}
                          </td>
                          <td className="px-4 py-2.5">
                            {isReturned ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                Devolvido
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Em Posse
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-muted">
                            R$ {unitVal.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
                            R$ {unitVal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ações de Emissão de Relatórios */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={selectedAssignmentIds.length === 0 || isGeneratingSelective}
                  onClick={() => handleGenerateSelectiveReport('download')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-md text-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
                  title="Gera termo de extravio/cobrança com termo de ciência CLT art. 462"
                >
                  <Receipt className="w-4 h-4" />
                  {isGeneratingSelective ? 'Gerando...' : `Gerar Relatório de Extravio / Cobrança (${selectedAssignmentIds.length} itens)`}
                </button>
                <button
                  type="button"
                  disabled={selectedAssignmentIds.length === 0 || isGeneratingSelective}
                  onClick={() => handleGenerateSelectiveReport('preview')}
                  className="px-3 py-2 bg-surface hover:bg-surface-hover border border-border text-foreground font-semibold rounded-md text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Prévia Cautela
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button 
                  type="button"
                  onClick={handlePreviewFicha}
                  disabled={!selectedWorkerId || isGeneratingFicha}
                  className="px-3 py-2 bg-surface border border-border text-foreground font-semibold rounded-md text-xs hover:bg-surface-hover disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Prévia Ficha NR-6
                </button>
                <button 
                  type="button"
                  onClick={handleDownloadFicha}
                  disabled={!selectedWorkerId || isGeneratingFicha}
                  className="px-4 py-2 bg-primary text-background font-bold rounded-md text-xs hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer shadow"
                >
                  {isGeneratingFicha ? 'Gerando...' : <><Download className="w-4 h-4" /> Baixar Ficha NR-6 (PDF)</>}
                </button>
              </div>
            </div>
          </div>
        )}
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
