import React from 'react';
import { AlertTriangle, Clock, PackageCheck, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { DashboardAlert } from '../../../hooks/useDashboard';

interface DashboardAlertsWidgetProps {
  alerts: DashboardAlert[];
}

export function DashboardAlertsWidget({ alerts }: DashboardAlertsWidgetProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'CA_EXPIRATION':
        return Clock;
      case 'CRITICAL_STOCK':
        return AlertTriangle;
      case 'SCHEDULED_REPLACEMENT':
        return PackageCheck;
      case 'PENDING_ORDER':
      default:
        return ShoppingCart;
    }
  };

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <h3 className="text-base font-bold text-foreground">Alertas Operacionais</h3>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 flex items-start gap-3 text-emerald-500">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-foreground">Operação em Conformidade</div>
              <div className="text-[11px] text-muted">Nenhum estoque crítico ou vencimento de CA nos próximos 30 dias.</div>
            </div>
          </div>
        ) : (
          alerts.map((alert) => {
            const Icon = getIcon(alert.type);

            return (
              <div
                key={alert.id}
                className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${alert.bgLight} ${alert.badgeColor}`}
              >
                <div className="mt-0.5 shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-foreground">{alert.title}</div>
                  <div className="text-[11px] text-muted leading-relaxed">{alert.description}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
