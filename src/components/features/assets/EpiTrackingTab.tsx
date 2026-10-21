import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Shield, 
  User, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  FileSpreadsheet, 
  RotateCcw, 
  ExternalLink, 
  Eye, 
  FileText, 
  Building2, 
  Filter, 
  X,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../../../lib/supabase';
import { ConstructionSite } from '../../../types';
import { useToast } from '../../../components/ui/Toast';
import { ValidityBadge } from '../../../components/ui/ValidityBadge';

interface EpiTrackingTabProps {
  sites?: ConstructionSite[];
}

const NR6_CATEGORIES = [
  'Todas as categorias',
  'Proteção da Cabeça',
  'Proteção dos Olhos e Face',
  'Proteção Auditiva',
  'Proteção Respiratória',
  'Proteção do Tronco',
  'Proteção dos Membros Superiores',
  'Proteção dos Membros Inferiores',
  'Proteção do Corpo Inteiro',
  'Proteção contra Quedas'
];

export function EpiTrackingTab({ sites = [] }: EpiTrackingTabProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas as categorias');
  const [statusFilter, setStatusFilter] = useState<'IN_USE' | 'EXPIRING' | 'RETURNED' | 'ALL'>('IN_USE');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals State
  const [evidenceModalData, setEvidenceModalData] = useState<{
    signatureUrl?: string | null;
    selfieUrl?: string | null;
    workerName: string;
    epiName: string;
    assignedAt: string;
  } | null>(null);

  const [returnModalData, setReturnModalData] = useState<{
    assignmentId: string;
    catalogId: string;
    workerName: string;
    epiName: string;
    quantity: number;
    siteId?: string | null;
  } | null>(null);
  const [returnCondition, setReturnCondition] = useState<'GOOD' | 'DAMAGED' | 'DISCARDED'>('GOOD');
  const [returnRestock, setReturnRestock] = useState(true);
  const [returnNotes, setReturnNotes] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Fetch all assignments with worker and catalog details
  const { data: assignments = [], isLoading, refetch } = useQuery({
    queryKey: ['epi-tracking-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epi_assignments')
        .select(`
          id,
          worker_id,
          catalog_id,
          quantity,
          assigned_at,
          returned_at,
          expected_return_date,
          condition_on_delivery,
          condition_on_return,
          evidence_type,
          digital_signature_url,
          return_signature_url,
          audit_selfie_url,
          generated_pdf_url,
          unit_price_at_delivery,
          tracking_code,
          worker:workers (
            id,
            full_name,
            cpf,
            current_role,
            department,
            current_site_id
          ),
          catalog:epi_catalog (
            id,
            name,
            category,
            brand,
            model,
            ca_number,
            ca_validity,
            unit_price,
            lifespan_days,
            image_url
          )
        `)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return (data || []) as any[];
    }
  });

  // Obra lookup map
  const sitesMap = useMemo(() => {
    const map = new Map<string, string>();
    sites.forEach(s => map.set(s.id, s.name));
    return map;
  }, [sites]);

  // KPIs
  const stats = useMemo(() => {
    let totalInUse = 0;
    const workerSet = new Set<string>();
    let expiringCount = 0;
    let fieldAssetValue = 0;

    const today = new Date();

    assignments.forEach(a => {
      const isReturned = !!a.returned_at;
      if (!isReturned) {
        const qty = a.quantity || 1;
        totalInUse += qty;
        if (a.worker_id) workerSet.add(a.worker_id);

        const price = a.unit_price_at_delivery || a.catalog?.unit_price || 0;
        fieldAssetValue += qty * price;

        // Check if exchange is overdue or near (<= 15 days)
        if (a.expected_return_date) {
          const daysLeft = differenceInCalendarDays(parseISO(a.expected_return_date), today);
          if (daysLeft <= 15) {
            expiringCount += 1;
          }
        }
      }
    });

    return {
      totalInUse,
      workersEquipped: workerSet.size,
      expiringCount,
      fieldAssetValue
    };
  }, [assignments]);

  // Filtered List
  const filteredAssignments = useMemo(() => {
    const today = new Date();
    const searchL = search.toLowerCase();

    return assignments.filter(item => {
      const isReturned = !!item.returned_at;

      // Status filter
      if (statusFilter === 'IN_USE' && isReturned) return false;
      if (statusFilter === 'RETURNED' && !isReturned) return false;
      if (statusFilter === 'EXPIRING') {
        if (isReturned) return false;
        if (!item.expected_return_date) return false;
        const daysLeft = differenceInCalendarDays(parseISO(item.expected_return_date), today);
        if (daysLeft > 15) return false;
      }

      // Site filter
      if (selectedSiteId !== 'ALL') {
        const workerSite = item.worker?.current_site_id;
        if (workerSite !== selectedSiteId) return false;
      }

      // Category filter
      if (selectedCategory !== 'Todas as categorias') {
        if (item.catalog?.category !== selectedCategory) return false;
      }

      // Search term
      if (searchL) {
        const workerName = (item.worker?.full_name || '').toLowerCase();
        const workerCpf = (item.worker?.cpf || '').toLowerCase();
        const workerRole = (item.worker?.current_role || '').toLowerCase();
        const epiName = (item.catalog?.name || '').toLowerCase();
        const epiBrand = (item.catalog?.brand || '').toLowerCase();
        const caNumber = (item.catalog?.ca_number || item.ca_number || '').toLowerCase();
        const tracking = (item.tracking_code || '').toLowerCase();

        const match = workerName.includes(searchL) ||
                      workerCpf.includes(searchL) ||
                      workerRole.includes(searchL) ||
                      epiName.includes(searchL) ||
                      epiBrand.includes(searchL) ||
                      caNumber.includes(searchL) ||
                      tracking.includes(searchL);

        if (!match) return false;
      }

      return true;
    });
  }, [assignments, search, selectedSiteId, selectedCategory, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / itemsPerPage));
  const paginatedItems = filteredAssignments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export to Excel
  const handleExportXLSX = () => {
    const rows = filteredAssignments.map(a => {
      const siteName = a.worker?.current_site_id ? (sitesMap.get(a.worker.current_site_id) || 'Não atribuída') : 'Central';
      const statusText = a.returned_at ? 'DEVOLVIDO' : 'EM USO';
      
      return {
        'Colaborador': a.worker?.full_name || 'Desconhecido',
        'CPF': a.worker?.cpf || '-',
        'Cargo / Função': a.worker?.current_role || '-',
        'Setor': a.worker?.department || '-',
        'Obra Atual': siteName,
        'Equipamento (EPI)': a.catalog?.name || 'EPI',
        'Categoria (NR-6)': a.catalog?.category || '-',
        'Marca': a.catalog?.brand || '-',
        'CA': a.catalog?.ca_number || a.ca_number || '-',
        'Quantidade': a.quantity || 1,
        'Data de Entrega': a.assigned_at ? format(parseISO(a.assigned_at), 'dd/MM/yyyy HH:mm') : '-',
        'Previsão de Troca': a.expected_return_date ? format(parseISO(a.expected_return_date), 'dd/MM/yyyy') : '-',
        'Status Atual': statusText,
        'Data de Devolução': a.returned_at ? format(parseISO(a.returned_at), 'dd/MM/yyyy HH:mm') : '-',
        'Condição na Devolução': a.condition_on_return || '-',
        'Valor Unitário (R$)': a.unit_price_at_delivery || a.catalog?.unit_price || 0,
        'Evidência': a.evidence_type || (a.digital_signature_url ? 'ASSINATURA DIGITAL' : 'NENHUMA')
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Rastreamento_EPIs');
    XLSX.writeFile(wb, `engenharq_epis_em_uso_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ type: 'success', title: 'Exportado', message: 'Relatório gerado com sucesso em .xlsx' });
  };

  // Confirm Return handler
  const handleConfirmReturn = async () => {
    if (!returnModalData) return;
    setIsSubmittingReturn(true);
    try {
      // 1. Atualizar epi_assignments
      const { error: updateError } = await supabase
        .from('epi_assignments')
        .update({
          returned_at: new Date().toISOString(),
          condition_on_return: returnCondition
        })
        .eq('id', returnModalData.assignmentId);

      if (updateError) throw updateError;

      // 2. Se for bom estado e restock ativado, somar de volta ao estoque do catálogo
      if (returnRestock && returnCondition === 'GOOD') {
        const { data: currentCat } = await supabase
          .from('epi_catalog')
          .select('current_stock')
          .eq('id', returnModalData.catalogId)
          .single();

        if (currentCat) {
          await supabase
            .from('epi_catalog')
            .update({ current_stock: (currentCat.current_stock || 0) + (returnModalData.quantity || 1) })
            .eq('id', returnModalData.catalogId);
        }

        // Se houver obra vinculada, restocar também no estoque da obra (site_inventory)
        if (returnModalData.siteId) {
          const { data: currentSiteInv } = await supabase
            .from('site_inventory')
            .select('quantity')
            .eq('site_id', returnModalData.siteId)
            .eq('catalog_id', returnModalData.catalogId)
            .maybeSingle();

          const qtyToAdd = returnModalData.quantity || 1;
          await supabase
            .from('site_inventory')
            .upsert({
              site_id: returnModalData.siteId,
              catalog_id: returnModalData.catalogId,
              quantity: (currentSiteInv?.quantity || 0) + qtyToAdd,
              updated_at: new Date().toISOString()
            }, { onConflict: 'site_id,catalog_id' });
        }
      }

      toast({ 
        type: 'success', 
        title: 'Devolução Registrada', 
        message: `Equipamento devolvido por ${returnModalData.workerName} com sucesso.` 
      });
      setReturnModalData(null);
      setReturnNotes('');
      queryClient.invalidateQueries({ queryKey: ['epi-tracking-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['epi-assets'] });
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message || 'Falha ao registrar devolução.' });
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Grid no topo da aba */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-lg text-primary">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted font-medium">EPIs em Uso Ativo</div>
            <div className="text-xl font-bold font-mono text-foreground">{stats.totalInUse} un</div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted font-medium">Colaboradores Equipados</div>
            <div className="text-xl font-bold font-mono text-foreground">{stats.workersEquipped} pessoas</div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <div className={`p-2.5 rounded-lg border ${stats.expiringCount > 0 ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-surface-hover border-border text-muted'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted font-medium">Trocas Vencidas / Próximas</div>
            <div className={`text-xl font-bold font-mono ${stats.expiringCount > 0 ? 'text-amber-500' : 'text-foreground'}`}>
              {stats.expiringCount} itens
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted font-medium">Patrimônio em Campo</div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              R$ {stats.fieldAssetValue.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
          {/* Seletor de Status (Tabs estilo pills) */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-background border border-border rounded-lg">
            <button
              onClick={() => { setStatusFilter('IN_USE'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'IN_USE'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Em Uso (Ativos)
            </button>

            <button
              onClick={() => { setStatusFilter('EXPIRING'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'EXPIRING'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Troca Vencida / Alerta ({stats.expiringCount})
            </button>

            <button
              onClick={() => { setStatusFilter('RETURNED'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'RETURNED'
                  ? 'bg-surface-hover text-foreground font-bold shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Devolvidos
            </button>

            <button
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-surface-hover text-foreground font-bold shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Todos ({assignments.length})
            </button>
          </div>

          {/* Seletor de Obra e Exportação */}
          <div className="flex flex-wrap gap-2 items-center justify-end">
            <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5">
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              <select
                value={selectedSiteId}
                onChange={e => { setSelectedSiteId(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer pr-1"
              >
                <option value="ALL">🏢 Todas as Obras</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>
                    🏗️ {s.name} {s.city ? `(${s.city})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportXLSX}
              className="bg-background border border-border hover:bg-surface-hover text-foreground font-medium py-1.5 px-3 rounded-lg flex items-center gap-2 text-xs transition-colors"
              title="Exportar dados filtrados para planilha Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* Linha de Busca Textual e Categoria */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-border/60">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar por colaborador, CPF, EPI, CA, código de rastreio ou cargo..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedCategory}
              onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              {NR6_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Rastreamento */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/50 text-[11px] uppercase tracking-wider text-muted">
                <th className="p-4 font-semibold">Colaborador / Obra</th>
                <th className="p-4 font-semibold">EPI / Modelo Entregue</th>
                <th className="p-4 font-semibold text-center">Qtd</th>
                <th className="p-4 font-semibold">Data de Entrega</th>
                <th className="p-4 font-semibold">Previsão de Troca / Validade</th>
                <th className="p-4 font-semibold text-center">Comprovante</th>
                <th className="p-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                      <span>Carregando dados de rastreamento...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.map(item => {
                const isReturned = !!item.returned_at;
                const assignedDate = item.assigned_at ? parseISO(item.assigned_at) : null;
                const daysInUse = assignedDate ? differenceInCalendarDays(new Date(), assignedDate) : null;

                // Previsão de Troca
                let expiryBadge = null;
                if (isReturned) {
                  expiryBadge = (
                    <span className="text-xs text-muted flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                      Devolvido ({format(parseISO(item.returned_at), 'dd/MM/yyyy')})
                    </span>
                  );
                } else if (item.expected_return_date) {
                  const expiryDate = parseISO(item.expected_return_date);
                  const daysLeft = differenceInCalendarDays(expiryDate, new Date());
                  
                  if (daysLeft < 0) {
                    expiryBadge = (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-950/40 border border-red-800/60 px-2 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                        Vencido há {Math.abs(daysLeft)}d ({format(expiryDate, 'dd/MM/yy')})
                      </span>
                    );
                  } else if (daysLeft <= 15) {
                    expiryBadge = (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                        Troca em {daysLeft}d ({format(expiryDate, 'dd/MM/yy')})
                      </span>
                    );
                  } else {
                    expiryBadge = (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded font-mono">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        Em dia ({daysLeft}d restantes)
                      </span>
                    );
                  }
                } else {
                  expiryBadge = <span className="text-xs text-muted">-</span>;
                }

                const workerSiteName = item.worker?.current_site_id ? (sitesMap.get(item.worker.current_site_id) || 'Obra') : 'Canteiro Geral';

                return (
                  <tr key={item.id} className="border-b border-border hover:bg-surface-hover/30 transition-colors">
                    {/* Colaborador */}
                    <td className="p-4">
                      {item.worker ? (
                        <div>
                          <Link 
                            to={`/workers/${item.worker.id}`}
                            className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1"
                          >
                            <span>{item.worker.full_name}</span>
                            <ExternalLink className="w-3 h-3 opacity-50" />
                          </Link>
                          <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                            <span>CPF: {item.worker.cpf}</span>
                            {item.worker.current_role && (
                              <span>• {item.worker.current_role}</span>
                            )}
                          </div>
                          <div className="mt-1">
                            <span className="text-[10px] bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded border border-primary/20">
                              📍 {workerSiteName}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted text-xs">Trabalhador não identificado</span>
                      )}
                    </td>

                    {/* EPI / Modelo */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {item.catalog?.image_url ? (
                          <img src={item.catalog.image_url} alt="" className="w-9 h-9 rounded object-cover border border-border shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded bg-surface-hover border border-border flex items-center justify-center shrink-0">
                            <Shield className="w-4 h-4 text-muted" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-foreground text-sm">
                            {item.catalog?.name || 'Equipamento'}
                          </div>
                          <div className="text-xs text-muted">
                            {item.catalog?.brand || ''} {item.catalog?.model ? `• ${item.catalog.model}` : ''}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-[10px] text-muted">
                              CA: {item.catalog?.ca_number || item.ca_number || 'S/N'}
                            </span>
                            {item.catalog?.ca_validity && (
                              <ValidityBadge date={item.catalog.ca_validity} />
                            )}
                            {item.tracking_code && (
                              <span className="text-[10px] font-mono bg-background px-1 rounded border border-border text-foreground">
                                #{item.tracking_code}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Quantidade */}
                    <td className="p-4 text-center">
                      <span className="font-mono font-bold text-foreground bg-background px-2 py-1 rounded border border-border">
                        {item.quantity || 1} un
                      </span>
                    </td>

                    {/* Data de Entrega */}
                    <td className="p-4">
                      <div className="text-foreground font-medium text-xs font-mono">
                        {assignedDate ? format(assignedDate, 'dd/MM/yyyy') : '-'}
                      </div>
                      {daysInUse !== null && (
                        <div className="text-[11px] text-muted mt-0.5">
                          Há {daysInUse} dia{daysInUse !== 1 ? 's' : ''}
                        </div>
                      )}
                    </td>

                    {/* Previsão de Troca */}
                    <td className="p-4">
                      {expiryBadge}
                    </td>

                    {/* Comprovante / Evidência */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {item.digital_signature_url && (
                          <button
                            onClick={() => setEvidenceModalData({
                              signatureUrl: item.digital_signature_url,
                              selfieUrl: item.audit_selfie_url,
                              workerName: item.worker?.full_name || 'Colaborador',
                              epiName: item.catalog?.name || 'EPI',
                              assignedAt: item.assigned_at
                            })}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded border border-primary/20 transition-colors"
                            title="Ver Assinatura Digital Coletada"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}

                        {item.generated_pdf_url && (
                          <a
                            href={item.generated_pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded border border-emerald-500/20 transition-colors"
                            title="Abrir Ficha de EPI em PDF"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        {!item.digital_signature_url && !item.generated_pdf_url && (
                          <span className="text-[11px] text-muted font-mono">-</span>
                        )}
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isReturned && (
                          <button
                            onClick={() => setReturnModalData({
                              assignmentId: item.id,
                              catalogId: item.catalog_id,
                              workerName: item.worker?.full_name || 'Colaborador',
                              epiName: item.catalog?.name || 'EPI',
                              quantity: item.quantity || 1,
                              siteId: item.worker?.current_site_id || null
                            })}
                            className="bg-surface hover:bg-surface-hover border border-border text-foreground hover:text-primary font-medium text-xs px-2.5 py-1.5 rounded flex items-center gap-1 transition-colors"
                            title="Registrar devolução deste EPI"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Devolver</span>
                          </button>
                        )}

                        {item.worker?.id && (
                          <Link
                            to={`/workers/${item.worker.id}`}
                            className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded transition-colors"
                            title="Ver histórico e ficha do colaborador"
                          >
                            <User className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!isLoading && paginatedItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Shield className="w-10 h-10 text-muted opacity-30" />
                      <p className="font-semibold text-foreground">Nenhuma entrega de EPI encontrada.</p>
                      <p className="text-xs text-muted max-w-md">
                        {statusFilter === 'IN_USE' 
                          ? 'Não há EPIs registrados como atualmente em posse dos colaboradores com os filtros selecionados.' 
                          : 'Nenhum registro corresponde aos filtros de busca aplicados.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border p-4 bg-surface">
            <span className="text-xs text-muted">
              Página {currentPage} de {totalPages} ({filteredAssignments.length} entregas encontradas)
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 bg-background border border-border text-xs rounded-md disabled:opacity-50 hover:bg-surface-hover"
              >
                Anterior
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-background border border-border text-xs rounded-md disabled:opacity-50 hover:bg-surface-hover"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Devolução Rápida de EPI */}
      {returnModalData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-primary font-bold">
                <RotateCcw className="w-5 h-5" />
                <h3 className="text-lg text-foreground">Registrar Devolução de EPI</h3>
              </div>
              <button onClick={() => setReturnModalData(null)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1 bg-background p-3 rounded-lg border border-border">
              <div>Colaborador: <strong className="text-foreground">{returnModalData.workerName}</strong></div>
              <div>Equipamento: <strong className="text-foreground">{returnModalData.epiName}</strong></div>
              <div>Quantidade: <strong className="font-mono text-foreground">{returnModalData.quantity} un</strong></div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Condição do EPI na Devolução *</label>
                <select
                  value={returnCondition}
                  onChange={e => setReturnCondition(e.target.value as any)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground text-sm"
                >
                  <option value="GOOD">🟢 Bom Estado (Reutilizável)</option>
                  <option value="DAMAGED">🟡 Danificado / Avariado</option>
                  <option value="DISCARDED">🔴 Descarte (Fim de Vida Útil)</option>
                </select>
              </div>

              {returnCondition === 'GOOD' && (
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none bg-background p-2.5 rounded-lg border border-border">
                  <input
                    type="checkbox"
                    checked={returnRestock}
                    onChange={e => setReturnRestock(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Retornar {returnModalData.quantity} un ao saldo de estoque disponível</span>
                </label>
              )}

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Observações (Opcional)</label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={e => setReturnNotes(e.target.value)}
                  placeholder="Motivo da devolução ou detalhes do estado do equipamento..."
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setReturnModalData(null)}
                className="px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                disabled={isSubmittingReturn}
                className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md text-sm disabled:opacity-50 transition-colors"
              >
                {isSubmittingReturn ? 'Salvando...' : 'Confirmar Devolução'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Visualizar Evidência / Assinatura Digital */}
      {evidenceModalData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Comprovante de Entrega & Assinatura</h3>
                <p className="text-xs text-muted">Auditoria de conformidade com a NR-6.</p>
              </div>
              <button onClick={() => setEvidenceModalData(null)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1 bg-background p-3 rounded-lg border border-border">
              <div>Colaborador: <strong className="text-foreground">{evidenceModalData.workerName}</strong></div>
              <div>Equipamento: <strong className="text-foreground">{evidenceModalData.epiName}</strong></div>
              <div>Data da Coleta: <strong className="font-mono text-foreground">
                {evidenceModalData.assignedAt ? format(parseISO(evidenceModalData.assignedAt), "dd/MM/yyyy 'às' HH:mm") : '-'}
              </strong></div>
            </div>

            {evidenceModalData.signatureUrl && (
              <div>
                <div className="text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Assinatura Digital Coletada:</div>
                <div className="bg-white rounded-lg p-4 border border-border flex items-center justify-center">
                  <img src={evidenceModalData.signatureUrl} alt="Assinatura Digital" className="max-h-36 object-contain" />
                </div>
              </div>
            )}

            {evidenceModalData.selfieUrl && (
              <div>
                <div className="text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Selfie / Biometria Facial de Auditoria:</div>
                <div className="bg-background rounded-lg p-2 border border-border flex items-center justify-center">
                  <img src={evidenceModalData.selfieUrl} alt="Selfie de Auditoria" className="max-h-48 rounded object-cover" />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEvidenceModalData(null)}
                className="px-4 py-2 bg-surface hover:bg-surface-hover border border-border text-foreground rounded-md text-sm font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
