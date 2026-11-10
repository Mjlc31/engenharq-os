import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { computeCompliance, isActiveWorker, ComplianceSummary } from '../lib/compliance';

export interface DashboardDeliveryItem {
  id: string;
  workerName: string;
  workerInitials: string;
  avatarColor: string;
  epiName: string;
  date: string;
  status: 'Em uso' | 'Devolvido';
}

export interface CategoryStat {
  category: string;
  count: number;
  color: string;
  barColor: string;
}

export interface MonthlyDeliveryStat {
  month: string;
  count: number;
}

export interface AlmoxarifadoDashboardStats {
  ordersToday: number;
  itemsExpeditedToday: number;
  pendingInQueue: number;
  avgSlaFormatted: string;
  signatureComplianceRate: number;
  topEpis: { name: string; count: number; percentage: number }[];
}

export interface DashboardStats {
  activeWorkers: number;
  inactiveWorkers: number;
  totalWorkers: number;
  inUse: number;
  totalStock: number;
  returnedMonth: number;
  lostCount: number;
  avgRetentionDays: number;
}

const AVATAR_COLORS = [
  'bg-amber-500 text-amber-950',
  'bg-emerald-500 text-emerald-950',
  'bg-blue-500 text-blue-950',
  'bg-purple-500 text-purple-950',
  'bg-rose-500 text-rose-950',
  'bg-cyan-500 text-cyan-950'
];

