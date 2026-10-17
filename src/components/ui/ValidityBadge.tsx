import React from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { ShieldCheck, AlertTriangle, Clock } from 'lucide-react';

interface ValidityBadgeProps {
  date?: string | null;
  className?: string;
  showIcon?: boolean;
}

export function ValidityBadge({ date, className = '', showIcon = true }: ValidityBadgeProps) {
  if (!date) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-hover text-muted ${className}`}>
        Sem data
      </span>
    );
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = parseISO(date);
    targetDate.setHours(0, 0, 0, 0);

    const diffDays = differenceInDays(targetDate, today);

    // 1. Vermelho: Vencido (< 0 dias)
    if (diffDays < 0) {
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 ${className}`}>
          {showIcon && <AlertTriangle className="w-3 h-3 shrink-0" />}
          Vencido ({Math.abs(diffDays)}d)
        </span>
      );
    }

    // 2. Amarelo: Alerta de até 30 dias (0 <= diff <= 30)
    if (diffDays <= 30) {
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 ${className}`}>
          {showIcon && <Clock className="w-3 h-3 shrink-0" />}
          Vence em {diffDays === 0 ? 'hoje' : `${diffDays}d`}
        </span>
      );
    }

    // 3. Verde: OK (> 30 dias)
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 ${className}`}>
        {showIcon && <ShieldCheck className="w-3 h-3 shrink-0" />}
        OK ({diffDays}d)
      </span>
    );
  } catch (e) {
    return (
      <span className="text-xs text-muted">Data inválida</span>
    );
  }
}
