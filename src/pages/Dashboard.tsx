import React from 'react';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import { HardHat, AlertTriangle, Users, ArrowUpRight, ArrowDownRight, Clock, ShieldAlert, CheckCircle2, Package } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { CardSkeleton, ChartSkeleton, ListItemSkeleton } from '../components/ui/Skeleton';

export function Dashboard() {
  const { data, isLoading: loading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [
        epiCountReq,
        inUseReq,
        maintenanceReq,
        workersReq,
        movementsReq,
        activeAssignmentsReq
      ] = await Promise.all([
        supabase.from('epi_inventory').select('*', { count: 'exact', head: true }),
        supabase.from('epi_inventory').select('*', { count: 'exact', head: true }).eq('status', 'IN_USE'),
        supabase.from('epi_inventory').select('*', { count: 'exact', head: true }).eq('status', 'MAINTENANCE'),
        supabase.from('workers').select('*', { count: 'exact', head: true }),
        supabase.from('epi_assignments')
          .select(`
            id,
            assigned_at,
            returned_at,
            epi:epi_inventory(tracking_code, category),
            worker:workers(full_name)
          `)
          .order('assigned_at', { ascending: false })
          .limit(5),
        supabase.from('epi_assignments')
          .select(`
            id,
            assigned_at,
            expected_return_date,
            epi:epi_inventory(tracking_code, category, ca_expiration_date),
            worker:workers(full_name)
          `)
          .is('returned_at', null)
      ]);

      if (epiCountReq.error) console.error("Error fetching EPI count", epiCountReq.error);
      
      const stats = {
        totalEPIs: epiCountReq.count || 0,
        inUse: inUseReq.count || 0,
        maintenance: maintenanceReq.count || 0,
        workers: workersReq.count || 0,
      };
      
      const recentMovements = movementsReq.data || [];

      const alerts = [];
      const today = new Date();
      const activeAssignments = activeAssignmentsReq.data;
      
      if (activeAssignments) {
        for (const assignment of activeAssignments) {
          const epiInfo = Array.isArray(assignment.epi) ? assignment.epi[0] : assignment.epi;
          const workerInfo = Array.isArray(assignment.worker) ? assignment.worker[0] : assignment.worker;
          
          if (epiInfo?.ca_expiration_date) {
            const daysToCaExp = differenceInDays(new Date(epiInfo.ca_expiration_date), today);
            if (daysToCaExp <= 30) {
              alerts.push({
                id: `ca-${assignment.id}`,
                type: 'CA_EXPIRATION',
                severity: daysToCaExp < 0 ? 'CRITICAL' : 'WARNING',
                message: `CA vencendo em ${daysToCaExp} dias`,
                epi: epiInfo,
                worker: workerInfo
              });
              continue;
            }
          }
          
          if (assignment.expected_return_date) {
            const daysToReturn = differenceInDays(new Date(assignment.expected_return_date), today);
            if (daysToReturn <= 5) {
              alerts.push({
                id: `life-${assignment.id}`,
                type: 'LIFESPAN',
                severity: daysToReturn < 0 ? 'CRITICAL' : 'WARNING',
                message: daysToReturn < 0 ? `Vida útil extrapolada (${Math.abs(daysToReturn)} dias)` : `Troca recomendada em ${daysToReturn} dias`,
                epi: epiInfo,
                worker: workerInfo
              });
            }
          }
        }
      }
      
      alerts.sort((a, b) => (a.severity === 'CRITICAL' ? -1 : 1));
      
      return { stats, recentMovements, lifespanAlerts: alerts };
    },
    refetchInterval: 30000 // auto refresh every 30s
  });

  const stats = data?.stats || { totalEPIs: 0, inUse: 0, maintenance: 0, workers: 0 };
  const recentMovements = data?.recentMovements || [];
  const lifespanAlerts = data?.lifespanAlerts || [];

  const cards = [
    {
      title: 'Total EPIs em Uso',
      value: stats.inUse,
      subtitle: '+12% vs Ontem',
      subtitleColor: 'text-emerald-500',
      valueColor: 'text-primary'
    },
    {
      title: 'Estoque Disponível',
      value: stats.totalEPIs - stats.inUse - stats.maintenance,
      subtitle: 'Normal Status',
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
      subtitle: 'Status: OK',
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
    <div className="flex flex-col gap-4">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          loading ? (
            <CardSkeleton key={i} />
          ) : (
            <div key={i} className="bg-surface border border-border p-4 rounded-xl hover:border-border/80 hover:-translate-y-1 transition-all duration-300">
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider">{card.title}</span>
              <div className="flex items-end justify-between mt-2">
                <span className={`text-3xl font-bold font-mono tracking-tight ${card.valueColor}`}>{card.value}</span>
                <span className={`text-[10px] font-medium ${card.subtitleColor}`}>{card.subtitle}</span>
              </div>
            </div>
          )
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-auto lg:h-[360px]">
         
         {/* Inventory Chart */}
         {loading ? (
            <ChartSkeleton />
         ) : (
           <div className="bg-surface border border-border rounded-xl flex flex-col p-4">
              <div className="flex items-center gap-2 mb-4">
                 <Package className="w-4 h-4 text-primary" />
                 <h3 className="text-xs uppercase font-bold tracking-widest text-muted">Status do Inventário</h3>
              </div>
              <div className="flex-1 min-h-[200px]">
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
           </div>
         )}

         {/* Predictive Alerts Engine */}
         <div className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-hover/30">
               <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-primary" />
                  <h3 className="text-xs uppercase font-bold tracking-widest text-muted">Preditivo NR-6</h3>
               </div>
               {lifespanAlerts.length > 0 && (
                 <span className="text-[9px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20 font-bold">
                   {lifespanAlerts.length} ALERTAS
                 </span>
               )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
               {loading ? (
                 <>
                   <ListItemSkeleton />
                   <ListItemSkeleton />
                 </>
               ) : lifespanAlerts.length === 0 ? (
                 <div className="flex flex-col items-center justify-center text-muted h-full opacity-50">
                   <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-3" />
                   <span className="text-sm font-medium">100% de Conformidade</span>
                 </div>
               ) : (
                 lifespanAlerts.map(alert => (
                   <div key={alert.id} className="bg-background border border-border/60 p-3 rounded-lg flex items-start gap-3 hover:border-border transition-colors">
                     {alert.severity === 'CRITICAL' ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /> : <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                     <div>
                       <p className={`text-xs font-bold ${alert.severity === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}`}>{alert.message}</p>
                       <p className="text-xs font-medium text-foreground mt-1 truncate">{alert.epi?.tracking_code} • {alert.epi?.category}</p>
                       <p className="text-[10px] text-muted font-mono mt-0.5 truncate">{alert.worker?.full_name}</p>
                     </div>
                   </div>
                 ))
               )}
            </div>
         </div>

         {/* Real-time Log */}
         <div className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-hover/30">
               <h3 className="text-xs uppercase font-bold tracking-widest text-muted">Log Recente</h3>
               <span className="text-[9px] font-bold text-primary animate-pulse flex items-center gap-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-primary" /> LIVE
               </span>
            </div>
            <div className="flex-1 overflow-y-auto p-0">
               {loading ? (
                 <div className="divide-y divide-border/50">
                   <ListItemSkeleton />
                   <ListItemSkeleton />
                   <ListItemSkeleton />
                 </div>
               ) : recentMovements.length === 0 ? (
                 <p className="text-center text-muted text-sm mt-8">Sem movimentações.</p>
               ) : (
                 <div className="divide-y divide-border/50">
                   {recentMovements.map(movement => {
                     const epiInfo = Array.isArray(movement.epi) ? movement.epi[0] : movement.epi;
                     const workerInfo = Array.isArray(movement.worker) ? movement.worker[0] : movement.worker;
                     return (
                       <div key={movement.id} className="p-4 hover:bg-surface-hover/50 cursor-pointer transition-colors flex justify-between items-center group">
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
                       </div>
                     );
                   })}
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
