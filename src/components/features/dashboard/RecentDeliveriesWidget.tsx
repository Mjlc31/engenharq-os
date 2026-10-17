import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { DashboardDeliveryItem } from '../../../hooks/useDashboard';

interface RecentDeliveriesWidgetProps {
  deliveries: DashboardDeliveryItem[];
}

export function RecentDeliveriesWidget({ deliveries }: RecentDeliveriesWidgetProps) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-foreground">Últimas Entregas</h3>
        <Link
          to="/operations"
          className="text-xs text-primary hover:text-primary-dark font-medium flex items-center gap-1 transition-colors"
        >
          Ver todas <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-muted border-b border-border uppercase font-bold text-[10px] tracking-wider">
              <th className="pb-3 font-semibold">Funcionário</th>
              <th className="pb-3 font-semibold">EPI</th>
              <th className="pb-3 font-semibold">Data</th>
              <th className="pb-3 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {deliveries.map((item) => (
              <tr key={item.id} className="hover:bg-surface-hover/40 transition-colors">
                <td className="py-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${item.avatarColor}`}>
                      {item.workerInitials}
                    </div>
                    <span className="font-semibold text-foreground truncate max-w-[140px]">
                      {item.workerName}
                    </span>
                  </div>
                </td>
                <td className="py-3 text-muted">{item.epiName}</td>
                <td className="py-3 text-muted font-mono">{item.date}</td>
                <td className="py-3 text-right">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                      item.status === 'Em uso'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
