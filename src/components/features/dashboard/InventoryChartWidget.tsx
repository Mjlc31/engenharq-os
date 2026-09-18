import React from 'react';
import { motion } from 'motion/react';
import { Package } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

interface InventoryChartWidgetProps {
  stats: any;
}

export function InventoryChartWidget({ stats }: InventoryChartWidgetProps) {
  const pieData = React.useMemo(() => [
    { name: 'Em Uso', value: stats.inUse, color: '#3b82f6' },
    { name: 'Manutenção', value: stats.maintenance, color: '#f59e0b' },
    { name: 'Estoque', value: Math.max(0, stats.totalEPIs - stats.inUse - stats.maintenance), color: '#27272a' },
  ], [stats]);

  return (
    <motion.div variants={itemVariants} className="bg-surface border border-border rounded-xl flex flex-col p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-primary" />
          <h3 className="text-xs uppercase font-bold tracking-widest text-muted">Status do Inventário</h3>
      </div>
      <div className="flex-1 min-h-[220px] md:min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
              animationDuration={1500}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip 
              contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
              itemStyle={{ color: '#fafafa' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-4 mt-2">
        {pieData.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[10px] text-muted font-medium uppercase tracking-wider">{item.name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
