// Pendências de conformidade. Mesma régua do ValidityBadge: vencido < 0 dias,
// vencendo de 0 a 30 dias. Usado pelo Dashboard e pelos filtros das telas de destino.
export const EXPIRING_WINDOW_DAYS = 30;

export type Validity = 'expired' | 'expiring' | 'ok';
export type StockLevel = 'out' | 'low' | 'ok';

type CatalogLike = { name: string; ca_validity?: string | null; current_stock?: number | null; min_stock?: number | null; minimum_stock?: number | null };
type Dated = { valid_until: string | null };

export interface ComplianceInput {
  today: Date;
  catalogs: CatalogLike[];
  workers: { id: string; status?: string | null }[];
  asos: ({ worker_id: string } & Dated)[];
  trainings: ({ worker_id: string; training_id: string } & Dated)[];
}

export interface ComplianceSummary {
  ca: { expired: number; expiring: number; names: string[] };
  aso: { expired: number; expiring: number; missing: number };
  trainings: { expired: number; expiring: number };
  stock: { out: number; low: number; names: string[] };
}

// 'YYYY-MM-DD' (ou ISO completo) comparado só pela data, no fuso local.
function daysUntil(date: string, today: Date): number {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((target - base) / 86_400_000);
}

export function classifyValidity(date: string | null | undefined, today: Date): Validity | null {
  if (!date) return null;
  const days = daysUntil(date, today);
  if (days < 0) return 'expired';
  if (days <= EXPIRING_WINDOW_DAYS) return 'expiring';
  return 'ok';
}

// Só o registro mais recente vale: um ASO antigo vencido não conta se já existe um novo.
export function latestBy<T extends Dated>(rows: T[], keyOf: (row: T) => string): T[] {
  const latest = new Map<string, T>();
  for (const row of rows) {
    if (!row.valid_until) continue;
    const key = keyOf(row);
    const current = latest.get(key);
    if (!current || row.valid_until > (current.valid_until as string)) latest.set(key, row);
  }
  return [...latest.values()];
}

// Sem mínimo cadastrado não existe "abaixo do mínimo": só esgotado conta.
export function stockLevel(item: CatalogLike): StockLevel {
  const qty = item.current_stock ?? 0;
  if (qty <= 0) return 'out';
  const min = item.minimum_stock ?? item.min_stock;
  if (min != null && qty <= min) return 'low';
  return 'ok';
}

export function isActiveWorker(status?: string | null): boolean {
  const st = (status || 'ACTIVE').toUpperCase();
  return st === 'ACTIVE' || st === 'ATIVO';
}

export function activeWorkerIds(workers: { id: string; status?: string | null }[]): Set<string> {
  return new Set(workers.filter(w => isActiveWorker(w.status)).map(w => w.id));
}

export function computeCompliance({ today, catalogs, workers, asos, trainings }: ComplianceInput): ComplianceSummary {
  const activeIds = activeWorkerIds(workers);

  const ca = { expired: 0, expiring: 0, names: [] as string[] };
  const stock = { out: 0, low: 0, names: [] as string[] };
  for (const item of catalogs) {
    const v = classifyValidity(item.ca_validity, today);
    if (v === 'expired' || v === 'expiring') {
      ca[v] += 1;
      ca.names.push(item.name);
    }
    const level = stockLevel(item);
    if (level !== 'ok') {
      stock[level] += 1;
      stock.names.push(item.name);
    }
  }

  const aso = { expired: 0, expiring: 0, missing: 0 };
  const latestAso = new Map(latestBy(asos.filter(a => activeIds.has(a.worker_id)), a => a.worker_id).map(a => [a.worker_id, a]));
  for (const id of activeIds) {
    const record = latestAso.get(id);
    if (!record) { aso.missing += 1; continue; }
    const v = classifyValidity(record.valid_until, today);
    if (v === 'expired' || v === 'expiring') aso[v] += 1;
  }

  const training = { expired: 0, expiring: 0 };
  for (const record of latestBy(trainings.filter(t => activeIds.has(t.worker_id)), t => `${t.worker_id}:${t.training_id}`)) {
    const v = classifyValidity(record.valid_until, today);
    if (v === 'expired' || v === 'expiring') training[v] += 1;
  }

  return { ca, aso, trainings: training, stock };
}
