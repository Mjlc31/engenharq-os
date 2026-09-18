import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../components/AuthProvider';

import { KpiGridWidget } from '../components/features/dashboard/KpiGridWidget';
import { InventoryChartWidget } from '../components/features/dashboard/InventoryChartWidget';
import { PredictiveAlertsWidget } from '../components/features/dashboard/PredictiveAlertsWidget';
import { RealTimeLogWidget } from '../components/features/dashboard/RealTimeLogWidget';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export function Dashboard() {
  const { data, isLoading: loading, error, refetch } = useDashboard();
  const { role } = useAuth();

  const stats = data?.stats || { totalEPIs: 0, inUse: 0, maintenance: 0, workers: 0 };
  const recentMovements = data?.recentMovements || [];
  const lifespanAlerts = data?.lifespanAlerts || [];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted">
        <AlertTriangle className="w-12 h-12 text-red-500 opacity-80" />
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

  const isSafetyEngineer = role === 'SAFETY_ENGINEER';

  return (
    <motion.div 
      data-testid="dashboard-container"
      className="flex flex-col gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {isSafetyEngineer ? (
        // Layout para SAFETY_ENGINEER: Foco em Alertas (Vencimentos de CA e Atrasos) primeiro
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 h-auto lg:h-[360px]">
            <PredictiveAlertsWidget lifespanAlerts={lifespanAlerts} loading={loading} />
            <RealTimeLogWidget recentMovements={recentMovements} loading={loading} />
          </div>
          <KpiGridWidget stats={stats} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 h-auto lg:h-[360px]">
            <InventoryChartWidget stats={stats} />
          </div>
        </>
      ) : (
        // Layout para ADMIN ou padrão: Foco em Métricas Financeiras/Globais primeiro
        <>
          <KpiGridWidget stats={stats} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 h-auto lg:h-[360px]">
             <InventoryChartWidget stats={stats} />
             <PredictiveAlertsWidget lifespanAlerts={lifespanAlerts} loading={loading} />
             <RealTimeLogWidget recentMovements={recentMovements} loading={loading} />
          </div>
        </>
      )}
    </motion.div>
  );
}
