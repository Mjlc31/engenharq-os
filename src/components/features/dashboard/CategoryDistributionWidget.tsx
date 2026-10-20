import React from 'react';
import { motion } from 'motion/react';
import { CategoryStat } from '../../../hooks/useDashboard';

interface CategoryDistributionWidgetProps {
  categories: CategoryStat[];
}

export function CategoryDistributionWidget({ categories }: CategoryDistributionWidgetProps) {
  const maxCount = Math.max(...categories.map(c => c.count), 0);

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-foreground">EPIs por Categoria</h3>
        <span className="text-xs text-muted">NR-6 Atualizado</span>
      </div>

      <div className="space-y-4">
        {categories.map((item, idx) => {
          const percentage = maxCount > 0 ? Math.min(100, Math.round((item.count / maxCount) * 100)) : 0;

          return (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-foreground">{item.category}</span>
                <span className="font-mono font-bold text-foreground">{item.count}</span>
              </div>
              <div className="w-full h-2.5 bg-surface-hover rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.1, ease: 'easeOut' }}
                  className={`h-full rounded-full ${item.barColor}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
