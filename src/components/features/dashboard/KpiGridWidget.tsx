import React from 'react';
import { DashboardStats } from '../../../hooks/useDashboard';
import { Skeleton } from '../../ui/Skeleton';

interface KpiGridWidgetProps {
  stats: DashboardStats;
  loading: boolean;
}

// Contadores de contexto: peso visual menor que "Exige ação", sem cor de status.
export function KpiGridWidget({ stats, loading }: KpiGridWidgetProps) {
  const cards = [
    { title: 'Funcionários ativos', value: stats.activeWorkers, subtitle: `de ${stats.totalWorkers} cadastrado(s)` },
    { title: 'EPIs em uso', value: stats.inUse, subtitle: 'com colaboradores' },
    { title: 'Estoque total', value: stats.totalStock.toLocaleString('pt-BR'), subtitle: 'unidades em armazém' },
    { title: 'Devolvidos', value: stats.returnedMonth, subtitle: 'neste mês' },
    { title: 'Extraviados', value: stats.lostCount, subtitle: 'neste ano' },
    { title: 'Funcionários inativos', value: stats.inactiveWorkers, subtitle: 'desligados ou afastados' },
  ];

  return (
    <section aria-labelledby="indicadores-title">
      <h2 id="indicadores-title" className="text-sm font-semibold text-muted mb-3">Indicadores</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-px bg-border border border-border rounded-2xl overflow-hidden">
        {cards.map(card => (
          <div key={card.title} className="bg-surface px-4 py-3.5 min-w-0">
            <p className="text-xs text-muted truncate">{card.title}</p>
            {loading
              ? <Skeleton className="h-7 w-14 my-1" />
              : <p className="text-2xl font-semibold tabular-nums text-foreground leading-9">{card.value}</p>}
            <p className="text-xs text-muted truncate">{card.subtitle}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
