import React from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { Skeleton } from '../../ui/Skeleton';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

interface RealTimeLogWidgetProps {
  recentMovements: any[];
  loading: boolean;
}

export function RealTimeLogWidget({ recentMovements, loading }: RealTimeLogWidgetProps) {
  return (
    <motion.div variants={itemVariants} className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden shadow-sm max-h-[350px] lg:max-h-none">
      <div className="p-4 border-b border-border flex justify-between items-center bg-surface-hover/30 shrink-0">
          <h3 className="text-xs uppercase font-bold tracking-widest text-muted">Log Recente</h3>
          <span className="text-[9px] font-bold text-primary animate-pulse flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" /> LIVE
          </span>
      </div>
      <div className="flex-1 overflow-y-auto p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : recentMovements.length === 0 ? (
            <p className="text-center text-muted text-sm mt-8">Sem movimentações.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {recentMovements.map((movement, idx) => {
                const epiInfo = Array.isArray(movement.epi) ? movement.epi[0] : movement.epi;
                const workerInfo = Array.isArray(movement.worker) ? movement.worker[0] : movement.worker;
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                    key={movement.id} 
                    className="p-4 hover:bg-surface-hover/50 cursor-pointer transition-colors flex justify-between items-center group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {movement.returned_at ? (
                          <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-bold">DEVOLUÇÃO</span>
                        ) : (
                          <span className="text-[9px] bg-primary/20 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-bold">ENTREGA</span>
                        )}
                        <span className="text-xs font-bold text-foreground">{epiInfo?.tracking_code}</span>
                      </div>
                      <p className="text-[10px] text-muted font-mono mt-1 truncate max-w-[150px]">{workerInfo?.full_name}</p>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {format(new Date(movement.returned_at || movement.assigned_at), 'HH:mm')}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
      </div>
    </motion.div>
  );
}
