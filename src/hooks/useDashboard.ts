
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface DashboardMovement {
  id: string;
  assigned_at: string;
  returned_at: string | null;
  catalog: { name: string } | { name: string }[];
  worker: { full_name: string } | { full_name: string }[];
}

export interface DashboardAlert {
  id: string;
  type: 'CA_EXPIRATION' | 'LIFESPAN';
  severity: 'CRITICAL' | 'WARNING';
  message: string;
  epi: { name: string; ca_validity?: string } | undefined;
  worker: { full_name: string } | undefined;
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
            const [
        catalogsReq,
        workersReq,
        movementsReq,
        activeAssignmentsReq
      ] = await Promise.allSettled([
        supabase.from('epi_catalog').select('current_stock, ca_number, ca_validity, status, name, id'),
        supabase.from('workers').select('*', { count: 'exact', head: true }).neq('status', 'INACTIVE'),
        supabase.from('epi_assignments')
          .select(`
            id,
            quantity,
            assigned_at,
            returned_at,
            catalog:epi_catalog(name),
            worker:workers(full_name)
          `)
          .order('assigned_at', { ascending: false })
          .limit(10),
        supabase.from('epi_assignments')
          .select(`
            id,
            quantity,
            assigned_at,
            returned_at,
            catalog:epi_catalog(name, lifespan_days),
            worker:workers(full_name)
          `)
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
        const epiInfo = Array.isArray(assignment.catalog) ? assignment.catalog[0] : assignment.catalog;
        const workerInfo = Array.isArray(assignment.worker) ? assignment.worker[0] : assignment.worker;
        
        if (epiInfo?.lifespan_days) {
          const assigned = new Date(assignment.assigned_at);
          const expiryDate = new Date(assigned.getTime() + (epiInfo.lifespan_days * 24 * 60 * 60 * 1000));
          const daysUntilReplacement = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilReplacement <= 7) {
             lifespanAlerts.push({
               id: `lifespan-${assignment.id}`,
               type: 'LIFESPAN',
               severity: daysUntilReplacement <= 0 ? 'CRITICAL' : 'WARNING',
               message: daysUntilReplacement <= 0 ? 'Troca Atrasada' : `Troca em ${daysUntilReplacement} dias`,
               epi: epiInfo,
               worker: workerInfo
             });
          }
        }
      });

      const catalogs = getData(catalogsReq);
      const totalEPIs = catalogs.reduce((acc: number, item: any) => acc + (item.current_stock || 0), 0);
      const inUseCount = activeAssignments.reduce((acc: number, a: any) => acc + (a.quantity || 1), 0);
      const caAlerts = catalogs.filter((item: any) => item.ca_validity).map((item: any) => {
        const expDate = new Date(item.ca_validity);
        const daysUntilExpiry = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 30) {
          return {
            id: `ca-${item.id}`,
            type: 'CA_EXPIRATION' as const,
            severity: daysUntilExpiry <= 0 ? 'CRITICAL' as const : 'WARNING' as const,
            message: daysUntilExpiry <= 0 ? 'CA Vencido' : `CA vence em ${daysUntilExpiry} dias`,
            epi: { name: item.name, ca_validity: item.ca_validity },
            worker: undefined
          } as DashboardAlert;
        }
        return null;
      }).filter(Boolean) as DashboardAlert[];

      const allAlerts = [...lifespanAlerts, ...caAlerts].sort((a, b) => {
        if (a.severity === 'CRITICAL' && b.severity !== 'CRITICAL') return -1;
        if (a.severity !== 'CRITICAL' && b.severity === 'CRITICAL') return 1;
        return 0;
      });

      return {
        stats: {
          totalEPIs,
          inUse: inUseCount,
          maintenance: 0,
          workers: getCount(workersReq),
          avgRetentionDays,
          activeAssignmentsCount: inUseCount
        },
        recentMovements: getData(movementsReq) as DashboardMovement[],
        lifespanAlerts: allAlerts.slice(0, 10)
      };
    }
  });
}
