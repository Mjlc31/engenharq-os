import React from 'react';
import { format } from 'date-fns';
import { HardHat, AlertTriangle, Users, Clock, ShieldAlert, CheckCircle2, Package } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { motion } from 'motion/react';
import { Skeleton } from '../components/ui/Skeleton';
import { useDashboard } from '../hooks/useDashboard';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export function Dashboard() {
  const { data, isLoading: loading } = useDashboard();

  const stats = data?.stats || { totalEPIs: 0, inUse: 0, maintenance: 0, workers: 0 };
  const recentMovements = data?.recentMovements || [];
  const lifespanAlerts = data?.lifespanAlerts || [];

  const cards = [
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
      title: 'Colaboradores Ativos',
      value: stats.workers,
      subtitle: 'No canteiro atual',
      subtitleColor: 'text-muted',
      valueColor: 'text-foreground'
    },
  ];

  const pieData = [
    { name: 'Em Uso', value: stats.inUse, color: '#ef4444' },
    { name: 'Manutenção', value: stats.maintenance, color: '#f59e0b' },
    { name: 'Estoque', value: Math.max(0, stats.totalEPIs - stats.inUse - stats.maintenance), color: '#27272a' },
  ];

  return (
    <motion.div 
      data-testid="dashboard-container"
      className="flex flex-col gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 h-auto lg:h-[360px]">
         
         {/* Inventory Chart */}
         <motion.div variants={itemVariants} className="bg-surface border border-border rounded-xl flex flex-col p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
               <Package className="w-4 h-4 text-primary" />
               <h3 className="text-xs uppercase font-bold tracking-widest text-muted">Status do Inventário</h3>
            </div>
            <div className="flex-1 min-h-[220px] md:min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    animationDuration={1500}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#fafafa' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {pieData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] text-muted font-medium uppercase tracking-wider">{item.name}</span>
                </div>
              ))}
            </div>
         </motion.div>

         {/* Predictive Alerts Engine */}
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

         {/* Real-time Log */}
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
      </div>
    </motion.div>
  );
}

