import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkers } from '../hooks/useWorkers';
import { supabase } from '../lib/supabase';
import { generateSelectiveLostChargePdf } from '../lib/pdfGenerator';
import { useToast } from '../components/ui/Toast';
import { ReportsManagementGrid } from '../components/features/reports/ReportsManagementGrid';
import { FichaEpiLayoutConfig } from '../components/features/reports/FichaEpiLayoutConfig';
import { 
  BarChart3, 
  FileText, 
  AlertTriangle, 
  Search, 
  CheckSquare, 
  Square, 
  Download, 
  Eye, 
  Receipt, 
  User, 
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';

export function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'management' | 'ficha' | 'selective') || 'management';
  const [activeTab, setActiveTab] = useState<'management' | 'ficha' | 'selective'>(initialTab);

  const { workers, sites } = useWorkers();
  const { toast } = useToast();

  // State for Selective Lost Charge Report (Tab 3)
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [workerSearchTerm, setWorkerSearchTerm] = useState('');
  const [workerAssignments, setWorkerAssignments] = useState<any[]>([]);
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [isGeneratingSelective, setIsGeneratingSelective] = useState(false);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['management', 'ficha', 'selective'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl as any);
    }
  }, [searchParams]);

  const switchTab = (tab: 'management' | 'ficha' | 'selective') => {
    setActiveTab(tab);
    setSearchParams({ tab });
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
      toast({ type: 'error', title: 'Erro ao carregar EPIs', message: err.message });
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

  const filteredWorkers = workers.filter(w => {
    const term = workerSearchTerm.toLowerCase().trim();
    if (!term) return true;
    const nameMatch = w.full_name?.toLowerCase().includes(term);
    const matMatch = w.registration_number?.toLowerCase().includes(term);
    const cpfMatch = w.cpf?.toLowerCase().includes(term);
    return nameMatch || matMatch || cpfMatch;
  });

  const selectedWorkerObj = workers.find(w => w.id === selectedWorkerId);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Central de Relatórios
          </h1>
          <p className="text-sm text-muted">
            Emissão de relatórios gerenciais, Ficha de EPI (NR-6) e termos de extravio/cobrança
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => switchTab('management')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'management'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Relatórios Gerenciais (8 Módulos)
        </button>

        <button
          onClick={() => switchTab('ficha')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'ficha'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          <FileText className="w-4 h-4" />
          Ficha de EPI (NR-6) & Layout
        </button>

        <button
          onClick={() => switchTab('selective')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'selective'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Cautela Seletiva de Extravio (CLT 462)
        </button>
      </div>

      {/* Tab 1: Relatórios Gerenciais (Matching Image 5) */}
      {activeTab === 'management' && (
        <ReportsManagementGrid />
      )}

      {/* Tab 2: Ficha de EPI (Matching Image 3) */}
      {activeTab === 'ficha' && (
        <FichaEpiLayoutConfig defaultTab="generate" />
      )}

      {/* Tab 3: Cautela Seletiva de Extravio (CLT 462) */}
      {activeTab === 'selective' && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-500" />
                  Cautela Seletiva de Cobrança / Extravio
                </h3>
                <p className="text-xs text-muted mt-1">
                  Selecione os itens específicos que foram extraviados ou danificados para emitir o termo formal de desconto em folha (CLT Art. 462).
                </p>
              </div>

              {selectedWorkerId && (
                <div className="flex items-center gap-2">
                  <button
                    disabled={isGeneratingSelective || selectedAssignmentsList.length === 0}
                    onClick={() => handleGenerateSelectiveReport('preview')}
                    className="px-3.5 py-2 rounded-lg border border-border bg-background hover:bg-surface-hover text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-muted" />
                    Visualizar Termo
                  </button>

                  <button
                    disabled={isGeneratingSelective || selectedAssignmentsList.length === 0}
                    onClick={() => handleGenerateSelectiveReport('download')}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Relatório (PDF)
                  </button>
                </div>
              )}
            </div>

            {/* Worker Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-muted">Colaborador</label>
                <div className="relative">
                  <select
                    value={selectedWorkerId}
                    onChange={(e) => handleSelectWorker(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                  >
                    <option value="">Selecione um colaborador...</option>
                    {filteredWorkers.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.full_name} {w.registration_number ? `(${w.registration_number})` : ''} - {w.work_sector || 'Sem Setor'}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted">
                    ▼
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted">Filtro Rápido</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    placeholder="Nome, CPF ou matrícula..."
                    value={workerSearchTerm}
                    onChange={(e) => setWorkerSearchTerm(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Worker Summary Banner */}
            {selectedWorkerObj && (
              <div className="bg-background rounded-lg p-4 border border-border mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-muted block text-[11px]">Nome:</span>
                  <span className="font-bold text-foreground">{selectedWorkerObj.full_name}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Matrícula / CPF:</span>
                  <span className="font-mono text-foreground">{selectedWorkerObj.registration_number || selectedWorkerObj.cpf || '-'}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Função:</span>
                  <span className="text-foreground">{selectedWorkerObj.current_role || selectedWorkerObj.initial_role || '-'}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Setor:</span>
                  <span className="text-foreground">{selectedWorkerObj.work_sector || '-'}</span>
                </div>
              </div>
            )}

            {/* Assignments Checkbox Table */}
            {selectedWorkerId ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleSelectAllAssignments}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    {selectedAssignmentIds.length === workerAssignments.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    {selectedAssignmentIds.length === workerAssignments.length ? 'Desmarcar Todos' : 'Selecionar Todos os Itens'}
                  </button>

                  <div className="text-xs font-semibold text-muted">
                    Selecionados: <span className="text-primary font-bold">{selectedAssignmentIds.length}</span> de {workerAssignments.length}
                  </div>
                </div>

                {loadingAssignments ? (
                  <div className="text-center py-12 text-muted text-xs animate-pulse">
                    Carregando entregas do colaborador...
                  </div>
                ) : workerAssignments.length === 0 ? (
                  <div className="text-center py-12 text-muted text-xs border border-dashed border-border rounded-lg">
                    Nenhum EPI registrado em posse deste colaborador.
                  </div>
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-background border-b border-border font-semibold text-muted uppercase text-[10px] tracking-wider">
                          <th className="p-3 w-10 text-center">Sel.</th>
                          <th className="p-3">Equipamento (EPI)</th>
                          <th className="p-3 text-center">C.A.</th>
                          <th className="p-3 text-center">Data Entrega</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-right">Valor Unit.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {workerAssignments.map(a => {
                          const isSelected = selectedAssignmentIds.includes(a.id);
                          const unitPrice = Number(a.unit_price_at_delivery ?? a.catalog?.unit_price ?? 0);
                          return (
                            <tr 
                              key={a.id} 
                              onClick={() => toggleSelectAssignment(a.id)}
                              className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-surface-hover'}`}
                            >
                              <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectAssignment(a.id)}
                                  className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                />
                              </td>
                              <td className="p-3 font-medium text-foreground">
                                {a.catalog?.name || 'EPI Não especificado'}
                              </td>
                              <td className="p-3 text-center font-mono text-muted">
                                {a.catalog?.ca_number || '-'}
                              </td>
                              <td className="p-3 text-center font-mono text-muted">
                                {a.assigned_at ? format(new Date(a.assigned_at), 'dd/MM/yyyy') : '-'}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  a.returned_at ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                }`}>
                                  {a.returned_at ? 'Devolvido' : 'Em Posse'}
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono font-medium text-foreground">
                                R$ {unitPrice.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Subtotal & Authorization Box */}
                {workerAssignments.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                    <div>
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                        Total dos Itens Selecionados para Cautela/Desconto
                      </p>
                      <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                        {selectedAssignmentsList.length} itens inclusos no termo com fundamentação no Art. 462 da CLT.
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-muted block">Valor Total Acumulado:</span>
                      <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                        R$ {selectedTotalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted border border-dashed border-border rounded-xl">
                <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium text-foreground">Nenhum colaborador selecionado</p>
                <p className="text-xs text-muted">Selecione um funcionário acima para visualizar os EPIs em posse e emitir a cautela.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