function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const [
        catalogsReq,
        workersReq,
        allAssignmentsReq,
        asosReq,
        trainingsReq,
        almoxOrdersReq
      ] = await Promise.allSettled([
        supabase
          .from('epi_catalog')
          .select('id, name, category, current_stock, min_stock, minimum_stock, ca_number, ca_validity, status')
          .is('deleted_at', null),
        supabase
          .from('workers')
          .select('id, full_name, status, aso_date, admission_date')
          .is('deleted_at', null),
        supabase
          .from('epi_assignments')
          .select('id, assigned_at, returned_at, condition_on_return, quantity, catalog:epi_catalog!catalog_id(id, name, category, ca_number, lifespan_days, deleted_at), worker:workers!worker_id(id, full_name, reference_photo_url, deleted_at)')
          .is('deleted_at', null)
          .order('assigned_at', { ascending: false })
          .limit(300),
        // shortcut: traz o histórico inteiro e filtra o mais recente no cliente; passa do limite de 1000 linhas do PostgREST com volume real, então mover para uma view/RPC.
        supabase.from('worker_asos').select('worker_id, valid_until').is('voided_at', null),
        supabase.from('worker_trainings').select('worker_id, training_id, valid_until').is('voided_at', null),
        supabase
          .from('almoxarifado_orders')
          .select('id, order_number, status, items, requested_at, delivered_at, signature_url')
          .is('deleted_at', null)
          .order('requested_at', { ascending: false })
          .limit(200)
      ]);

      const getData = (req: PromiseSettledResult<any>) => req.status === 'fulfilled' ? req.value.data || [] : [];
      const failed = (req: PromiseSettledResult<any>) => req.status === 'rejected' || !!req.value.error;
      // Fonte que falhou vira "indisponível" na tela, nunca zero: lista vazia de ASOs viraria "todos sem ASO".
      const complianceUnavailable = {
        catalog: failed(catalogsReq),
        aso: failed(workersReq) || failed(asosReq),
        trainings: failed(workersReq) || failed(trainingsReq)
      };

      const catalogs = getData(catalogsReq);
      const workers = getData(workersReq);
      const rawAssignments = getData(allAssignmentsReq);
      const compliance: ComplianceSummary = computeCompliance({
        today: now,
        catalogs,
        workers,
        asos: getData(asosReq),
        trainings: getData(trainingsReq)
      });

      // Filtra apenas atribuições cujo colaborador e catálogo continuam ativos (não deletados)
      const assignments = rawAssignments.filter((a: any) => {
        const worker = Array.isArray(a.worker) ? a.worker[0] : a.worker;
        const catalog = Array.isArray(a.catalog) ? a.catalog[0] : a.catalog;
        if (!worker || worker.deleted_at) return false;
        if (!catalog || catalog.deleted_at) return false;
        return true;
      });

      // Contagem real de trabalhadores
      const activeWorkers = workers.filter((w: any) => isActiveWorker(w.status)).length;

      const inactiveWorkers = workers.filter((w: any) => {
        const st = (w.status || '').toUpperCase();
        return st === 'INACTIVE' || st === 'INATIVO' || st === 'DISMISSED' || st === 'DESLIGADO' || st === 'VACATION' || st === 'FÉRIAS' || st === 'FERIAS';
      }).length;

      const totalWorkers = workers.length;

      // Estoque total real do catálogo ativo
      const totalStock = catalogs.reduce((acc: number, item: any) => acc + (Number(item.current_stock) || 0), 0);

      // EPIs em uso (atribuições ativas e não devolvidas de colaboradores/catálogos válidos)
      const activeAssignments = assignments.filter((a: any) => !a.returned_at);
      const inUse = activeAssignments.reduce((acc: number, a: any) => acc + (Number(a.quantity) || 1), 0);

      // Devolvidos este mês
      const returnedMonth = assignments.filter((a: any) => {
        if (!a.returned_at) return false;
        const d = new Date(a.returned_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).length;

      // Extraviados (LOST or EXTRAVIADO)
      const lostCount = assignments.filter((a: any) => {
        const cond = (a.condition_on_return || '').toUpperCase();
        return cond === 'LOST' || cond === 'EXTRAVIADO' || cond === 'PERDA';
      }).length;

      // Retenção média
      let totalDaysHeld = 0;
      activeAssignments.forEach((assignment: any) => {
        const assigned = new Date(assignment.assigned_at);
        const days = Math.floor((now.getTime() - assigned.getTime()) / (1000 * 60 * 60 * 24));
        totalDaysHeld += Math.max(0, days);
      });
      const avgRetentionDays = activeAssignments.length > 0 ? Math.round(totalDaysHeld / activeAssignments.length) : 0;

      // EPIs por Categoria (NR-6) — computado fidedignamente do estoque de catálogo
      const categoryMap: Record<string, number> = {
        'Proteção da Cabeça': 0,
        'Proteção dos Olhos': 0,
        'Proteção Auditiva': 0,
        'Proteção Respiratória': 0,
        'Proteção das Mãos': 0,
        'Proteção dos Pés': 0,
      };

      catalogs.forEach((item: any) => {
        const cat = item.category || 'Proteção da Cabeça';
        const normalized = 
          cat.includes('Cabeça') ? 'Proteção da Cabeça' :
          cat.includes('Olhos') || cat.includes('Face') ? 'Proteção dos Olhos' :
          cat.includes('Auditiva') || cat.includes('Ouvido') ? 'Proteção Auditiva' :
          cat.includes('Respiratória') ? 'Proteção Respiratória' :
          cat.includes('Mãos') || cat.includes('Membros Superiores') ? 'Proteção das Mãos' :
          cat.includes('Pés') || cat.includes('Membros Inferiores') ? 'Proteção dos Pés' :
          'Proteção da Cabeça';
        categoryMap[normalized] = (categoryMap[normalized] || 0) + (Number(item.current_stock) || 0);
      });

      const categoryDistribution: CategoryStat[] = [
        { category: 'Proteção da Cabeça', count: categoryMap['Proteção da Cabeça'], color: '#3b82f6', barColor: 'bg-blue-500' },
        { category: 'Proteção dos Olhos', count: categoryMap['Proteção dos Olhos'], color: '#10b981', barColor: 'bg-emerald-500' },
        { category: 'Proteção Auditiva', count: categoryMap['Proteção Auditiva'], color: '#f59e0b', barColor: 'bg-amber-500' },
        { category: 'Proteção Respiratória', count: categoryMap['Proteção Respiratória'], color: '#a855f7', barColor: 'bg-purple-500' },
        { category: 'Proteção das Mãos', count: categoryMap['Proteção das Mãos'], color: '#ef4444', barColor: 'bg-rose-500' },
        { category: 'Proteção dos Pés', count: categoryMap['Proteção dos Pés'], color: '#06b6d4', barColor: 'bg-cyan-500' }
      ];

      // Entregas por Mês (últimos 6 meses) — computado fidedignamente das movimentações reais
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthlyDeliveries: MonthlyDeliveryStat[] = [];
      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(currentYear, currentMonth - i, 1);
        const mIdx = targetDate.getMonth();
        const mYear = targetDate.getFullYear();
        const deliveriesInMonth = assignments.filter((a: any) => {
          const d = new Date(a.assigned_at);
          return d.getMonth() === mIdx && d.getFullYear() === mYear;
        }).length;

        monthlyDeliveries.push({
          month: monthNames[mIdx],
          count: deliveriesInMonth
        });
      }

      // Últimas Entregas reais formatadas (sem mock/fallback fake)
      const recentDeliveries: DashboardDeliveryItem[] = assignments.slice(0, 5).map((a: any, idx: number) => {
        const worker = Array.isArray(a.worker) ? a.worker[0] : a.worker;
        const catalog = Array.isArray(a.catalog) ? a.catalog[0] : a.catalog;
        const workerName = worker?.full_name || 'Colaborador';
        const epiName = catalog?.name || 'Equipamento de Proteção';
        const d = new Date(a.assigned_at);
        const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

        return {
          id: a.id,
          workerName,
          workerInitials: getInitials(workerName),
          avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
          epiName,
          date: dateFormatted,
          status: a.returned_at ? 'Devolvido' : 'Em uso'
        };
      });

      const stats: DashboardStats = {
        activeWorkers,
        inactiveWorkers,
        totalWorkers,
        inUse,
        totalStock,
        returnedMonth,
        lostCount,
        avgRetentionDays
      };

      // Estatísticas do Almoxarifado / KDS Fast Food
      const rawAlmoxOrders = getData(almoxOrdersReq);
      const pendingInQueue = rawAlmoxOrders.filter((o: any) => o.status === 'PREPARING').length;
      const deliveredOrders = rawAlmoxOrders.filter((o: any) => o.status === 'DELIVERED');

      const deliveredToday = deliveredOrders.filter((o: any) => {
        if (!o.delivered_at) return false;
        const d = new Date(o.delivered_at);
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      const ordersToday = deliveredToday.length;
      const itemsExpeditedToday = deliveredToday.reduce((acc: number, o: any) => {
        const itList = Array.isArray(o.items) ? o.items : [];
        return acc + itList.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0);
      }, 0);

      const targetForSla = deliveredToday.length > 0 ? deliveredToday : deliveredOrders.slice(0, 20);
      let avgSlaSec = 0;
      if (targetForSla.length > 0) {
        const totalSec = targetForSla.reduce((acc: number, o: any) => {
          const reqTime = new Date(o.requested_at).getTime();
          const delTime = new Date(o.delivered_at).getTime();
          const diff = Math.max(0, (delTime - reqTime) / 1000);
          return acc + diff;
        }, 0);
        avgSlaSec = Math.round(totalSec / targetForSla.length);
      }
      const avgSlaM = Math.floor(avgSlaSec / 60);
      const avgSlaS = Math.floor(avgSlaSec % 60);
      const avgSlaFormatted = `${avgSlaM}m ${String(avgSlaS).padStart(2, '0')}s`;

      const signedCount = deliveredOrders.filter((o: any) => !!o.signature_url).length;
      const signatureComplianceRate = deliveredOrders.length > 0
        ? Math.round((signedCount / deliveredOrders.length) * 100)
        : 100;

      const epiCounts = new Map<string, number>();
      deliveredOrders.forEach((o: any) => {
        const itList = Array.isArray(o.items) ? o.items : [];
        itList.forEach((it: any) => {
          const name = it.name || 'EPI';
          const qty = Number(it.quantity) || 1;
          epiCounts.set(name, (epiCounts.get(name) || 0) + qty);
        });
      });

      const sortedEpis = Array.from(epiCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      const topTotal = sortedEpis.reduce((sum, item) => sum + item.count, 0);
      const topEpis = sortedEpis.slice(0, 5).map(e => ({
        name: e.name,
        count: e.count,
        percentage: topTotal > 0 ? Math.round((e.count / topTotal) * 100) : 0
      }));

      const almoxarifadoStats: AlmoxarifadoDashboardStats = {
        ordersToday,
        itemsExpeditedToday,
        pendingInQueue,
        avgSlaFormatted,
        signatureComplianceRate,
        topEpis
      };

      return {
        stats,
        categoryDistribution,
        monthlyDeliveries,
        recentDeliveries,
        compliance,
        complianceUnavailable,
        almoxarifadoStats
      };
    }
  });
}
