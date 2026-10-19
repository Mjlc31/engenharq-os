import React, { useState, useEffect, useRef } from 'react';
import { useWorkers } from '../../../hooks/useWorkers';
import { supabase } from '../../../lib/supabase';
import { generateEpiRecordPdf } from '../../../lib/pdfGenerator';
import { useToast } from '../../ui/Toast';
import { 
  FileText, 
  Settings, 
  Eye, 
  Printer, 
  Download, 
  RotateCcw, 
  Save, 
  Sliders, 
  MoveVertical, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

export interface LayoutOffsets {
  firstRowY: number;
  rowHeight: number;
  headerY: number;
  sigOffsetY: number;
}

const DEFAULT_OFFSETS: LayoutOffsets = {
  firstRowY: 377,
  rowHeight: 22,
  headerY: 725.5,
  sigOffsetY: 4
};

interface FichaEpiLayoutConfigProps {
  initialWorkerId?: string;
  defaultTab?: 'generate' | 'config';
}

export function FichaEpiLayoutConfig({ initialWorkerId, defaultTab = 'generate' }: FichaEpiLayoutConfigProps) {
  const { workers } = useWorkers();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'generate' | 'config'>(defaultTab);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(initialWorkerId || '');
  const [workerSearchTerm, setWorkerSearchTerm] = useState('');
  const [workerAssignments, setWorkerAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [previewPage, setPreviewPage] = useState<number>(0);

  // Layout Calibration Offsets
  const [offsets, setOffsets] = useState<LayoutOffsets>(() => {
    try {
      const saved = localStorage.getItem('nr6_layout_offsets');
      if (saved) return { ...DEFAULT_OFFSETS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_OFFSETS;
  });

  const [isSaved, setIsSaved] = useState(true);

  // Dragging state for canvas guidelines
  const [draggingTarget, setDraggingTarget] = useState<'header' | 'firstRow' | 'rowHeight' | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Load assignments when worker changes
  useEffect(() => {
    setPreviewPage(0);
    if (!selectedWorkerId) {
      setWorkerAssignments([]);
      return;
    }

    async function fetchAssignments() {
      setLoadingAssignments(true);
      try {
        const { data, error } = await supabase
          .from('epi_assignments')
          .select('*, catalog:epi_catalog!catalog_id(*)')
          .eq('worker_id', selectedWorkerId)
          .order('assigned_at', { ascending: false });

        if (error) throw error;
        setWorkerAssignments(data || []);
      } catch (err: any) {
        toast({ type: 'error', title: 'Erro ao carregar EPIs', message: err.message });
      } finally {
        setLoadingAssignments(false);
      }
    }

    fetchAssignments();
  }, [selectedWorkerId, toast]);

  const selectedWorker = workers.find(w => w.id === selectedWorkerId);

  // Chronological sort matching PDF generator
  const sortedAssignments = [...workerAssignments].sort((a, b) => 
    new Date(a.assigned_at || 0).getTime() - new Date(b.assigned_at || 0).getTime()
  );
  const totalPages = Math.max(1, Math.ceil(sortedAssignments.length / 16));
  const currentAssignments = sortedAssignments.slice(previewPage * 16, (previewPage + 1) * 16);

  const filteredWorkers = workers.filter(w => {
    if (!workerSearchTerm) return true;
    const term = workerSearchTerm.toLowerCase();
    return (
      w.full_name?.toLowerCase().includes(term) ||
      w.registration_number?.toLowerCase().includes(term) ||
      w.cpf?.toLowerCase().includes(term)
    );
  });

  const updateOffset = (key: keyof LayoutOffsets, value: number) => {
    setOffsets(prev => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const handleSaveCalibration = () => {
    try {
      localStorage.setItem('nr6_layout_offsets', JSON.stringify(offsets));
      setIsSaved(true);
      toast({ 
        type: 'success', 
        title: 'Calibração Salva!', 
        message: 'As coordenadas foram gravadas e serão aplicadas nas exportações de PDF.' 
      });
    } catch {
      toast({ type: 'error', title: 'Erro', message: 'Não foi possível salvar a calibração no navegador.' });
    }
  };

  const handleRestoreDefaults = () => {
    setOffsets(DEFAULT_OFFSETS);
    setIsSaved(false);
    toast({ 
      type: 'info', 
      title: 'Padrão Oficial Restaurado', 
      message: 'Coordenadas redefinidas para os valores certificados NR-6 (377px / 22px / 722px).' 
    });
  };

  const handleAction = async (mode: 'download' | 'preview' | 'print') => {
    if (!selectedWorker) {
      toast({ type: 'warning', title: 'Selecione um Funcionário', message: 'Escolha um colaborador para gerar a Ficha de EPI.' });
      return;
    }

    setIsProcessingPdf(true);
    try {
      if (mode === 'print') {
        const blob = await generateEpiRecordPdf(selectedWorker, workerAssignments, 'preview', offsets);
        if (blob) {
          const url = URL.createObjectURL(blob);
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = url;
          document.body.appendChild(iframe);
          iframe.onload = () => {
            iframe.contentWindow?.print();
          };
        }
      } else {
        await generateEpiRecordPdf(selectedWorker, workerAssignments, mode, offsets);
        if (mode === 'download') {
          toast({ type: 'success', title: 'PDF Baixado', message: 'A Ficha de EPI foi exportada com sucesso.' });
        }
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro ao gerar PDF', message: err.message || 'Verifique o template do documento.' });
    } finally {
      setIsProcessingPdf(false);
    }
  };

  // Convert PDF coordinates (points from bottom: 0 to 842) to canvas preview position (pixels from top: 0 to 100%)
  // PDF height is 842pt, width is 595pt
  const pdfToCanvasPercentY = (pdfY: number) => {
    return ((842 - pdfY) / 842) * 100;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Ficha de EPI
          </h1>
          <p className="text-sm text-muted">
            Gere e imprima fichas de controle de EPI conforme NR-6
          </p>
        </div>

        <button
          onClick={() => setActiveTab(activeTab === 'config' ? 'generate' : 'config')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            activeTab === 'config'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-surface hover:bg-surface-hover text-foreground border-border'
          }`}
        >
          <Settings className="w-4 h-4" />
          {activeTab === 'config' ? 'Voltar para Emissão' : 'Configurar Layout'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('generate')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'generate'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          <FileText className="w-4 h-4" />
          Gerar Ficha
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'config'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Configuração do Layout
          {!isSaved && (
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="Alterações não salvas" />
          )}
        </button>
      </div>

      {/* Main Content: Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form / Controls */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {activeTab === 'generate' ? (
            /* Card Selecione o Funcionário */
            <div className="bg-surface rounded-xl border border-border p-5 shadow-sm flex flex-col gap-4">
              <h2 className="text-base font-semibold text-foreground">
                Selecione o Funcionário
              </h2>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted uppercase tracking-wider">
                  Funcionário
                </label>
                <div className="relative">
                  <select
                    value={selectedWorkerId}
                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    {filteredWorkers.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.full_name} {w.registration_number ? `(${w.registration_number})` : ''} - {w.status === 'INACTIVE' || w.status === 'DISMISSED' ? '[Inativo]' : '[Ativo]'}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted">
                    ▼
                  </div>
                </div>
              </div>

              {/* Quick Search */}
              <input
                type="text"
                placeholder="Filtrar por nome, CPF ou matrícula..."
                value={workerSearchTerm}
                onChange={(e) => setWorkerSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-xs placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />

              {/* Worker Info Pill */}
              {selectedWorker && (
                <div className="bg-background/80 rounded-lg p-3 border border-border text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted">Matrícula:</span>
                    <span className="font-mono font-medium">{selectedWorker.registration_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Cargo:</span>
                    <span className="font-medium truncate max-w-[170px]">{selectedWorker.current_role || selectedWorker.initial_role || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Setor:</span>
                    <span className="font-medium">{selectedWorker.work_sector || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-border">
                    <span className="text-muted">EPIs Registrados:</span>
                    <span className="font-bold text-primary">{workerAssignments.length} itens</span>
                  </div>
                </div>
              )}

              {/* Action Buttons Stack (matching Image 3) */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  disabled={!selectedWorkerId || isProcessingPdf || loadingAssignments}
                  onClick={() => handleAction('preview')}
                  className="w-full h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  Visualizar
                </button>

                <button
                  disabled={!selectedWorkerId || isProcessingPdf || loadingAssignments}
                  onClick={() => handleAction('print')}
                  className="w-full h-10 rounded-lg bg-surface hover:bg-surface-hover text-foreground font-medium text-sm border border-border flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>

                <button
                  disabled={!selectedWorkerId || isProcessingPdf || loadingAssignments}
                  onClick={() => handleAction('download')}
                  className="w-full h-10 rounded-lg bg-surface hover:bg-surface-hover text-foreground font-medium text-sm border border-border flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Baixar PDF
                </button>
              </div>

              {loadingAssignments && (
                <p className="text-[11px] text-muted text-center animate-pulse">
                  Carregando histórico de entregas...
                </p>
              )}
            </div>
          ) : (
            /* Configuração do Layout Panel (Image 3 Calibrator) */
            <div className="bg-surface rounded-xl border border-border p-5 shadow-sm flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  Ajuste de Calibração
                </h2>
                {!isSaved && (
                  <span className="text-[11px] font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                    Não salvo
                  </span>
                )}
              </div>

              <p className="text-xs text-muted">
                Ajuste os eixos milimétricos clicando nos botões ou arrastando as linhas de guia na folha.
              </p>

              {/* Control 1: Início da Tabela (1ª Linha) */}
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-background border border-border">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Início da Tabela (1ª Linha)
                  </label>
                  <span className="text-xs font-mono font-bold text-primary">{offsets.firstRowY} pt</span>
                </div>
                <input
                  type="range"
                  min="340"
                  max="420"
                  step="1"
                  value={offsets.firstRowY}
                  onChange={(e) => updateOffset('firstRowY', Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>Mais baixo</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateOffset('firstRowY', offsets.firstRowY - 1)}
                      className="px-2 py-0.5 rounded bg-surface border border-border hover:bg-surface-hover font-mono text-xs"
                      title="-1 ponto"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => updateOffset('firstRowY', offsets.firstRowY + 1)}
                      className="px-2 py-0.5 rounded bg-surface border border-border hover:bg-surface-hover font-mono text-xs"
                      title="+1 ponto"
                    >
                      +1
                    </button>
                  </div>
                  <span>Mais alto</span>
                </div>
              </div>

              {/* Control 2: Altura das Linhas */}
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-background border border-border">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Altura das Linhas (Espaçamento)
                  </label>
                  <span className="text-xs font-mono font-bold text-primary">{offsets.rowHeight} pt</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="28"
                  step="0.5"
                  value={offsets.rowHeight}
                  onChange={(e) => updateOffset('rowHeight', Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>Mais compacto</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateOffset('rowHeight', Number((offsets.rowHeight - 0.5).toFixed(1)))}
                      className="px-2 py-0.5 rounded bg-surface border border-border hover:bg-surface-hover font-mono text-xs"
                    >
                      -0.5
                    </button>
                    <button
                      onClick={() => updateOffset('rowHeight', Number((offsets.rowHeight + 0.5).toFixed(1)))}
                      className="px-2 py-0.5 rounded bg-surface border border-border hover:bg-surface-hover font-mono text-xs"
                    >
                      +0.5
                    </button>
                  </div>
                  <span>Mais espaçado</span>
                </div>
              </div>

              {/* Control 3: Cabeçalho Vertical */}
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-background border border-border">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Posição do Cabeçalho (Nome/Matrícula)
                  </label>
                  <span className="text-xs font-mono font-bold text-primary">{offsets.headerY} pt</span>
                </div>
                <input
                  type="range"
                  min="690"
                  max="750"
                  step="1"
                  value={offsets.headerY}
                  onChange={(e) => updateOffset('headerY', Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>Descer</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateOffset('headerY', offsets.headerY - 1)}
                      className="px-2 py-0.5 rounded bg-surface border border-border hover:bg-surface-hover font-mono text-xs"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => updateOffset('headerY', offsets.headerY + 1)}
                      className="px-2 py-0.5 rounded bg-surface border border-border hover:bg-surface-hover font-mono text-xs"
                    >
                      +1
                    </button>
                  </div>
                  <span>Subir</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <button
                  onClick={handleSaveCalibration}
                  className="w-full h-10 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Salvar Calibração
                </button>

                <button
                  onClick={handleRestoreDefaults}
                  className="w-full h-9 rounded-lg bg-surface hover:bg-surface-hover text-muted hover:text-foreground font-medium text-xs border border-border flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurar Padrão Oficial
                </button>

                {selectedWorker && (
                  <button
                    onClick={() => handleAction('preview')}
                    className="w-full h-9 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium text-xs border border-primary/20 flex items-center justify-center gap-2 transition-colors mt-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Testar no PDF Real
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Pré-visualização (matching Image 3) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="bg-surface rounded-xl border border-border p-4 shadow-sm flex flex-col min-h-[640px]">
            {/* Preview Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  Pré-visualização
                </h2>
                {activeTab === 'config' && (
                  <span className="text-[11px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium">
                    Modo Calibração Ativo
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Pagination Controls when worker is selected and totalPages > 1 */}
                {selectedWorker && totalPages > 1 && (
                  <div className="flex items-center gap-1.5 bg-background border border-border px-2 py-1 rounded-lg text-xs shadow-sm">
                    <button
                      disabled={previewPage === 0}
                      onClick={() => setPreviewPage(p => Math.max(0, p - 1))}
                      className="p-1 rounded hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-foreground"
                      title="Página Anterior"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-semibold text-foreground text-[11px] px-1 select-none">
                      Folha {previewPage + 1} de {totalPages} ({sortedAssignments.length} itens)
                    </span>
                    <button
                      disabled={previewPage >= totalPages - 1}
                      onClick={() => setPreviewPage(p => Math.min(totalPages - 1, p + 1))}
                      className="p-1 rounded hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-foreground"
                      title="Próxima Página"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-background border border-border px-1.5 py-1 rounded-lg">
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(70, prev - 10))}
                    className="p-1 rounded-md hover:bg-surface text-muted hover:text-foreground transition-colors"
                    title="Diminuir Zoom"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono text-muted px-1 min-w-[36px] text-center">{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(130, prev + 10))}
                    className="p-1 rounded-md hover:bg-surface text-muted hover:text-foreground transition-colors"
                    title="Aumentar Zoom"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(100)}
                    className="p-1 rounded-md hover:bg-surface text-muted hover:text-foreground transition-colors ml-0.5"
                    title="Ajustar à tela"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Document Canvas Container */}
            <div 
              ref={previewRef}
              className="flex-1 flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-900/60 rounded-lg overflow-auto border border-border/50 min-h-[600px]"
            >
              {!selectedWorker ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center text-center p-12 text-muted max-w-sm">
                  <div className="h-16 w-16 rounded-2xl bg-surface border border-border flex items-center justify-center mb-4 shadow-sm">
                    <FileText className="w-8 h-8 text-muted" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Selecione um funcionário para visualizar a ficha
                  </p>
                  <p className="text-xs text-muted">
                    Os dados do colaborador e histórico de entregas de EPI serão carregados instantaneamente na folha oficial certificada NR-6.
                  </p>
                </div>
              ) : (
                /* Official Template Sheet (Pixel-Perfect Fidelity Matching Generated PDF) */
                <div 
                  style={{ 
                    transform: `scale(${zoomLevel / 100})`, 
                    transformOrigin: 'top center',
                    width: '595px',
                    height: '842px',
                    backgroundImage: 'url(/ficha_epi_template_bg.png)',
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                  }}
                  className="relative bg-white shadow-2xl rounded-sm border border-slate-300 text-slate-900 select-none overflow-hidden shrink-0"
                >
                  {/* Calibrator Guidelines (Visible in Config Mode) */}
                  {activeTab === 'config' && (
                    <>
                      {/* Header Guideline */}
                      <div 
                        style={{ top: `${842 - offsets.headerY}px` }}
                        className="absolute left-0 right-0 border-t-2 border-dashed border-blue-500/80 z-30 flex items-center justify-between px-2 pointer-events-none"
                      >
                        <span className="bg-blue-600 text-white font-mono text-[8px] px-1.5 py-0.5 rounded shadow">
                          Cabeçalho: {offsets.headerY}pt
                        </span>
                      </div>

                      {/* First Row Top Guideline */}
                      <div 
                        style={{ top: `${842 - (offsets.firstRowY + offsets.rowHeight)}px` }}
                        className="absolute left-0 right-0 border-t-2 border-dashed border-emerald-500/80 z-30 flex items-center justify-between px-2 pointer-events-none"
                      >
                        <span className="bg-emerald-600 text-white font-mono text-[8px] px-1.5 py-0.5 rounded shadow">
                          Início Tabela: {offsets.firstRowY}pt
                        </span>
                      </div>

                      {/* Row Height Guideline (Row 2) */}
                      <div 
                        style={{ top: `${842 - offsets.firstRowY}px` }}
                        className="absolute left-0 right-0 border-t border-dotted border-amber-500/80 z-30 flex items-center justify-between px-2 pointer-events-none"
                      >
                        <span className="bg-amber-600 text-white font-mono text-[8px] px-1.5 py-0.5 rounded shadow">
                          Linha 2 (Espaçamento: {offsets.rowHeight}pt)
                        </span>
                      </div>
                    </>
                  )}

                  {/* Header Employee Details Overlaid on Template */}
                  {/* Nome do Empregado */}
                  <div 
                    style={{ left: '68px', top: `${842 - offsets.headerY - 9}px` }} 
                    className="absolute font-bold text-[9px] text-slate-950 uppercase tracking-tight pointer-events-none z-10"
                  >
                    {selectedWorker.full_name || 'N/A'}
                  </div>

                  {/* Matrícula */}
                  <div 
                    style={{ left: '390px', top: `${842 - offsets.headerY - 9}px` }} 
                    className="absolute font-mono font-bold text-[9px] text-slate-950 pointer-events-none z-10"
                  >
                    {selectedWorker.registration_number || selectedWorker.id?.slice(0, 8) || 'N/A'}
                  </div>

                  {/* Função / Cargo */}
                  <div 
                    style={{ left: '72px', top: `${842 - (offsets.headerY - 13) - 8}px` }} 
                    className="absolute font-semibold text-[8.5px] text-slate-900 uppercase truncate max-w-[220px] pointer-events-none z-10"
                  >
                    {selectedWorker.current_role || selectedWorker.initial_role || 'N/A'}
                  </div>

                  {/* Data de Admissão */}
                  {selectedWorker.admission_date && (
                    <div 
                      style={{ left: '410px', top: `${842 - (offsets.headerY - 13) - 8}px` }} 
                      className="absolute font-semibold text-[8.5px] text-slate-900 bg-white/95 px-1 rounded-sm pointer-events-none z-10"
                    >
                      {format(new Date(selectedWorker.admission_date), 'dd/MM/yyyy')}
                    </div>
                  )}

                  {/* 16 Table Rows with Exact Geometric Column Alignment */}
                  {Array.from({ length: 16 }).map((_, r) => {
                    const item = currentAssignments[r];
                    const catalog = item?.catalog || item?.epi?.catalog || {};
                    const epiName = catalog.name || item?.epi?.name || '';
                    const caNumber = catalog.ca_number || item?.epi?.ca_number || '';
                    const isUnif = catalog.category?.toLowerCase().includes('uniforme');
                    const rowTop = 842 - (offsets.firstRowY + offsets.rowHeight - (r * offsets.rowHeight));

                    return (
                      <div 
                        key={r}
                        style={{ 
                          top: `${rowTop}px`,
                          height: `${offsets.rowHeight}px`,
                        }}
                        className="absolute left-0 right-0 flex items-center pointer-events-none text-[7.5px] text-slate-950"
                      >
                        {/* Col 1: QTD (20.4 to 49.2, center 34.8) */}
                        <div style={{ left: '20px', width: '29px' }} className="absolute text-center font-bold font-mono">
                          {item ? '1' : ''}
                        </div>

                        {/* Col 2: UNIFORME/EPI (49.2 to 169.2, left 53) */}
                        <div style={{ left: '53px', width: '116px' }} className="absolute font-medium truncate leading-tight">
                          {item ? `${isUnif ? '[UNIF]' : '[EPI]'} ${epiName || 'EPI'}` : ''}
                        </div>

                        {/* Col 3: C.A. (169.2 to 212.1, center 190.6) */}
                        <div style={{ left: '169px', width: '43px' }} className="absolute text-center font-mono font-medium">
                          {item ? caNumber || '-' : ''}
                        </div>

                        {/* Col 4: DATA ENT (212.1 to 268.9, cover slashes) */}
                        {item?.assigned_at && (
                          <div 
                            style={{ left: '214px', width: '53px' }} 
                            className="absolute text-center font-mono font-medium bg-white/95 py-0.5 rounded-sm"
                          >
                            {format(new Date(item.assigned_at), 'dd/MM/yy')}
                          </div>
                        )}

                        {/* Col 5: ASSINATURA EMPREGADO (268.9 to 346.9, center 307.9) */}
                        <div style={{ left: '269px', width: '78px' }} className="absolute flex items-center justify-center">
                          {item?.digital_signature_url || item?.evidence_photo_url ? (
                            <img 
                              src={item.digital_signature_url || item.evidence_photo_url} 
                              alt="Assinatura" 
                              className="max-h-4 max-w-[72px] object-contain"
                            />
                          ) : item ? (
                            <span className="text-[6.5px] text-slate-500 italic">[Assinado]</span>
                          ) : null}
                        </div>

                        {/* Col 6: DATA DEV (346.9 to 411.0, cover slashes) */}
                        {item?.returned_at && (
                          <div 
                            style={{ left: '349px', width: '60px' }} 
                            className="absolute text-center font-mono font-medium bg-white/95 py-0.5 rounded-sm"
                          >
                            {format(new Date(item.returned_at), 'dd/MM/yy')}
                          </div>
                        )}

                        {/* Col 7: ASSINATURA DEVOLUÇÃO (411.0 to 489.0, center 450.0) */}
                        <div style={{ left: '411px', width: '78px' }} className="absolute flex items-center justify-center">
                          {item?.return_photo_url ? (
                            <img 
                              src={item.return_photo_url} 
                              alt="Devolução" 
                              className="max-h-4 max-w-[72px] object-contain"
                            />
                          ) : null}
                        </div>

                        {/* Col 8: ASSINATURA RECEBEDOR (489.0 to 574.4, center 531.7) */}
                        <div style={{ left: '489px', width: '85px' }} className="absolute text-center font-mono text-[7px] text-slate-400">
                          {item ? '✓' : ''}
                        </div>
                      </div>
                    );
                  })}

                  {/* Document Folio Stamp */}
                  <div 
                    style={{ left: '375px', bottom: '15px' }} 
                    className="absolute font-mono text-[7.5px] text-slate-500 pointer-events-none"
                  >
                    Folha {previewPage + 1} de {totalPages} • Impresso em: {format(new Date(), 'dd/MM/yyyy HH:mm')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
