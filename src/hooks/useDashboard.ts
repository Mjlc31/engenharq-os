import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

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

export interface DashboardAlert {
  id: string;
  type: 'CA_EXPIRATION' | 'CRITICAL_STOCK' | 'SCHEDULED_REPLACEMENT' | 'PENDING_ORDER' | 'ASO_EXPIRATION';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  badgeColor: string;
  bgLight: string;
}

export interface DashboardStats {
  activeWorkers: number;
  inactiveWorkers: number;
  totalWorkers: number;
  inUse: number;
  expiringEpis: number;
  criticalStock: number;
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
        allAssignmentsReq
      ] = await Promise.allSettled([
        supabase
          .from('epi_catalog')
          .select('id, name, category, current_stock, min_stock, ca_number, ca_validity, status')
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
          .limit(300)
      ]);

      const getData = (req: PromiseSettledResult<any>) => req.status === 'fulfilled' ? req.value.data || [] : [];

      const catalogs = getData(catalogsReq);
      const workers = getData(workersReq);
      const rawAssignments = getData(allAssignmentsReq);

      // Filtra apenas atribuições cujo colaborador e catálogo continuam ativos (não deletados)
      const assignments = rawAssignments.filter((a: any) => {
        const worker = Array.isArray(a.worker) ? a.worker[0] : a.worker;
        const catalog = Array.isArray(a.catalog) ? a.catalog[0] : a.catalog;
        if (!worker || worker.deleted_at) return false;
        if (!catalog || catalog.deleted_at) return false;
        return true;
      });

      // Contagem real de trabalhadores
      const activeWorkers = workers.filter((w: any) => {
        const st = (w.status || 'ACTIVE').toUpperCase();
        return st === 'ACTIVE' || st === 'ATIVO';
      }).length;

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

      // Estoque crítico (abaixo do mínimo definido pelo usuário no catálogo)
      // Se não houver itens cadastrados no catálogo, o estoque crítico é 0
      const criticalCatalogs = catalogs.length > 0 
        ? catalogs.filter((item: any) => {
            const min = item.min_stock ?? 10;
            return (item.current_stock ?? 0) <= min;
          })
        : [];
      const criticalStock = criticalCatalogs.length;

      // EPIs vencendo nos próximos 30 dias (baseado na data de validade do CA do catálogo ativo)
      const expiringCatalogs = catalogs.filter((item: any) => {
        if (!item.ca_validity) return false;
        const exp = new Date(item.ca_validity);
        const days = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return days <= 30 && days >= -365;
      });
      const expiringEpis = expiringCatalogs.length;

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

      // Alertas Dinâmicos baseados estritamente na realidade do sistema
      const alerts: DashboardAlert[] = [];

      if (expiringEpis > 0) {
        alerts.push({
          id: 'alert-ca',
          type: 'CA_EXPIRATION',
          severity: 'WARNING',
          title: `${expiringEpis} EPI(s) com CA vencendo`,
          description: 'Certificados de Aprovação (CA) expiram nos próximos 30 dias.',
          badgeColor: 'text-amber-500 border-amber-500/30',
          bgLight: 'bg-amber-500/10'
        });
      }

      if (criticalStock > 0) {
        const criticalNames = criticalCatalogs.slice(0, 3).map((c: any) => c.name).join(', ');
        alerts.push({
          id: 'alert-stock',
          type: 'CRITICAL_STOCK',
          severity: 'CRITICAL',
          title: `${criticalStock} item(ns) com estoque crítico`,
          description: `Abaixo da cota mínima: ${criticalNames}`,
          badgeColor: 'text-rose-500 border-rose-500/30',
          bgLight: 'bg-rose-500/10'
        });
      }

      // Se não houver nenhum alerta crítico, exibe status de conformidade
      if (alerts.length === 0) {
        alerts.push({
          id: 'alert-ok',
          type: 'SCHEDULED_REPLACEMENT',
          severity: 'INFO',
          title: 'Operação em conformidade',
          description: catalogs.length === 0 
            ? 'Inventário inicial aguardando novos cadastros de EPIs no almoxarifado.'
            : 'Nenhum estoque crítico ou vencimento iminente de CA detectado.',
          badgeColor: 'text-emerald-500 border-emerald-500/30',
          bgLight: 'bg-emerald-500/10'
        });
      }

      const stats: DashboardStats = {
        activeWorkers,
        inactiveWorkers,
        totalWorkers,
        inUse,
        expiringEpis,
        criticalStock,
        totalStock,
        returnedMonth,
        lostCount,
        avgRetentionDays
      };

      return {
        stats,
        categoryDistribution,
        monthlyDeliveries,
        recentDeliveries,
        alerts
      };
    }
  });
}
