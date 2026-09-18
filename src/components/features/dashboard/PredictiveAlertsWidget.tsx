import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '../../ui/Skeleton';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

interface PredictiveAlertsWidgetProps {
  lifespanAlerts: any[];
  loading: boolean;
}

export function PredictiveAlertsWidget({ lifespanAlerts, loading }: PredictiveAlertsWidgetProps) {
  return (
    <motion.div variants={itemVariants} className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden shadow-sm max-h-[350px] lg:max-h-none">
      <div className="p-4 border-b border-border flex justify-between items-center bg-surface-hover/30 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <h3 className="text-xs uppercase font-bold tracking-widest text-muted">Preditivo NR-6</h3>
          </div>
          {lifespanAlerts.length > 0 && (
            <motion.span 
              initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              className="text-[9px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20 font-bold"
            >
              {lifespanAlerts.length} ALERTAS
            </motion.span>
          )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : lifespanAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-muted h-full opacity-50">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-3" />
              <span className="text-sm font-medium">100% de Conformidade</span>
            </div>
          ) : (
            lifespanAlerts.map(alert => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                key={alert.id} 
                className="bg-background border border-border/60 p-3 rounded-lg flex items-start gap-3 hover:border-border transition-colors"
              >
                {alert.severity === 'CRITICAL' ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /> : <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                <div>
                  <p className={`text-xs font-bold ${alert.severity === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}`}>{alert.message}</p>
                  <p className="text-xs font-medium text-foreground mt-1 truncate">{alert.epi?.tracking_code} • {alert.epi?.category}</p>
                  <p className="text-[10px] text-muted font-mono mt-0.5 truncate">{alert.worker?.full_name}</p>
                </div>
              </motion.div>
            ))
          )}
      </div>
    </motion.div>
  );
}
