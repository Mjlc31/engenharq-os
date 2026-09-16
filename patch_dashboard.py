import re

with open('src/hooks/useDashboard.ts', 'r') as f:
    content = f.read()

# Replace epi_inventory with epi_catalog logic
new_query = """      const [
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
            assigned_at,
            returned_at,
            catalog:epi_catalog(name, lifespan_days),
            worker:workers(full_name)
          `)
          .is('returned_at', null)
      ]);"""

old_query_re = r"const \[\s*epiCountReq,\s*inUseReq,\s*maintenanceReq,\s*workersReq,\s*movementsReq,\s*alertsReq,\s*activeAssignmentsReq\s*\] = await Promise\.allSettled\(\[[\s\S]*?\]\);"
content = re.sub(old_query_re, new_query, content)

# Update interface DashboardMovement
content = re.sub(r"epi: \{ tracking_code: string; category: string \} \| \{ tracking_code: string; category: string \}\[\];", "catalog: { name: string } | { name: string }[];", content)

# Update interface DashboardAlert
content = re.sub(r"epi: \{ tracking_code: string; category: string; ca_expiration_date\?: string \} \| undefined;", "epi: { name: string; ca_validity?: string } | undefined;", content)

# Fix variables
fix_vars = """      const getCount = (req: PromiseSettledResult<any>) => req.status === 'fulfilled' ? req.value.count || 0 : 0;
      const getData = (req: PromiseSettledResult<any>) => req.status === 'fulfilled' ? req.value.data || [] : [];

      const activeAssignments = getData(activeAssignmentsReq);
      const catalogs = getData(catalogsReq);
      
      let totalStock = 0;
      catalogs.forEach((c: any) => {
        totalStock += (c.current_stock || 0);
      });
      
      const inUseCount = activeAssignments.length;
      const totalEPIs = totalStock + inUseCount; // Total owned is stock + what's in use
"""
content = re.sub(r"const getCount = .*?\s+const activeAssignments = getData\(activeAssignmentsReq\);", fix_vars, content)

# Fix lifespan alerts epi
content = content.replace("assignment.epi", "assignment.catalog")
content = content.replace("epiInfo?.recommended_lifespan_days", "epiInfo?.lifespan_days")
content = content.replace("epiInfo.recommended_lifespan_days", "epiInfo.lifespan_days")

# Fix CA Alerts
fix_ca_alerts = """      const caAlerts = catalogs.filter((item: any) => item.ca_validity).map((item: any) => {
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
      }).filter(Boolean) as DashboardAlert[];"""

old_ca_alerts_re = r"const caAlerts = getData\(alertsReq\)\.map\(\(item: any\) => \{[\s\S]*?\} as DashboardAlert;\n      \}\);"
content = re.sub(old_ca_alerts_re, fix_ca_alerts, content)

# Fix return stats
old_return = """        stats: {
          totalEPIs: getCount(epiCountReq),
          inUse: getCount(inUseReq),
          maintenance: getCount(maintenanceReq),
          workers: getCount(workersReq),
          avgRetentionDays,
          activeAssignmentsCount: activeAssignments.length
        },"""
new_return = """        stats: {
          totalEPIs,
          inUse: inUseCount,
          maintenance: 0,
          workers: getCount(workersReq),
          avgRetentionDays,
          activeAssignmentsCount: inUseCount
        },"""
content = content.replace(old_return, new_return)

with open('src/hooks/useDashboard.ts', 'w') as f:
    f.write(content)
