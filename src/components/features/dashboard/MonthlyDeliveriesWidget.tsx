import React from 'react';
import { motion } from 'motion/react';
import { MonthlyDeliveryStat } from '../../../hooks/useDashboard';

interface MonthlyDeliveriesWidgetProps {
  data: MonthlyDeliveryStat[];
}

export function MonthlyDeliveriesWidget({ data }: MonthlyDeliveriesWidgetProps) {
  const maxCount = Math.max(...data.map(d => d.count), 0);

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-foreground">Entregas por Mês</h3>
        <span className="text-xs text-muted">Histórico Semestral</span>
      </div>

      <div className="flex items-end justify-between gap-3 h-52 pt-8 pb-2 px-2">
        {data.map((item, idx) => {
          const heightPct = maxCount > 0 && item.count > 0 
            ? Math.max(8, Math.round((item.count / maxCount) * 85)) 
            : 0;

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <span className="text-xs font-mono font-bold text-muted">{item.count}</span>
              <div className="w-full max-w-[42px] bg-surface-hover rounded-t-lg overflow-hidden flex items-end justify-center h-full">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.1, ease: 'easeOut' }}
                  className="w-full bg-primary/80 hover:bg-primary transition-colors rounded-t-lg"
                />
              </div>
              <span className="text-xs font-medium text-muted mt-1">{item.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
