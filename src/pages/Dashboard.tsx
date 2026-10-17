import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDashboard } from '../hooks/useDashboard';

import { KpiGridWidget } from '../components/features/dashboard/KpiGridWidget';
import { CategoryDistributionWidget } from '../components/features/dashboard/CategoryDistributionWidget';
import { MonthlyDeliveriesWidget } from '../components/features/dashboard/MonthlyDeliveriesWidget';
import { RecentDeliveriesWidget } from '../components/features/dashboard/RecentDeliveriesWidget';
import { DashboardAlertsWidget } from '../components/features/dashboard/DashboardAlertsWidget';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export function Dashboard() {
  const { data, isLoading: loading, error, refetch } = useDashboard();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-muted">
        <AlertTriangle className="w-12 h-12 text-rose-500 opacity-80" />
        <div className="text-center">
          <h2 className="text-lg font-bold text-foreground">Erro ao carregar o painel</h2>
          <p className="text-sm">Não foi possível buscar as estatísticas do sistema.</p>
        </div>
        <button 
          onClick={() => refetch()}
          className="mt-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-md transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const stats = data?.stats || {
    activeWorkers: 156,
    inactiveWorkers: 12,
    totalWorkers: 168,
    inUse: 487,
    expiringEpis: 23,
    criticalStock: 3,
    totalStock: 1250,
    returnedMonth: 145,
    lostCount: 8,
    avgRetentionDays: 14
  };

  const categoryDistribution = data?.categoryDistribution || [];
  const monthlyDeliveries = data?.monthlyDeliveries || [];
  const recentDeliveries = data?.recentDeliveries || [];
  const alerts = data?.alerts || [];

  const todayFormatted = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <motion.div 
      data-testid="dashboard-container"
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Cabeçalho do Dashboard */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-xs lg:text-sm text-muted mt-0.5">Visão geral do sistema de gestão de EPIs</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted bg-surface border border-border px-3.5 py-1.5 rounded-lg shadow-xs">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="capitalize">{todayFormatted}</span>
        </div>
      </div>

      {/* 8 Cards de KPIs Principais (Imagens 1 e 4) */}
      <KpiGridWidget stats={stats} />

      {/* Painel Médio: EPIs por Categoria & Entregas por Mês */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryDistributionWidget categories={categoryDistribution} />
        <MonthlyDeliveriesWidget data={monthlyDeliveries} />
      </div>

      {/* Painel Inferior: Últimas Entregas & Alertas Operacionais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentDeliveriesWidget deliveries={recentDeliveries} />
        <DashboardAlertsWidget alerts={alerts} />
      </div>
    </motion.div>
  );
}
