import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { ConstructionSite } from '../../../types';
import { 
  Search, Filter, Download, ArrowUpRight, ArrowDownLeft, 
  RotateCcw, SlidersHorizontal, RefreshCw, Calendar, PackageCheck,
  Building2, HardHat
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../../lib/utils';

interface KardexTransaction {
  id: string;
  transaction_type: string;
  catalog_id: string;
  site_id?: string | null;
  worker_id?: string | null;
  quantity_change: number;
  notes?: string | null;
  created_at: string;
  catalog?: { name: string; ca_number?: string | null; category?: string };
  site?: { name: string };
  worker?: { full_name: string; registration_number?: string };
}

interface AlmoxarifadoKardexTabProps {
  sites: ConstructionSite[];
  selectedSiteId: string;
  onSelectSiteId: (siteId: string) => void;
}

export function AlmoxarifadoKardexTab({
  sites,
  selectedSiteId,
  onSelectSiteId
}: AlmoxarifadoKardexTabProps) {
  const [transactions, setTransactions] = useState<KardexTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Load Transactions
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('inventory_transactions')
        .select('*, catalog:epi_catalog(name, ca_number, category), site:construction_sites(name), worker:workers(full_name, registration_number)')
        .order('created_at', { ascending: false });

      if (selectedSiteId !== 'ALL') {
        query = query.eq('site_id', selectedSiteId);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      setTransactions((data || []) as KardexTransaction[]);
    } catch (err: any) {
      console.error('Erro ao carregar Kardex:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSiteId]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Realtime subscription for inventory_transactions
  useEffect(() => {
    const channel = supabase
      .channel('kardex-transactions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_transactions' },
        () => {
          loadTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTransactions]);

  // Filtered Transactions
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      // Type Filter
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'OUT' && !(t.transaction_type.includes('OUT') || t.transaction_type.includes('SAIDA'))) return false;
        if (typeFilter === 'IN' && !(t.transaction_type.includes('IN') || t.transaction_type.includes('ENTRADA'))) return false;
        if (typeFilter === 'ADJUST' && !t.transaction_type.includes('AJUSTE')) return false;
      }

      // Search Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesEpi = t.catalog?.name.toLowerCase().includes(term);
        const matchesCa = t.catalog?.ca_number?.toLowerCase().includes(term);
        const matchesWorker = t.worker?.full_name.toLowerCase().includes(term);
        const matchesNotes = t.notes?.toLowerCase().includes(term);
        const matchesSite = t.site?.name.toLowerCase().includes(term);
        if (!matchesEpi && !matchesCa && !matchesWorker && !matchesNotes && !matchesSite) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, typeFilter, searchTerm]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;

    filtered.forEach(t => {
      const qty = t.quantity_change || 0;
      if (qty > 0) {
        totalIn += qty;
      } else {
        totalOut += Math.abs(qty);
      }
    });

    return {
      totalCount: filtered.length,
      totalIn,
      totalOut,
      netBalance: totalIn - totalOut
    };
  }, [filtered]);

  // Export to Excel
  const handleExportExcel = () => {
    if (filtered.length === 0) return;

    const exportData = filtered.map(t => {
      const isPositive = (t.quantity_change || 0) > 0;
      return {
        'Data / Hora': t.created_at ? format(new Date(t.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }) : '',
        'Tipo de Movimento': t.transaction_type,
        'EPI / Material': t.catalog?.name || 'N/A',
        'CA': t.catalog?.ca_number || 'S/N',
        'Categoria': t.catalog?.category || 'Geral',
        'Obra / Canteiro': t.site?.name || 'Canteiro Central (Geral)',
        'Quantidade': t.quantity_change,
        'Direção': isPositive ? 'ENTRADA' : 'SAÍDA',
        'Colaborador / Envolvido': t.worker?.full_name || '--',
        'Matrícula': t.worker?.registration_number || '--',
        'Observações / Documento': t.notes || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kardex_Estoque');
    const fileName = `extrato_kardex_estoque_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">Total de Registros</p>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{metrics.totalCount}</p>
            <p className="text-[11px] text-muted">Movimentações auditadas</p>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 text-primary border border-primary/20">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">Total Entradas (+)</p>
            <p className="text-2xl font-bold font-mono tracking-tight text-emerald-400">+{metrics.totalIn}</p>
            <p className="text-[11px] text-muted">Peças adicionadas</p>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">Total Saídas (-)</p>
            <p className="text-2xl font-bold font-mono tracking-tight text-rose-400">-{metrics.totalOut}</p>
            <p className="text-[11px] text-muted">Peças entregues / baixadas</p>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">Fluxo Líquido</p>
            <p className={cn(
              "text-2xl font-bold font-mono tracking-tight",
              metrics.netBalance >= 0 ? "text-emerald-400" : "text-amber-400"
            )}>
              {metrics.netBalance > 0 ? `+${metrics.netBalance}` : metrics.netBalance}
            </p>
            <p className="text-[11px] text-muted">Variação do período</p>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <PackageCheck className="w-4 h-4" />
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
              placeholder="Buscar por EPI, CA, colaborador ou documento..."
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

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-muted shrink-0" />
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-transparent text-xs text-foreground font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-surface text-foreground">Todas as Movimentações</option>
              <option value="OUT" className="bg-surface text-foreground">Apenas Saídas (Entregas)</option>
              <option value="IN" className="bg-surface text-foreground">Apenas Entradas (Compras/Devoluções)</option>
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadTransactions}
            className="p-2 rounded-xl bg-background border border-border text-muted hover:text-foreground transition-colors cursor-pointer"
            title="Atualizar Kardex"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>

          <button
            onClick={handleExportExcel}
            disabled={filtered.length === 0}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs shadow-emerald-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Extrato</span>
          </button>
        </div>
      </div>

      {/* Main Kardex Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-background/50 text-muted uppercase font-semibold text-[11px] tracking-wider">
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">EPI (Modelo / CA)</th>
                <th className="py-3 px-4">Obra</th>
                <th className="py-3 px-4 text-center">Variação</th>
                <th className="py-3 px-4">Colaborador / Envolvido</th>
                <th className="py-3 px-4">Observações / Documento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted">
                    <SlidersHorizontal className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-foreground">Nenhuma movimentação de estoque encontrada</p>
                    <p className="text-xs text-muted mt-0.5">As saídas e entradas registradas no sistema aparecerão aqui em tempo real.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(t => {
                  const isPositive = (t.quantity_change || 0) > 0;
                  const dateFormatted = t.created_at
                    ? format(new Date(t.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
                    : '--';

                  return (
                    <tr key={t.id} className="hover:bg-surface-hover/50 transition-colors">
                      {/* Data / Hora */}
                      <td className="py-3 px-4 font-mono text-muted whitespace-nowrap">
                        <span className="text-foreground">{dateFormatted.split(' ')[0]}</span>
                        <span className="text-muted ml-1 text-[11px]">{dateFormatted.split(' ')[1]}</span>
                      </td>

                      {/* Tipo */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isPositive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                            <ArrowDownLeft className="w-3 h-3" />
                            {t.transaction_type}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25">
                            <ArrowUpRight className="w-3 h-3" />
                            {t.transaction_type}
                          </span>
                        )}
                      </td>

                      {/* EPI */}
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-bold text-foreground truncate max-w-[220px]">
                            {t.catalog?.name || 'Equipamento'}
                          </p>
                          <p className="text-[10px] text-muted font-mono">
                            {t.catalog?.ca_number ? `CA: ${t.catalog.ca_number}` : 'S/ CA'} • {t.catalog?.category || 'EPI'}
                          </p>
                        </div>
                      </td>

                      {/* Obra */}
                      <td className="py-3 px-4 text-muted truncate max-w-[140px]">
                        {t.site?.name || 'Canteiro Central'}
                      </td>

                      {/* Quantidade */}
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded text-xs inline-block",
                          isPositive 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        )}>
                          {isPositive ? `+${t.quantity_change}` : t.quantity_change} un
                        </span>
                      </td>

                      {/* Colaborador */}
                      <td className="py-3 px-4 text-muted">
                        {t.worker?.full_name ? (
                          <div>
                            <span className="font-semibold text-foreground block truncate max-w-[180px]">
                              {t.worker.full_name}
                            </span>
                            <span className="text-[10px] text-muted font-mono">
                              Mat: {t.worker.registration_number || 'S/N'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted text-[11px]">Almoxarifado / NF</span>
                        )}
                      </td>

                      {/* Observações */}
                      <td className="py-3 px-4 text-muted text-[11px] max-w-[240px] truncate">
                        {t.notes || '--'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
