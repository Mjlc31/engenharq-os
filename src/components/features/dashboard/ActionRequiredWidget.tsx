import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { ComplianceSummary } from '../../../lib/compliance';
import { Skeleton } from '../../ui/Skeleton';

interface ActionRequiredWidgetProps {
  compliance?: ComplianceSummary;
  unavailable?: { catalog: boolean; aso: boolean; trainings: boolean };
  loading: boolean;
}

type Tone = 'critical' | 'warning' | 'ok' | 'unknown';

interface Cell {
  title: string;
  href: string;
  critical: number;
  warning: number;
  parts: string[];
  okText: string;
  names?: string[];
  unavailable: boolean;
}

const TONES: Record<Tone, { icon: React.ElementType; color: string }> = {
  critical: { icon: AlertTriangle, color: 'text-red-400' },
  warning: { icon: Clock, color: 'text-amber-400' },
  ok: { icon: CheckCircle2, color: 'text-emerald-400' },
  unknown: { icon: AlertCircle, color: 'text-muted' },
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Abre a tela de destino já filtrada na situação mais grave presente.
const withSituacao = (path: string, situacao: string | false) => situacao ? `${path}?situacao=${situacao}` : path;

function buildCells(c: ComplianceSummary, u: NonNullable<ActionRequiredWidgetProps['unavailable']>): Cell[] {
  const expiry = (expired: number, expiring: number, extra: string[] = []) => [
    expired > 0 ? plural(expired, 'vencido', 'vencidos') : '',
    ...extra,
    expiring > 0 ? plural(expiring, 'vence em até 30 dias', 'vencem em até 30 dias') : '',
  ].filter(Boolean);

  return [
    {
      title: 'CA dos EPIs',
      href: withSituacao('/assets', c.ca.expired + c.ca.expiring > 0 && 'ca'),
      critical: c.ca.expired,
      warning: c.ca.expiring,
      parts: expiry(c.ca.expired, c.ca.expiring),
      okText: 'Nenhum CA vencido ou a vencer',
      names: c.ca.names,
      unavailable: u.catalog,
    },
    {
      title: 'ASO (NR-7)',
      href: withSituacao('/aso', c.aso.expired > 0 ? 'vencidos' : c.aso.missing > 0 ? 'sem-aso' : c.aso.expiring > 0 && 'vencendo'),
      critical: c.aso.expired + c.aso.missing,
      warning: c.aso.expiring,
      parts: expiry(c.aso.expired, c.aso.expiring, c.aso.missing > 0 ? [`${c.aso.missing} sem ASO`] : []),
      okText: 'Todos os ativos com ASO válido',
      unavailable: u.aso,
    },
    {
      title: 'Treinamentos (NR)',
      href: withSituacao('/trainings', c.trainings.expired > 0 ? 'vencidos' : c.trainings.expiring > 0 && 'vencendo'),
      critical: c.trainings.expired,
      warning: c.trainings.expiring,
      parts: expiry(c.trainings.expired, c.trainings.expiring),
      okText: 'Nenhum treinamento vencido ou a vencer',
      unavailable: u.trainings,
    },
    {
      title: 'Estoque de EPIs',
      href: withSituacao('/assets', c.stock.out + c.stock.low > 0 && 'estoque'),
      critical: c.stock.out,
      warning: c.stock.low,
      parts: [
        c.stock.out > 0 ? plural(c.stock.out, 'esgotado', 'esgotados') : '',
        c.stock.low > 0 ? `${c.stock.low} abaixo do mínimo` : '',
      ].filter(Boolean),
      okText: 'Todos os itens acima do mínimo',
      names: c.stock.names,
      unavailable: u.catalog,
    },
  ];
}

function toneOf(cell: Cell): Tone {
  if (cell.unavailable) return 'unknown';
  if (cell.critical > 0) return 'critical';
  if (cell.warning > 0) return 'warning';
  return 'ok';
}

export function ActionRequiredWidget({ compliance, unavailable, loading }: ActionRequiredWidgetProps) {
  const panelClass = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px bg-border border border-border rounded-2xl overflow-hidden';

  if (loading || !compliance || !unavailable) {
    return (
      <section aria-label="Exige ação" aria-busy="true">
        <h2 className="text-lg font-bold text-foreground mb-3">Exige ação</h2>
        <div className={panelClass}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-surface p-5 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const cells = buildCells(compliance, unavailable);
  const pending = cells.filter(c => !c.unavailable).reduce((acc, c) => acc + c.critical + c.warning, 0);
  const summary = pending > 0 ? plural(pending, 'pendência', 'pendências') : 'Tudo em dia';

  return (
    <section aria-labelledby="exige-acao-title">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 id="exige-acao-title" className="text-lg font-bold text-foreground">Exige ação</h2>
        <span className={cn('text-sm font-medium', pending > 0 ? 'text-foreground' : 'text-emerald-400')}>{summary}</span>
      </div>

      <div className={panelClass}>
        {cells.map(cell => {
          const tone = toneOf(cell);
          const { icon: Icon, color } = TONES[tone];
          const total = cell.critical + cell.warning;
          return (
            <Link
              key={cell.title}
              to={cell.href}
              className="group bg-surface p-5 flex flex-col gap-2 min-w-0 hover:bg-surface-hover transition-colors -outline-offset-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Icon className={cn('w-4 h-4 shrink-0', color)} aria-hidden="true" />
                  {cell.title}
                </span>
                <ChevronRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" aria-hidden="true" />
              </div>

              {tone === 'unknown' ? (
                <>
                  <div className="text-3xl font-bold leading-none text-muted">—</div>
                  <p className="text-xs text-muted">Não foi possível verificar agora.</p>
                </>
              ) : tone === 'ok' ? (
                <>
                  <div className="text-lg font-semibold leading-8 text-emerald-400">Em dia</div>
                  <p className="text-xs text-muted">{cell.okText}</p>
                </>
              ) : (
                <>
                  <div className={cn('text-3xl font-bold leading-none tabular-nums', color)}>{total}</div>
                  <p className="text-xs text-foreground">{cell.parts.join(' · ')}</p>
                  {cell.names && cell.names.length > 0 && (
                    <p className="text-xs text-muted truncate">
                      {cell.names.slice(0, 3).join(', ')}{cell.names.length > 3 && ` e mais ${cell.names.length - 3}`}
                    </p>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
