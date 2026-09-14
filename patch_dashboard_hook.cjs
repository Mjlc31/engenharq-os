const fs = require('fs');
const content = `
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface DashboardMovement {
  id: string;
  assigned_at: string;
  returned_at: string | null;
  epi: { tracking_code: string; category: string } | { tracking_code: string; category: string }[];
  worker: { full_name: string } | { full_name: string }[];
}

export interface DashboardAlert {
  id: string;
  type: 'CA_EXPIRATION' | 'LIFESPAN';
  severity: 'CRITICAL' | 'WARNING';
  message: string;
  epi: { tracking_code: string; category: string; ca_expiration_date?: string } | undefined;
  worker: { full_name: string } | undefined;
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [
        epiCountReq,
        inUseReq,
        maintenanceReq,
        workersReq,
        movementsReq,
        alertsReq,
        activeAssignmentsReq
      ] = await Promise.allSettled([
        supabase.from('epi_inventory').select('*', { count: 'exact', head: true }).neq('status', 'DISCARDED'),
        supabase.from('epi_inventory').select('*', { count: 'exact', head: true }).eq('status', 'IN_USE'),
        supabase.from('epi_inventory').select('*', { count: 'exact', head: true }).eq('status', 'MAINTENANCE'),
        supabase.from('workers').select('*', { count: 'exact', head: true }).neq('status', 'INACTIVE'),
        supabase.from('epi_assignments')
          .select(\`
            id,
            assigned_at,
            returned_at,
            epi:epi_inventory(tracking_code, category),
            worker:workers(full_name)
          \`)
          .order('assigned_at', { ascending: false })
          .limit(10),
        supabase.from('epi_inventory')
          .select('id, tracking_code, category, ca_expiration_date')
          .not('ca_expiration_date', 'is', null)
          .neq('status', 'DISCARDED')
          .order('ca_expiration_date', { ascending: true })
          .limit(10),
        supabase.from('epi_assignments')
          .select(\`
            id,
            assigned_at,
            returned_at,
            epi:epi_inventory(tracking_code, category, recommended_lifespan_days),
            worker:workers(full_name)
          \`)
          .is('returned_at', null)
      ]);

      const getCount = (req: PromiseSettledResult<any>) => req.status === 'fulfilled' ? req.value.count || 0 : 0;
      const getData = (req: PromiseSettledResult<any>) => req.status === 'fulfilled' ? req.value.data || [] : [];

      const activeAssignments = getData(activeAssignmentsReq);
      
      // Calculate Average Retention Time (for currently held items)
      let totalDaysHeld = 0;
      const now = new Date();
      activeAssignments.forEach((assignment: any) => {
        const assigned = new Date(assignment.assigned_at);
        const days = Math.floor((now.getTime() - assigned.getTime()) / (1000 * 60 * 60 * 24));
        totalDaysHeld += days;
      });
      const avgRetentionDays = activeAssignments.length > 0 ? Math.round(totalDaysHeld / activeAssignments.length) : 0;

      // Calculate Scheduled Replacements (Lifespan Alerts)
      const lifespanAlerts: DashboardAlert[] = [];
      activeAssignments.forEach((assignment: any) => {
        const epiInfo = Array.isArray(assignment.epi) ? assignment.epi[0] : assignment.epi;
        const workerInfo = Array.isArray(assignment.worker) ? assignment.worker[0] : assignment.worker;
        
        if (epiInfo?.recommended_lifespan_days) {
          const assigned = new Date(assignment.assigned_at);
          const expiryDate = new Date(assigned.getTime() + (epiInfo.recommended_lifespan_days * 24 * 60 * 60 * 1000));
          const daysUntilReplacement = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilReplacement <= 7) {
             lifespanAlerts.push({
               id: \`lifespan-\${assignment.id}\`,
               type: 'LIFESPAN',
               severity: daysUntilReplacement <= 0 ? 'CRITICAL' : 'WARNING',
               message: daysUntilReplacement <= 0 ? 'Troca Atrasada' : \`Troca em \${daysUntilReplacement} dias\`,
               epi: epiInfo,
               worker: workerInfo
             });
          }
        }
      });

      const caAlerts = getData(alertsReq).map((item: any) => {
        const expDate = new Date(item.ca_expiration_date);
        const daysUntilExpiry = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: \`ca-\${item.id}\`,
          type: 'CA_EXPIRATION' as const,
          severity: daysUntilExpiry <= 0 ? 'CRITICAL' as const : 'WARNING' as const,
          message: daysUntilExpiry <= 0 ? 'CA Vencido' : \`CA vence em \${daysUntilExpiry} dias\`,
          epi: { tracking_code: item.tracking_code, category: item.category, ca_expiration_date: item.ca_expiration_date },
          worker: undefined
        } as DashboardAlert;
      });

      const allAlerts = [...lifespanAlerts, ...caAlerts].sort((a, b) => {
        if (a.severity === 'CRITICAL' && b.severity !== 'CRITICAL') return -1;
        if (a.severity !== 'CRITICAL' && b.severity === 'CRITICAL') return 1;
        return 0;
      });

      return {
        stats: {
          totalEPIs: getCount(epiCountReq),
          inUse: getCount(inUseReq),
          maintenance: getCount(maintenanceReq),
          workers: getCount(workersReq),
          avgRetentionDays,
          activeAssignmentsCount: activeAssignments.length
        },
        recentMovements: getData(movementsReq) as DashboardMovement[],
        lifespanAlerts: allAlerts.slice(0, 10)
      };
    }
  });
}
`;
fs.writeFileSync('src/hooks/useDashboard.ts', content);
