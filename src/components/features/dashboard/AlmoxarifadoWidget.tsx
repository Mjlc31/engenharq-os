import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Tv, PackageCheck, Clock, FileSignature, ArrowRight, Boxes, Radio } from 'lucide-react';
import { AlmoxarifadoDashboardStats } from '../../../hooks/useDashboard';
import { Skeleton } from '../../ui/Skeleton';

interface AlmoxarifadoWidgetProps {
  stats?: AlmoxarifadoDashboardStats;
  loading: boolean;
}

export function AlmoxarifadoWidget({ stats, loading }: AlmoxarifadoWidgetProps) {
  const current = stats || {
    ordersToday: 0,
    itemsExpeditedToday: 0,
    pendingInQueue: 0,
    avgSlaFormatted: '0m 00s',
    signatureComplianceRate: 100,
    topEpis: []
  };

  return (
    <section aria-labelledby="almoxarifado-widget-title" className="space-y-3">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <PackageCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="almoxarifado-widget-title" className="text-base font-bold tracking-tight text-foreground">
                Almoxarifado & Balcão de EPIs
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AO VIVO
              </span>
            </div>
            <p className="text-xs text-muted">Fluxo de comandas, expedição e tempo de atendimento em canteiro</p>
          </div>
        </div>

        {/* Atalhos Rápidos para KDS e Telão */}
        <div className="flex items-center gap-2">
          <Link
            to="/kds/tv"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-border text-foreground text-xs font-semibold border border-border transition-colors cursor-pointer"
            title="Abrir Telão da Smart TV em nova aba"
          >
            <Tv className="w-3.5 h-3.5 text-primary" />
            <span>Telão TV</span>
          </Link>

          <Link
            to="/almoxarifado-kds"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <span>Painel Balcão</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Grid de 4 Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Atendimentos Hoje */}
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-medium">Atendimentos Hoje</span>
            <PackageCheck className="w-4 h-4 text-emerald-400" />
          </div>
          {loading ? (
            <Skeleton className="h-7 w-16 my-1" />
          ) : (
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{current.ordersToday}</p>
          )}
          <p className="text-[11px] text-muted">comandas concluídas</p>
        </div>

        {/* Itens Expedidos Hoje */}
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-medium">Peças Expedidas Hoje</span>
            <Boxes className="w-4 h-4 text-primary" />
          </div>
          {loading ? (
            <Skeleton className="h-7 w-16 my-1" />
          ) : (
            <p className="text-2xl font-bold font-mono tracking-tight text-primary">{current.itemsExpeditedToday}</p>
          )}
          <p className="text-[11px] text-muted">EPIs retirados no balcão</p>
        </div>

        {/* SLA Médio de Espera */}
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-medium">Tempo Médio (SLA)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          {loading ? (
            <Skeleton className="h-7 w-16 my-1" />
          ) : (
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{current.avgSlaFormatted}</p>
          )}
          <p className="text-[11px] text-muted">da solicitação à entrega</p>
        </div>

        {/* Taxa de Assinatura */}
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-medium">Assinatura Digital</span>
            <FileSignature className="w-4 h-4 text-emerald-400" />
          </div>
          {loading ? (
            <Skeleton className="h-7 w-16 my-1" />
          ) : (
            <p className="text-2xl font-bold font-mono tracking-tight text-emerald-400">{current.signatureComplianceRate}%</p>
          )}
          <p className="text-[11px] text-muted">comprovantes coletados</p>
        </div>
      </div>

      {/* Bloco Inferior: Top EPIs Mais Retirados no Balcão */}
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="text-sm font-bold text-foreground">Top EPIs Mais Expedidos no Balcão</h3>
            <p className="text-xs text-muted">Equipamentos com maior saída nas comandas do almoxarifado</p>
          </div>
          <Link
            to="/almoxarifado-kds"
            className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
          >
            <span>Ver Histórico Completo</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : current.topEpis.length === 0 ? (
          <div className="py-6 text-center text-muted">
            <Boxes className="w-8 h-8 mx-auto mb-2 opacity-40 text-muted" />
            <p className="text-xs font-medium">Nenhuma expedição de balcão registrada recentemente.</p>
            <p className="text-[11px] text-muted/70 mt-0.5">As novas comandas entregues aparecerão consolidadas aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {current.topEpis.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted text-[11px]">#{idx + 1}</span>
                    <span className="font-semibold text-foreground">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary">{item.count} un</span>
                    <span className="text-muted text-[10px]">({item.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentage}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.1, ease: 'easeOut' }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
