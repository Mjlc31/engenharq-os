import React from 'react';
import { motion } from 'motion/react';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

interface KpiGridWidgetProps {
  stats: any;
}

export function KpiGridWidget({ stats }: KpiGridWidgetProps) {
  const cards = React.useMemo(() => [
    {
      title: 'Total EPIs em Uso',
      value: stats.inUse,
      subtitle: 'Equipamentos alocados',
      subtitleColor: 'text-emerald-500',
      valueColor: 'text-primary'
    },
    {
      title: 'Estoque Disponível',
      value: Math.max(0, stats.totalEPIs - stats.inUse - stats.maintenance),
      subtitle: 'Prontos para uso',
      subtitleColor: 'text-muted',
      valueColor: 'text-foreground'
    },
    {
      title: 'Em Manutenção',
      value: stats.maintenance,
      subtitle: 'Ação Requerida',
      subtitleColor: 'text-amber-500',
      valueColor: 'text-amber-500'
    },
    {
      title: 'Retenção Média',
      value: stats.workers,
      subtitle: 'No canteiro atual',
      subtitleColor: 'text-muted',
      valueColor: 'text-foreground'
    },
  ], [stats]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {cards.map((card, i) => (
        <motion.div key={i} variants={itemVariants} className="bg-surface border border-border p-4 rounded-xl hover:border-border/80 hover:-translate-y-1 transition-all duration-300 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-muted uppercase font-bold tracking-wider">{card.title}</span>
          <div className="flex items-end justify-between mt-2 gap-2">
            <span className={`text-2xl md:text-3xl font-bold font-mono tracking-tight ${card.valueColor} truncate`}>{card.value}</span>
            <span className={`text-[10px] font-medium ${card.subtitleColor} shrink-0`}>{card.subtitle}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
