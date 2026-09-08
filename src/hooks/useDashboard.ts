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
        alertsReq
      ] = await Promise.allSettled([
        supabase.from('epi_inventory').select('*', { count: 'exact', head: true }).neq('status', 'DISCARDED'),
        supabase.from('epi_inventory').select('*', { count: 'exact', head: true }).eq('status', 'IN_USE'),
        supabase.from('epi_inventory').select('*', { count: 'exact', head: true }).eq('status', 'MAINTENANCE'),
        supabase.from('workers').select('*', { count: 'exact', head: true }).neq('status', 'INACTIVE'),
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
        supabase.from('epi_inventory')
          .select('id, tracking_code, category, ca_expiration_date')
          .not('ca_expiration_date', 'is', null)
          .neq('status', 'DISCARDED')
          .order('ca_expiration_date', { ascending: true })
          .limit(10)
      ]);

      const getCount = (req: PromiseSettledResult<any>) => req.status === 'fulfilled' ? req.value.count || 0 : 0;
      const getData = (req: PromiseSettledResult<any>) => req.status === 'fulfilled' ? req.value.data || [] : [];

      interface AlertItem {
        id: string;
        tracking_code: string;
        category: string;
        ca_expiration_date: string;
        assigned_worker?: any;
      }

      return {
        stats: {
          totalEPIs: getCount(epiCountReq),
          inUse: getCount(inUseReq),
          maintenance: getCount(maintenanceReq),
          workers: getCount(workersReq),
        },
        recentMovements: getData(movementsReq) as DashboardMovement[],
        lifespanAlerts: getData(alertsReq).map((item: AlertItem) => {
          const expDate = new Date(item.ca_expiration_date);
          const now = new Date();
          const daysUntilExpiry = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const workerInfo = Array.isArray(item.assigned_worker) ? item.assigned_worker[0] : item.assigned_worker;
          return {
            id: item.id,
            type: 'CA_EXPIRATION' as const,
            severity: daysUntilExpiry <= 0 ? 'CRITICAL' as const : 'WARNING' as const,
            message: daysUntilExpiry <= 0 ? 'CA Vencido' : `CA vence em ${daysUntilExpiry} dias`,
            epi: { tracking_code: item.tracking_code, category: item.category, ca_expiration_date: item.ca_expiration_date },
            worker: workerInfo
          } as DashboardAlert;
        })
      };
    }
  });
}
