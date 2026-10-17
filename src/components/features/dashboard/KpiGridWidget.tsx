import React from 'react';
import { motion } from 'motion/react';
import { Users, HardHat, Clock, AlertTriangle, Package, RotateCcw, ShieldAlert, UserX } from 'lucide-react';
import { DashboardStats } from '../../../hooks/useDashboard';

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 }
};

interface KpiGridWidgetProps {
  stats: DashboardStats;
}

export function KpiGridWidget({ stats }: KpiGridWidgetProps) {
  const cards = React.useMemo(() => [
    {
      title: 'Funcionários Ativos',
      value: stats.activeWorkers,
      subtitle: '~5.2% vs mês anterior',
      subtitleColor: 'text-muted',
      icon: Users,
      iconBg: 'bg-blue-500/10 text-blue-500',
    },
    {
      title: 'EPIs em Uso',
      value: stats.inUse,
      subtitle: '~12.5% vs mês anterior',
      subtitleColor: 'text-muted',
      icon: HardHat,
      iconBg: 'bg-emerald-500/10 text-emerald-500',
    },
    {
      title: 'EPIs Vencendo',
      value: stats.expiringEpis,
      subtitle: 'Próximos 30 dias',
      subtitleColor: 'text-amber-500 font-medium',
      icon: Clock,
      iconBg: 'bg-amber-500/10 text-amber-500',
    },
    {
      title: 'Estoque Crítico',
      value: stats.criticalStock,
      subtitle: 'Itens abaixo do mínimo',
      subtitleColor: 'text-rose-500 font-medium',
      icon: AlertTriangle,
      iconBg: 'bg-rose-500/10 text-rose-500',
    },
    {
      title: 'Estoque Total',
      value: stats.totalStock.toLocaleString('pt-BR'),
      subtitle: 'Itens em armazém',
      subtitleColor: 'text-muted',
      icon: Package,
      iconBg: 'bg-cyan-500/10 text-cyan-500',
    },
    {
      title: 'EPIs Devolvidos',
      value: stats.returnedMonth,
      subtitle: 'Este mês',
      subtitleColor: 'text-muted',
      icon: RotateCcw,
      iconBg: 'bg-blue-500/10 text-blue-400',
    },
    {
      title: 'Extraviados',
      value: stats.lostCount,
      subtitle: 'Este ano',
      subtitleColor: 'text-rose-400 font-medium',
      icon: ShieldAlert,
      iconBg: 'bg-rose-500/10 text-rose-400',
    },
    {
      title: 'Funcionários Inativos',
      value: stats.inactiveWorkers,
      subtitle: 'Demitidos / Afastados',
      subtitleColor: 'text-amber-500 font-medium',
      icon: UserX,
      iconBg: 'bg-amber-500/10 text-amber-400',
    },
  ], [stats]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={i}
            variants={itemVariants}
            className="bg-surface border border-border p-5 rounded-2xl shadow-sm hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 flex items-start justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs text-muted font-medium">{card.title}</span>
              <div className="text-2xl lg:text-3xl font-bold font-mono tracking-tight text-foreground">
                {card.value}
              </div>
              <p className={`text-[11px] ${card.subtitleColor}`}>{card.subtitle}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}>
              <Icon className="w-5 h-5" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
