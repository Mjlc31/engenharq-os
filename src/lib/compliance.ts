// Pendências de conformidade do Dashboard. Mesma régua do ValidityBadge:
// vencido < 0 dias, vencendo de 0 a 30 dias.
export const EXPIRING_WINDOW_DAYS = 30;
const DEFAULT_MIN_STOCK = 10;

export interface ComplianceInput {
  today: Date;
  catalogs: { name: string; ca_validity?: string | null; current_stock?: number | null; min_stock?: number | null; minimum_stock?: number | null }[];
  workers: { id: string; status?: string | null }[];
  asos: { worker_id: string; valid_until: string | null }[];
  trainings: { worker_id: string; training_id: string; valid_until: string | null }[];
}

export interface ComplianceSummary {
  ca: { expired: number; expiring: number; names: string[] };
  aso: { expired: number; expiring: number; missing: number };
  trainings: { expired: number; expiring: number };
  stock: { out: number; low: number; names: string[] };
}

type Validity = 'expired' | 'expiring' | 'ok';

// 'YYYY-MM-DD' (ou ISO completo) comparado só pela data, no fuso local.
function daysUntil(date: string, today: Date): number {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((target - base) / 86_400_000);
}

function classify(date: string, today: Date): Validity {
  const days = daysUntil(date, today);
  if (days < 0) return 'expired';
  if (days <= EXPIRING_WINDOW_DAYS) return 'expiring';
  return 'ok';
}

// Só o registro mais recente vale: um ASO antigo vencido não conta se já existe um novo.
function latestValidity<T extends { valid_until: string | null }>(rows: T[], keyOf: (row: T) => string) {
  const latest = new Map<string, string>();
  for (const row of rows) {
    if (!row.valid_until) continue;
    const key = keyOf(row);
    const current = latest.get(key);
    if (!current || row.valid_until > current) latest.set(key, row.valid_until);
  }
  return latest;
}

export function isActiveWorker(status?: string | null): boolean {
  const st = (status || 'ACTIVE').toUpperCase();
  return st === 'ACTIVE' || st === 'ATIVO';
}

export function computeCompliance({ today, catalogs, workers, asos, trainings }: ComplianceInput): ComplianceSummary {
  const activeIds = new Set(workers.filter(w => isActiveWorker(w.status)).map(w => w.id));

  const ca = { expired: 0, expiring: 0, names: [] as string[] };
  for (const item of catalogs) {
    if (!item.ca_validity) continue;
    const v = classify(item.ca_validity, today);
    if (v === 'ok') continue;
    ca[v] += 1;
    ca.names.push(item.name);
  }

  const aso = { expired: 0, expiring: 0, missing: 0 };
  const latestAso = latestValidity(asos.filter(a => activeIds.has(a.worker_id)), a => a.worker_id);
  for (const id of activeIds) {
    const validUntil = latestAso.get(id);
    if (!validUntil) { aso.missing += 1; continue; }
    const v = classify(validUntil, today);
    if (v !== 'ok') aso[v] += 1;
  }

  const training = { expired: 0, expiring: 0 };
  const latestTraining = latestValidity(trainings.filter(t => activeIds.has(t.worker_id)), t => `${t.worker_id}:${t.training_id}`);
  for (const validUntil of latestTraining.values()) {
    const v = classify(validUntil, today);
    if (v !== 'ok') training[v] += 1;
  }

  const stock = { out: 0, low: 0, names: [] as string[] };
  for (const item of catalogs) {
    const qty = item.current_stock ?? 0;
    const min = item.minimum_stock ?? item.min_stock ?? DEFAULT_MIN_STOCK;
    if (qty <= 0) stock.out += 1;
    else if (qty <= min) stock.low += 1;
    else continue;
    stock.names.push(item.name);
  }

  return { ca, aso, trainings: training, stock };
}
