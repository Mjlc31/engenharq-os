import React, { useState, useMemo } from 'react';
import { AlmoxarifadoOrder, ConstructionSite } from '../../../types';
import { 
  Search, Filter, Download, Calendar, Clock, CheckCircle2, 
  XCircle, User, HardHat, FileCheck, Printer, RefreshCw, Eye,
  Building2, ArrowUpDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlmoxarifadoReceiptModal } from './AlmoxarifadoReceiptModal';
import { cn } from '../../../lib/utils';

interface AlmoxarifadoHistoryTabProps {
  orders: AlmoxarifadoOrder[];
  sites: ConstructionSite[];
  selectedSiteId: string;
  onSelectSiteId: (siteId: string) => void;
  loading: boolean;
  onRefresh: () => void;
}

export function AlmoxarifadoHistoryTab({
  orders,
  sites,
  selectedSiteId,
  onSelectSiteId,
  loading,
  onRefresh
}: AlmoxarifadoHistoryTabProps) {
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DELIVERED' | 'PREPARING' | 'CANCELLED'>('ALL');
  const [periodFilter, setPeriodFilter] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS'>('ALL');
  
  // Modals
  const [receiptOrder, setReceiptOrder] = useState<AlmoxarifadoOrder | null>(null);
  const [previewSignatureUrl, setPreviewSignatureUrl] = useState<string | null>(null);
  
  // Sort
  const [sortAsc, setSortAsc] = useState(false);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Site Filter
      if (selectedSiteId !== 'ALL' && order.site_id !== selectedSiteId) {
        return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false;
      }

      // 3. Period Filter
      if (periodFilter !== 'ALL') {
        const orderDate = new Date(order.requested_at);
        const now = new Date();
        if (periodFilter === 'TODAY') {
          if (orderDate.toDateString() !== now.toDateString()) return false;
        } else if (periodFilter === '7DAYS') {
          const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        } else if (periodFilter === '30DAYS') {
          const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30) return false;
        }
      }

      // 4. Search Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesWorker = order.worker?.full_name.toLowerCase().includes(term);
        const matchesReg = order.worker?.registration_number?.toLowerCase().includes(term);
        const matchesOrderNum = String(order.order_number).includes(term);
        const matchesItem = (order.items || []).some(it => 
          it.name.toLowerCase().includes(term) || (it.ca_number && it.ca_number.includes(term))
        );
        const matchesSite = order.site?.name.toLowerCase().includes(term);
        if (!matchesWorker && !matchesReg && !matchesOrderNum && !matchesItem && !matchesSite) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.requested_at).getTime();
      const timeB = new Date(b.requested_at).getTime();
      return sortAsc ? timeA - timeB : timeB - timeA;
    });
  }, [orders, selectedSiteId, statusFilter, periodFilter, searchTerm, sortAsc]);

  // Statistics from filtered list
  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const deliveredOrders = filteredOrders.filter(o => o.status === 'DELIVERED');
    const preparingOrders = filteredOrders.filter(o => o.status === 'PREPARING' || o.status === 'READY');
    const cancelledOrders = filteredOrders.filter(o => o.status === 'CANCELLED');

    const totalPieces = deliveredOrders.reduce((acc, o) => {
      return acc + (o.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);
    }, 0);

    // Calculate Average SLA for delivered orders
    let totalSlaSeconds = 0;
    let deliveredWithSlaCount = 0;

    deliveredOrders.forEach(o => {
      if (o.requested_at && o.delivered_at) {
        const sec = Math.max(0, Math.floor((new Date(o.delivered_at).getTime() - new Date(o.requested_at).getTime()) / 1000));
        totalSlaSeconds += sec;
        deliveredWithSlaCount++;
      }
    });

    const avgSlaSeconds = deliveredWithSlaCount > 0 ? Math.round(totalSlaSeconds / deliveredWithSlaCount) : 0;
    const avgSlaMins = Math.floor(avgSlaSeconds / 60);
    const avgSlaRemainderSecs = avgSlaSeconds % 60;
    const avgSlaFormatted = deliveredWithSlaCount > 0 ? `${avgSlaMins}m ${avgSlaRemainderSecs}s` : '--';

    return {
      totalOrders,
      deliveredCount: deliveredOrders.length,
      preparingCount: preparingOrders.length,
      cancelledCount: cancelledOrders.length,
      totalPieces,
      avgSlaFormatted
    };
  }, [filteredOrders]);

  // Helper for SLA per row
  const getRowSla = (requestedAt: string, deliveredAt?: string | null) => {
    if (!deliveredAt) return { text: 'Em atendimento', isCompleted: false, colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/25' };
    const diffSec = Math.max(0, Math.floor((new Date(deliveredAt).getTime() - new Date(requestedAt).getTime()) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    
    let colorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
    if (diffSec > 300) {
      colorClass = 'text-rose-400 bg-rose-500/10 border-rose-500/25';
    } else if (diffSec > 180) {
      colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/25';
    }

    return {
      text: `${mins}m ${secs}s`,
      isCompleted: true,
      colorClass
    };
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredOrders.length === 0) return;

    const exportData = filteredOrders.map(o => {
      const sla = getRowSla(o.requested_at, o.delivered_at);
      const itemsListText = (o.items || [])
        .map(it => `${it.quantity}x ${it.name}${it.size ? ` (${it.size})` : ''}${it.ca_number ? ` [CA ${it.ca_number}]` : ''}`)
        .join('; ');

      const totalItemsQty = (o.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);

      return {
        'Nº Comanda': `#${o.order_number}`,
        'Data Solicitação': o.requested_at ? format(new Date(o.requested_at), 'dd/MM/yyyy', { locale: ptBR }) : '',
        'Hora Solicitação': o.requested_at ? format(new Date(o.requested_at), 'HH:mm:ss', { locale: ptBR }) : '',
        'Data Entrega': o.delivered_at ? format(new Date(o.delivered_at), 'dd/MM/yyyy', { locale: ptBR }) : 'Pendente',
        'Hora Entrega': o.delivered_at ? format(new Date(o.delivered_at), 'HH:mm:ss', { locale: ptBR }) : 'Pendente',
        'Tempo de Atendimento (SLA)': sla.text,
        'Obra / Canteiro': o.site?.name || 'Canteiro Central (Geral)',
        'Colaborador': o.worker?.full_name || 'Não identificado',
        'Matrícula': o.worker?.registration_number || 'S/N',
        'Cargo / Função': o.worker?.current_role || 'Não informada',
        'Itens Solicitados / Entregues': itemsListText,
        'Qtd Total de Peças': totalItemsQty,
        'Status do Pedido': o.status === 'DELIVERED' ? 'ENTREGUE' : o.status === 'CANCELLED' ? 'CANCELADO' : 'EM SEPARAÇÃO',
        'Atendido por (Almoxarife)': o.delivered_by || 'Operador Balcão',
        'Assinatura Digital Coletada': o.signature_url ? 'SIM' : 'NÃO'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historico_Almoxarifado');
    
    // Auto column width
    const maxWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length + 3, 14)
    }));
    worksheet['!cols'] = maxWidths;

    const fileName = `historico_almoxarifado_engenharq_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">Total de Solicitações</p>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{metrics.totalOrders}</p>
            <p className="text-[11px] text-muted">No filtro selecionado</p>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 text-primary border border-primary/20">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">Entregas Concluídas</p>
            <p className="text-2xl font-bold font-mono tracking-tight text-emerald-400">{metrics.deliveredCount}</p>
            <p className="text-[11px] text-muted">{metrics.totalPieces} itens expedidos</p>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">Tempo Médio de Espera</p>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{metrics.avgSlaFormatted}</p>
            <p className="text-[11px] text-muted">SLA da solicitação à entrega</p>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">Em Fila / Pendentes</p>
            <p className="text-2xl font-bold font-mono tracking-tight text-amber-400">{metrics.preparingCount}</p>
            <p className="text-[11px] text-muted">Aguardando no balcão</p>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <HardHat className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-surface border border-border rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
            <input
              type="text"
              placeholder="Buscar colaborador, matrícula, EPI ou #comanda..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Obra Filter */}
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl px-2.5 py-1.5">
            <Building2 className="w-3.5 h-3.5 text-muted shrink-0" />
            <select
              value={selectedSiteId}
              onChange={e => onSelectSiteId(e.target.value)}
              className="bg-transparent text-xs text-foreground font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-surface text-foreground">Todas as Obras</option>
              {sites.map(s => (
                <option key={s.id} value={s.id} className="bg-surface text-foreground">{s.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-muted shrink-0" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-xs text-foreground font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-surface text-foreground">Todos os Status</option>
              <option value="DELIVERED" className="bg-surface text-foreground">Entregues</option>
              <option value="PREPARING" className="bg-surface text-foreground">Em Separação</option>
              <option value="CANCELLED" className="bg-surface text-foreground">Cancelados</option>
            </select>
          </div>

          {/* Period Filter */}
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted shrink-0" />
            <select
              value={periodFilter}
              onChange={e => setPeriodFilter(e.target.value as any)}
              className="bg-transparent text-xs text-foreground font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-surface text-foreground">Todo o Período</option>
              <option value="TODAY" className="bg-surface text-foreground">Apenas Hoje</option>
              <option value="7DAYS" className="bg-surface text-foreground">Últimos 7 dias</option>
              <option value="30DAYS" className="bg-surface text-foreground">Últimos 30 dias</option>
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Toggle Sort Date */}
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="p-2 rounded-xl bg-background border border-border text-muted hover:text-foreground text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title={sortAsc ? "Ordenando do mais antigo ao mais recente" : "Ordenando do mais recente ao mais antigo"}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{sortAsc ? 'Antigos 1º' : 'Recentes 1º'}</span>
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-background border border-border text-muted hover:text-foreground transition-colors cursor-pointer"
            title="Atualizar Tabela"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            disabled={filteredOrders.length === 0}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs shadow-emerald-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Main History Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-background/50 text-muted uppercase font-semibold text-[11px] tracking-wider">
                <th className="py-3 px-4">Comanda</th>
                <th className="py-3 px-4">Data/Hora Solicitação</th>
                <th className="py-3 px-4">Data/Hora Entrega</th>
                <th className="py-3 px-4">Tempo (SLA)</th>
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-4">Obra</th>
                <th className="py-3 px-4">Itens Entregues</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Almoxarife</th>
                <th className="py-3 px-4 text-right">Comprovante / Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-foreground">Nenhum registro encontrado</p>
                    <p className="text-xs text-muted mt-0.5">Tente ajustar os filtros ou selecionar outra obra.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const sla = getRowSla(order.requested_at, order.delivered_at);
                  const requestedFormatted = order.requested_at
                    ? format(new Date(order.requested_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
                    : '--';
                  const deliveredFormatted = order.delivered_at
                    ? format(new Date(order.delivered_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
                    : '--';

                  return (
                    <tr key={order.id} className="hover:bg-surface-hover/50 transition-colors">
                      {/* Comanda */}
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        <span className="px-2 py-0.5 rounded bg-surface border border-border">
                          #{order.order_number}
                        </span>
                      </td>

                      {/* Data e Hora Solicitação */}
                      <td className="py-3 px-4 font-mono text-muted whitespace-nowrap">
                        <span className="text-foreground">{requestedFormatted.split(' ')[0]}</span>
                        <span className="text-muted ml-1 text-[11px]">{requestedFormatted.split(' ')[1]}</span>
                      </td>

                      {/* Data e Hora Entrega */}
                      <td className="py-3 px-4 font-mono text-muted whitespace-nowrap">
                        {order.delivered_at ? (
                          <>
                            <span className="text-emerald-400 font-medium">{deliveredFormatted.split(' ')[0]}</span>
                            <span className="text-muted ml-1 text-[11px]">{deliveredFormatted.split(' ')[1]}</span>
                          </>
                        ) : (
                          <span className="text-amber-400 font-sans text-[11px] italic">Em separação</span>
                        )}
                      </td>

                      {/* SLA */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border", sla.colorClass)}>
                          {sla.text}
                        </span>
                      </td>

                      {/* Colaborador */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 min-w-[180px]">
                          <div className="w-8 h-8 rounded-full bg-surface-hover border border-border flex items-center justify-center shrink-0 overflow-hidden text-xs font-bold text-primary">
                            {order.worker?.reference_photo_url ? (
                              <img src={order.worker.reference_photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              order.worker?.full_name?.[0] || <User className="w-4 h-4 text-muted" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate">{order.worker?.full_name || 'Desconhecido'}</p>
                            <p className="text-[10px] text-muted truncate">
                              Mat: <span className="font-mono text-foreground">{order.worker?.registration_number || 'S/N'}</span> • {order.worker?.current_role || 'Função'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Obra */}
                      <td className="py-3 px-4 text-muted truncate max-w-[140px]">
                        {order.site?.name || 'Geral'}
                      </td>

                      {/* Itens */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[260px]">
                          {(order.items || []).map((it, idx) => (
                            <span 
                              key={idx} 
                              className="inline-flex items-center gap-1 bg-background border border-border px-1.5 py-0.5 rounded text-[10px] text-foreground font-sans"
                            >
                              <strong className="text-primary font-mono">{it.quantity}x</strong>
                              <span className="truncate max-w-[110px]">{it.name}</span>
                              {it.size && <span className="text-muted font-mono">({it.size})</span>}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {order.status === 'DELIVERED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                            <CheckCircle2 className="w-3 h-3" />
                            ENTREGUE
                          </span>
                        ) : order.status === 'CANCELLED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/10 text-muted border border-zinc-500/25">
                            <XCircle className="w-3 h-3" />
                            CANCELADO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                            <Clock className="w-3 h-3 animate-pulse" />
                            EM FILA
                          </span>
                        )}
                      </td>

                      {/* Almoxarife */}
                      <td className="py-3 px-4 text-muted text-[11px] truncate max-w-[120px]">
                        {order.delivered_by || '--'}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {order.signature_url ? (
                            <button
                              onClick={() => setPreviewSignatureUrl(order.signature_url!)}
                              className="p-1.5 rounded-lg bg-surface-hover hover:bg-border text-emerald-400 border border-border transition-colors cursor-pointer"
                              title="Visualizar Assinatura Digital do Recebedor"
                            >
                              <FileCheck className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="w-7 inline-block text-center text-muted font-mono text-[10px]">--</span>
                          )}

                          <button
                            onClick={() => setReceiptOrder(order)}
                            className="p-1.5 rounded-lg bg-surface-hover hover:bg-border text-primary border border-border transition-colors cursor-pointer"
                            title="Imprimir Cupom / Termo de Recebimento"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Preview de Assinatura */}
      {previewSignatureUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-center text-foreground">
            <h3 className="text-base font-bold text-foreground mb-1">Assinatura Digital Coletada</h3>
            <p className="text-xs text-muted mb-4">Comprovante de conferência e posse do EPI no balcão.</p>
            <div className="bg-white rounded-xl p-4 border border-border mb-4 inline-block max-w-full shadow-inner">
              <img src={previewSignatureUrl} alt="Assinatura" className="max-h-48 mx-auto" />
            </div>
            <div>
              <button
                onClick={() => setPreviewSignatureUrl(null)}
                className="px-6 py-2 rounded-xl bg-surface-hover hover:bg-border text-foreground font-semibold text-xs transition-colors border border-border cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Impressão de Cupom / Termo */}
      {receiptOrder && (
        <AlmoxarifadoReceiptModal
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
}
