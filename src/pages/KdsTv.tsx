import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Tv, WifiOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { KDS_TV_CALL_EVENT, KDS_TV_CHANNEL, formatElapsed, playKdsChime, publicName, slaLevel } from '../lib/kdsTv';
import type { AlmoxarifadoOrderItem, AlmoxarifadoOrderStatus } from '../types';

interface TvOrder {
  id: string;
  order_number: number;
  status: AlmoxarifadoOrderStatus;
  items: AlmoxarifadoOrderItem[];
  requested_at: string;
  delivered_at: string | null;
  worker: { full_name: string } | null;
}

const MAX_PER_COLUMN = 5;
const CALL_HIGHLIGHT_MS = 12_000;
const DELIVERED_WINDOW_MS = 60 * 60 * 1000;
// Rede de segurança para um telão ligado o dia todo: se o Realtime cair, a fila ainda se atualiza.
const SAFETY_RELOAD_MS = 30_000;

const SLA_COLOR = { ok: 'text-emerald-400', warning: 'text-amber-400', late: 'text-red-400' } as const;

const itemsSummary = (items: AlmoxarifadoOrderItem[]) =>
  items.map(i => `${i.quantity}× ${i.name}${i.size ? ` (${i.size})` : ''}`).join(' · ');

const clock = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// Telão do balcão: só leitura, sem ações, legível a 3–5 m. O console do almoxarife continua em /almoxarifado-kds.
export function KdsTv() {
  const [params] = useSearchParams();
  const siteId = params.get('obra');
  const { isOnline } = useOfflineQueue();

  const [orders, setOrders] = useState<TvOrder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [callingId, setCallingId] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);

  const loadOrders = useCallback(async () => {
    let query = supabase
      .from('almoxarifado_orders')
      .select('id, order_number, status, items, requested_at, delivered_at, worker:workers(full_name)')
      .is('deleted_at', null)
      .in('status', ['PREPARING', 'READY', 'DELIVERED'])
      .order('requested_at', { ascending: false })
      .limit(100);
    if (siteId) query = query.eq('site_id', siteId);
    const { data, error } = await query;
    setLoadFailed(!!error);
    if (!error) setOrders((data || []) as unknown as TvOrder[]);
    setLoaded(true);
  }, [siteId]);

  useEffect(() => {
    loadOrders();
    const timer = setInterval(loadOrders, SAFETY_RELOAD_MS);
    return () => clearInterval(timer);
  }, [loadOrders]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!siteId) { setSiteName(null); return; }
    supabase.from('construction_sites').select('name').eq('id', siteId).maybeSingle()
      .then(({ data }) => setSiteName(data?.name ?? null));
  }, [siteId]);

  // Pedidos novos (postgres_changes) e chamadas do console (broadcast).
  useEffect(() => {
    const changes = supabase
      .channel('kds-tv-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'almoxarifado_orders' }, payload => {
        if (payload.eventType === 'INSERT' && activated) playKdsChime();
        loadOrders();
      })
      .subscribe();
    const calls = supabase
      .channel(KDS_TV_CHANNEL)
      .on('broadcast', { event: KDS_TV_CALL_EVENT }, ({ payload }) => {
        setCallingId(payload?.orderId ?? null);
        if (activated) playKdsChime();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(changes);
      supabase.removeChannel(calls);
    };
  }, [activated, loadOrders]);

  useEffect(() => {
    if (!callingId) return;
    const timer = setTimeout(() => setCallingId(null), CALL_HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [callingId]);

  // O navegador só libera som (e tela cheia) depois de um toque na página.
  const activate = () => {
    setActivated(true);
    playKdsChime();
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  const queue = orders
    .filter(o => o.status === 'PREPARING' || o.status === 'READY')
    .sort((a, b) => a.requested_at.localeCompare(b.requested_at));
  const delivered = orders
    .filter(o => o.status === 'DELIVERED' && o.delivered_at && now - new Date(o.delivered_at).getTime() < DELIVERED_WINDOW_MS)
    .sort((a, b) => (b.delivered_at as string).localeCompare(a.delivered_at as string));
  const calling = orders.find(o => o.id === callingId) ?? null;
  const stale = !isOnline || loadFailed;

  return (
    // Margem de ~2,5% nas bordas: muitas TVs cortam a imagem (overscan).
    <div className="fixed inset-0 bg-background text-foreground flex flex-col gap-[2vh] px-[2.5vw] py-[3vh] overflow-hidden select-none">
      <header className="flex items-center justify-between gap-[2vw]">
        <div className="flex items-center gap-[1.2vw] min-w-0">
          <img src="/icon-192.png" alt="" className="h-[clamp(2.5rem,4.5vh,4.5rem)] w-auto shrink-0" />
          <h1 className="text-[clamp(1.75rem,3.4vh,3.25rem)] font-bold leading-tight truncate">
            Retirada de EPIs
            {siteName && <span className="text-muted font-semibold"> · {siteName}</span>}
          </h1>
        </div>
        <div className="flex items-center gap-[1.5vw] shrink-0">
          {stale && (
            <span className="flex items-center gap-2 text-amber-400 font-semibold text-[clamp(1rem,2vh,1.75rem)]">
              <WifiOff className="w-[1.2em] h-[1.2em]" aria-hidden="true" /> Sem conexão · fila pode estar desatualizada
            </span>
          )}
          <time className="text-[clamp(2.25rem,5vh,4.5rem)] font-bold tabular-nums leading-none">{clock(now)}</time>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {calling && (
          <motion.div
            key={calling.id}
            role="status"
            aria-live="assertive"
            initial={{ opacity: 0, y: -24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[1.5vh] bg-primary-dark text-white px-[2.5vw] py-[2vh] flex items-center gap-[3vw]"
          >
            <span className="text-[clamp(1.5rem,3vh,2.75rem)] font-semibold uppercase tracking-wide">Chamando</span>
            <span className="text-[clamp(4rem,11vh,9rem)] font-black tabular-nums leading-none">#{calling.order_number}</span>
            <span className="min-w-0">
              <span className="block text-[clamp(2rem,5vh,4.25rem)] font-bold leading-tight truncate">{publicName(calling.worker?.full_name)}</span>
              <span className="block text-[clamp(1.25rem,2.6vh,2.25rem)] font-medium text-white/90">Dirija-se ao balcão</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="grid grid-cols-2 gap-[2vw] flex-1 min-h-0">
        <Column title="Em separação" count={queue.length} empty={loaded ? 'Fila livre. Novos pedidos aparecem aqui.' : 'Carregando fila…'}>
          {queue.slice(0, MAX_PER_COLUMN).map(order => {
            const elapsed = (now - new Date(order.requested_at).getTime()) / 1000;
            const level = slaLevel(elapsed);
            return (
              <li
                key={order.id}
                className={cn(
                  'rounded-[1.5vh] bg-surface px-[1.6vw] py-[1.6vh] flex items-center gap-[1.6vw]',
                  order.id === callingId ? 'ring-4 ring-primary' : level === 'late' && 'ring-2 ring-red-500/60'
                )}
              >
                <span className="text-[clamp(2.5rem,6.5vh,5.5rem)] font-black tabular-nums leading-none shrink-0">#{order.order_number}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[clamp(1.5rem,3.6vh,3rem)] font-semibold leading-tight truncate">{publicName(order.worker?.full_name)}</p>
                  <p className="text-[clamp(1rem,2.2vh,1.75rem)] text-muted truncate">{itemsSummary(order.items)}</p>
                </div>
                <span className={cn('text-[clamp(1.5rem,3.6vh,3rem)] font-bold tabular-nums shrink-0', SLA_COLOR[level])}>
                  {formatElapsed(elapsed)}
                </span>
              </li>
            );
          })}
          {queue.length > MAX_PER_COLUMN && (
            <li className="text-center text-muted font-semibold text-[clamp(1.25rem,2.6vh,2.25rem)]">+{queue.length - MAX_PER_COLUMN} na fila</li>
          )}
        </Column>

        <Column title="Entregues agora" count={delivered.length} empty={loaded ? 'Nenhuma entrega na última hora.' : ''}>
          {delivered.slice(0, MAX_PER_COLUMN).map(order => (
            <li key={order.id} className="rounded-[1.5vh] bg-surface/60 px-[1.6vw] py-[1.6vh] flex items-center gap-[1.6vw]">
              <span className="text-[clamp(2.5rem,6.5vh,5.5rem)] font-black tabular-nums leading-none text-muted shrink-0">#{order.order_number}</span>
              <p className="min-w-0 flex-1 text-[clamp(1.5rem,3.6vh,3rem)] font-semibold leading-tight truncate">{publicName(order.worker?.full_name)}</p>
              <span className="flex items-center gap-2 text-emerald-400 font-bold text-[clamp(1.25rem,3vh,2.5rem)] tabular-nums shrink-0">
                <CheckCircle2 className="w-[1em] h-[1em]" aria-hidden="true" /> {clock(new Date(order.delivered_at as string).getTime())}
              </span>
            </li>
          ))}
        </Column>
      </main>

      {!activated && (
        <button
          type="button"
          onClick={activate}
          className="fixed inset-0 z-10 flex flex-col items-center justify-center gap-[2vh] bg-background/90 backdrop-blur-sm cursor-pointer"
        >
          <Tv className="w-[8vh] h-[8vh] text-primary" aria-hidden="true" />
          <span className="text-[clamp(2rem,5vh,4rem)] font-bold">Toque para iniciar o telão</span>
          <span className="text-[clamp(1.1rem,2.4vh,2rem)] text-muted">Ativa o som das chamadas e a tela cheia.</span>
        </button>
      )}
    </div>
  );
}

function Column({ title, count, empty, children }: { title: string; count: number; empty: string; children: React.ReactNode }) {
  const hasItems = React.Children.toArray(children).some(Boolean);
  return (
    <section className="flex flex-col min-h-0" aria-label={title}>
      <h2 className="flex items-baseline justify-between border-b border-border pb-[1.2vh] mb-[1.6vh] text-[clamp(1.5rem,3.2vh,2.75rem)] font-bold">
        {title}
        <span className="tabular-nums text-muted">{count}</span>
      </h2>
      {hasItems
        ? <ul className="flex flex-col gap-[1.4vh] overflow-hidden">{children}</ul>
        : <p className="text-muted text-[clamp(1.25rem,2.6vh,2.25rem)] mt-[4vh] text-center">{empty}</p>}
    </section>
  );
}
