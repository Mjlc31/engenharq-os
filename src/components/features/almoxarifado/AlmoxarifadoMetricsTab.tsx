import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { AlmoxarifadoOrder, ConstructionSite } from '../../../types';
import { 
  BarChart3, Clock, CheckCircle2, TrendingUp, Building2, 
  Package, User, ShieldCheck, Flame, AlertCircle, ArrowUpRight
} from 'lucide-react';

interface AlmoxarifadoMetricsTabProps {
  orders: AlmoxarifadoOrder[];
  sites: ConstructionSite[];
  selectedSiteId: string;
  onSelectSiteId: (siteId: string) => void;
}

export function AlmoxarifadoMetricsTab({
  orders,
  sites,
  selectedSiteId,
  onSelectSiteId
}: AlmoxarifadoMetricsTabProps) {

  // Filtra ordens válidas pela obra selecionada (excluindo estornadas/deletadas)
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.deleted_at || o.status === 'CANCELLED') return false;
      if (selectedSiteId !== 'ALL' && o.site_id !== selectedSiteId) return false;
      return true;
    });
  }, [orders, selectedSiteId]);

  const deliveredOrders = useMemo(() => {
    return filteredOrders.filter(o => o.status === 'DELIVERED' && o.delivered_at);
  }, [filteredOrders]);

  // KPIs
  const totalDelivered = deliveredOrders.length;

  const totalItemsCount = useMemo(() => {
    return deliveredOrders.reduce((sum, o) => {
      const itList = Array.isArray(o.items) ? o.items : [];
      return sum + itList.reduce((s: number, it: any) => s + (Number(it.quantity) || 1), 0);
    }, 0);
  }, [deliveredOrders]);

  const { avgSlaFormatted, slaBreakdown, avgSlaSeconds } = useMemo(() => {
    if (deliveredOrders.length === 0) {
      return {
        avgSlaFormatted: '0m 00s',
        avgSlaSeconds: 0,
        slaBreakdown: { fast: 0, moderate: 0, slow: 0 }
      };
    }

    let totalSec = 0;
    const breakdown = { fast: 0, moderate: 0, slow: 0 };

    deliveredOrders.forEach(o => {
      const req = new Date(o.requested_at).getTime();
      const del = new Date(o.delivered_at!).getTime();
      const sec = Math.max(0, Math.round((del - req) / 1000));
      totalSec += sec;

      if (sec < 180) breakdown.fast += 1;
      else if (sec <= 300) breakdown.moderate += 1;
      else breakdown.slow += 1;
    });

    const avg = Math.round(totalSec / deliveredOrders.length);
    const m = Math.floor(avg / 60);
    const s = avg % 60;

    return {
      avgSlaFormatted: `${m}m ${String(s).padStart(2, '0')}s`,
      avgSlaSeconds: avg,
      slaBreakdown: breakdown
    };
  }, [deliveredOrders]);

  // Taxa de Assinatura Digital
  const signatureRate = useMemo(() => {
    if (deliveredOrders.length === 0) return 100;
    const signed = deliveredOrders.filter(o => !!o.signature_url).length;
    return Math.round((signed / deliveredOrders.length) * 100);
  }, [deliveredOrders]);

  // Distribuição por Faixa de Horário
  const timeSlotData = useMemo(() => {
    const slots = [
      { label: '06h - 08h', name: 'Entrada Turno', count: 0 },
      { label: '08h - 10h', name: 'Manhã', count: 0 },
      { label: '10h - 12h', name: 'Fim Manhã', count: 0 },
      { label: '12h - 14h', name: 'Retorno Almoço', count: 0 },
      { label: '14h - 16h', name: 'Meio Tarde', count: 0 },
      { label: '16h - 18h', name: 'Fim de Turno', count: 0 },
      { label: 'Outros', name: 'Extra', count: 0 }
    ];

    deliveredOrders.forEach(o => {
      const d = new Date(o.requested_at);
      const hour = d.getHours();

      if (hour >= 6 && hour < 8) slots[0].count += 1;
      else if (hour >= 8 && hour < 10) slots[1].count += 1;
      else if (hour >= 10 && hour < 12) slots[2].count += 1;
      else if (hour >= 12 && hour < 14) slots[3].count += 1;
      else if (hour >= 14 && hour < 16) slots[4].count += 1;
      else if (hour >= 16 && hour < 18) slots[5].count += 1;
      else slots[6].count += 1;
    });

    const max = Math.max(...slots.map(s => s.count), 0);
    return { slots, max };
  }, [deliveredOrders]);

  // Top 10 EPIs mais expedidos
  const topEpis = useMemo(() => {
    const map = new Map<string, { name: string; count: number; ca?: string | null }>();

    deliveredOrders.forEach(o => {
      const itList = Array.isArray(o.items) ? o.items : [];
      itList.forEach((it: any) => {
        const name = it.name || 'EPI';
        const qty = Number(it.quantity) || 1;
        const existing = map.get(name);
        if (existing) {
          existing.count += qty;
        } else {
          map.set(name, { name, count: qty, ca: it.ca_number });
        }
      });
    });

    const sorted = Array.from(map.values()).sort((a, b) => b.count - a.count);
    const total = sorted.reduce((sum, item) => sum + item.count, 0);

    return sorted.slice(0, 10).map(item => ({
      ...item,
      percentage: total > 0 ? Math.round((item.count / total) * 100) : 0
    }));
  }, [deliveredOrders]);

  // Operadores / Almoxarifes
  const operators = useMemo(() => {
    const map = new Map<string, { name: string; count: number; totalSec: number }>();

    deliveredOrders.forEach(o => {
      const name = o.delivered_by || 'Almoxarife Padrão';
      const req = new Date(o.requested_at).getTime();
      const del = new Date(o.delivered_at!).getTime();
      const sec = Math.max(0, Math.round((del - req) / 1000));

      const existing = map.get(name);
      if (existing) {
        existing.count += 1;
        existing.totalSec += sec;
      } else {
        map.set(name, { name, count: 1, totalSec: sec });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [deliveredOrders]);

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4">
      {/* Barra de Filtro de Obra */}
      <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Indicadores de Desempenho do Balcão</h2>
            <p className="text-xs text-muted">Métricas de velocidade de atendimento, picos de fila e giro de EPIs</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted shrink-0" />
          <select
            value={selectedSiteId}
            onChange={e => onSelectSiteId(e.target.value)}
            className="bg-background border border-border text-foreground text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="ALL">Todas as Obras (Geral)</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de 4 KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Atendimentos */}
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Comandas Atendidas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{totalDelivered}</p>
          <p className="text-[11px] text-muted">{totalItemsCount} peças entregues</p>
        </div>

        {/* SLA Médio */}
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Tempo Médio (SLA)</span>
            <Clock className={avgSlaSeconds <= 180 ? "text-emerald-400 w-4 h-4" : avgSlaSeconds <= 300 ? "text-amber-400 w-4 h-4" : "text-red-400 w-4 h-4"} />
          </div>
          <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{avgSlaFormatted}</p>
          <p className="text-[11px] text-muted">
            {avgSlaSeconds <= 180 ? '🟢 Ótimo (< 3m)' : avgSlaSeconds <= 300 ? '🟡 Regular (3-5m)' : '🔴 Crítico (> 5m)'}
          </p>
        </div>

        {/* Taxa de Assinatura */}
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Comprovação NR-6</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono tracking-tight text-emerald-400">{signatureRate}%</p>
          <p className="text-[11px] text-muted">com assinatura digital</p>
        </div>

        {/* Pico do Turno */}
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Horário de Pico</span>
            <Flame className="w-4 h-4 text-primary" />
          </div>
          <p className="text-lg font-bold font-mono tracking-tight text-primary truncate">
            {timeSlotData.slots.reduce((prev, curr) => (curr.count > prev.count ? curr : prev)).label}
          </p>
          <p className="text-[11px] text-muted">maior volume de fila</p>
        </div>
      </div>

      {/* Seção Gráfica: Picos de Horário & SLA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico de Horários de Pico */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Distribuição por Horário do Turno</h3>
              <p className="text-xs text-muted">Identificação dos horários em que a fila se concentra no canteiro</p>
            </div>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>

          <div className="flex items-end justify-between gap-2.5 h-48 pt-6 pb-2 px-1">
            {timeSlotData.slots.map((item, idx) => {
              const maxCount = timeSlotData.max;
              const heightPct = maxCount > 0 && item.count > 0
                ? Math.max(12, Math.round((item.count / maxCount) * 85))
                : 0;
              const isPeak = item.count === maxCount && maxCount > 0;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end min-w-0">
                  <span className={isPeak ? "text-[11px] font-mono font-bold text-primary" : "text-[11px] font-mono text-muted"}>
                    {item.count}
                  </span>
                  <div className="w-full bg-surface-hover rounded-t-lg overflow-hidden flex items-end justify-center h-full">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.08, ease: 'easeOut' }}
                      className={isPeak ? "w-full bg-primary rounded-t-lg" : "w-full bg-primary/40 hover:bg-primary/70 transition-colors rounded-t-lg"}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-muted truncate w-full text-center mt-1">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribuição do SLA de Atendimento */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Tempo de Atendimento (SLA)</h3>
              <p className="text-xs text-muted">Classificação da velocidade de expedição no balcão</p>
            </div>
            <Clock className="w-4 h-4 text-muted" />
          </div>

          <div className="space-y-4 my-auto">
            {/* Rápido */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-emerald-400">Rápido (menos de 3 minutos)</span>
                <span className="font-mono font-bold text-foreground">
                  {slaBreakdown.fast} ({totalDelivered > 0 ? Math.round((slaBreakdown.fast / totalDelivered) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-surface-hover rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${totalDelivered > 0 ? (slaBreakdown.fast / totalDelivered) * 100 : 0}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full bg-emerald-400"
                />
              </div>
            </div>

            {/* Moderado */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-amber-400">Regular (de 3 a 5 minutos)</span>
                <span className="font-mono font-bold text-foreground">
                  {slaBreakdown.moderate} ({totalDelivered > 0 ? Math.round((slaBreakdown.moderate / totalDelivered) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-surface-hover rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${totalDelivered > 0 ? (slaBreakdown.moderate / totalDelivered) * 100 : 0}%` }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className="h-full rounded-full bg-amber-400"
                />
              </div>
            </div>

            {/* Lento */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-red-400">Acima do Limite (mais de 5 minutos)</span>
                <span className="font-mono font-bold text-foreground">
                  {slaBreakdown.slow} ({totalDelivered > 0 ? Math.round((slaBreakdown.slow / totalDelivered) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-surface-hover rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${totalDelivered > 0 ? (slaBreakdown.slow / totalDelivered) * 100 : 0}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="h-full rounded-full bg-red-400"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-background border border-border rounded-xl text-[11px] text-muted flex items-center gap-2 mt-4">
            <AlertCircle className="w-4 h-4 text-primary shrink-0" />
            <span>Meta operacional do canteiro: 85% dos atendimentos concluídos abaixo de 3 minutos.</span>
          </div>
        </div>
      </div>

      {/* Grid Inferior: Top 10 EPIs + Operadores do Balcão */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 10 EPIs */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Top EPIs Mais Retirados no Balcão</h3>
              <p className="text-xs text-muted">Itens com maior demanda física no canteiro</p>
            </div>
            <Package className="w-4 h-4 text-primary" />
          </div>

          {topEpis.length === 0 ? (
            <div className="py-8 text-center text-muted">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-muted" />
              <p className="text-xs font-medium">Nenhum EPI expedido ainda para esta obra.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topEpis.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-muted text-[11px] w-4">#{idx + 1}</span>
                      <span className="font-semibold text-foreground truncate">{item.name}</span>
                      {item.ca && <span className="text-[10px] text-muted font-mono">CA {item.ca}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-primary">{item.count} un</span>
                      <span className="text-muted text-[10px]">({item.percentage}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.05, ease: 'easeOut' }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desempenho por Operador */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Operadores do Balcão</h3>
              <p className="text-xs text-muted">Despachos realizados por usuário no almoxarifado</p>
            </div>
            <User className="w-4 h-4 text-muted" />
          </div>

          {operators.length === 0 ? (
            <div className="py-8 text-center text-muted">
              <User className="w-8 h-8 mx-auto mb-2 opacity-40 text-muted" />
              <p className="text-xs font-medium">Nenhum despacho de balcão registrado ainda.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {operators.map((op, idx) => {
                const avgSec = Math.round(op.totalSec / op.count);
                const m = Math.floor(avgSec / 60);
                const s = avgSec % 60;
                const formattedAvg = `${m}m ${String(s).padStart(2, '0')}s`;

                return (
                  <div key={idx} className="bg-background border border-border rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-xs font-bold font-mono text-foreground shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{op.name}</p>
                        <p className="text-[10px] text-muted">SLA médio: <span className="font-mono text-foreground font-semibold">{formattedAvg}</span></p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold font-mono text-emerald-400">{op.count}</span>
                      <span className="text-[11px] text-muted ml-1">entregas</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
