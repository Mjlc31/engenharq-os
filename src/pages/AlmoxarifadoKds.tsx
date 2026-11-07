import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { uploadSignature } from '../lib/storage';
import { AlmoxarifadoOrder, AlmoxarifadoOrderItem, ConstructionSite, Worker, EpiCatalog } from '../types';
import { useAuth } from '../components/AuthProvider';
import { useToast } from '../components/ui/Toast';
import SignatureCanvas from 'react-signature-canvas';
import { 
  Tv, ExternalLink, Volume2, VolumeX, Plus, CheckCircle2,
  Clock, HardHat, User, AlertCircle, RefreshCw, X, Search, 
  Bell, FileCheck, ArrowRight, ShieldCheck, Check, History,
  SlidersHorizontal, PackagePlus, Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AlmoxarifadoHistoryTab } from '../components/features/almoxarifado/AlmoxarifadoHistoryTab';
import { AlmoxarifadoKardexTab } from '../components/features/almoxarifado/AlmoxarifadoKardexTab';
import { AlmoxarifadoStockEntryModal } from '../components/features/almoxarifado/AlmoxarifadoStockEntryModal';
import { AlmoxarifadoCancelOrderModal } from '../components/features/almoxarifado/AlmoxarifadoCancelOrderModal';

import { KDS_TV_CALL_EVENT, KDS_TV_CHANNEL, playKdsChime } from '../lib/kdsTv';

export function AlmoxarifadoKds() {
  const queryClient = useQueryClient();
  const { user, role, customRole } = useAuth();
  const { toast } = useToast();

  const isAdmin = role === 'ADMIN' || role === 'SAFETY_ENGINEER' || role === 'SITE_MANAGER' || 
    (customRole && (customRole.toLowerCase().includes('gerente') || customRole.toLowerCase().includes('coordenador') || customRole.toLowerCase().includes('admin') || customRole.toLowerCase().includes('almoxarife') || customRole.toLowerCase().includes('estoquista')));

  // Tab State
  const [activeTab, setActiveTab] = useState<'tv' | 'history' | 'kardex'>('tv');

  // Orders State
  const [orders, setOrders] = useState<AlmoxarifadoOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('ALL');

  // Cancel/Delete Order Modal State
  const [orderToDelete, setOrderToDelete] = useState<AlmoxarifadoOrder | null>(null);

  // TV Controls
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [callingOrderId, setCallingOrderId] = useState<string | null>(null);

  // Delivery Modal State
  const [deliveryModalOrder, setDeliveryModalOrder] = useState<AlmoxarifadoOrder | null>(null);
  const [delivering, setDelivering] = useState(false);
  const signatureRef = useRef<SignatureCanvas | null>(null);

  // New Order Modal State
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [workersList, setWorkersList] = useState<Worker[]>([]);
  const [catalogList, setCatalogList] = useState<EpiCatalog[]>([]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [selectedItems, setSelectedItems] = useState<{ catalog: EpiCatalog; quantity: number; size: string }[]>([]);
  const [epiSearch, setEpiSearch] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Stock Entry Modal State
  const [isStockEntryModalOpen, setIsStockEntryModalOpen] = useState(false);

  // Preview Signature Modal
  const [previewSignatureUrl, setPreviewSignatureUrl] = useState<string | null>(null);

  // Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Sites & Catalog
  useEffect(() => {
    async function fetchInitialData() {
      const [sRes, cRes] = await Promise.all([
        supabase.from('construction_sites').select('*').is('deleted_at', null).order('name'),
        supabase.from('epi_catalog').select('*').is('deleted_at', null).order('name')
      ]);
      if (sRes.data) setSites(sRes.data as ConstructionSite[]);
      if (cRes.data) setCatalogList(cRes.data as EpiCatalog[]);
    }
    fetchInitialData();
  }, []);

  // Fetch Workers for quick order modal
  useEffect(() => {
    if (isNewOrderModalOpen && workersList.length === 0) {
      async function loadWorkers() {
        const { data } = await supabase
          .from('workers')
          .select('*')
          .is('deleted_at', null)
          .order('full_name')
          .limit(100);
        if (data) setWorkersList(data as Worker[]);
      }
      loadWorkers();
    }
  }, [isNewOrderModalOpen, workersList.length]);

  // Load Orders
  const loadOrders = useCallback(async () => {
    try {
      let query = supabase
        .from('almoxarifado_orders')
        .select('*, worker:workers(*), site:construction_sites(name)')
        .is('deleted_at', null)
        .order('requested_at', { ascending: false });

      if (selectedSiteId !== 'ALL') {
        query = query.eq('site_id', selectedSiteId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      setOrders((data || []) as unknown as AlmoxarifadoOrder[]);
    } catch (err: any) {
      console.error('Erro ao carregar pedidos KDS:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSiteId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Supabase Realtime Listener
  useEffect(() => {
    const channel = supabase
      .channel('kds-orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'almoxarifado_orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            if (soundEnabled) playKdsChime();
            loadOrders();
          } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            loadOrders();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled, loadOrders]);

  // Canal do telão (/kds/tv): o "Chamar" daqui destaca o pedido lá, em outra janela ou outro aparelho.
  const tvChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  useEffect(() => {
    const channel = supabase.channel(KDS_TV_CHANNEL).subscribe();
    tvChannelRef.current = channel;
    return () => {
      tvChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, []);

  const openTv = () => {
    const url = selectedSiteId === 'ALL' ? '/kds/tv' : `/kds/tv?obra=${selectedSiteId}`;
    window.open(url, 'engenharq-telao');
  };

  // Chamar Trabalhador (Highlight + Audio + telão)
  const handleCallOrder = (order: AlmoxarifadoOrder) => {
    setCallingOrderId(order.id);
    tvChannelRef.current?.send({ type: 'broadcast', event: KDS_TV_CALL_EVENT, payload: { orderId: order.id } });
    if (soundEnabled) {
      playKdsChime();
    }
    toast({
      type: 'info',
      title: `Chamando Pedido #${order.order_number}`,
      message: `${order.worker?.full_name || 'Colaborador'} chamado no painel do balcão.`
    });
    setTimeout(() => {
      setCallingOrderId(null);
    }, 4000);
  };

  // Confirmar Entrega (com Stored Procedure ACID completa)
  const handleConfirmDelivery = async () => {
    if (!deliveryModalOrder) return;
    // NR-6: sem assinatura do recebedor não há prova de entrega
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast({ type: 'error', title: 'Assinatura obrigatória', message: 'O colaborador precisa assinar antes de confirmar a entrega.' });
      return;
    }
    const signatureDataUrl = signatureRef.current.toDataURL('image/png');
    setDelivering(true);
    try {
      const signatureUrl = await uploadSignature(signatureDataUrl);
      const deliveredBy = user?.email || 'Almoxarife';

      // Entrega atômica: cautelas, baixa na obra e Kardex numa transação. Sem fallback no cliente:
      // se o banco recusar (ex.: saldo insuficiente), a comanda continua na fila e o erro aparece no toast.
      const { error: rpcError } = await (supabase.rpc as any)('complete_almoxarifado_order', {
        p_order_id: deliveryModalOrder.id,
        p_delivered_by: deliveredBy,
        p_signature_url: signatureUrl,
        p_selfie_url: undefined
      });
      if (rpcError) throw rpcError;

      if (soundEnabled) playKdsChime();
      toast({
        type: 'success',
        title: 'Entrega Concluída!',
        message: `Pedido #${deliveryModalOrder.order_number} entregue com sucesso.`
      });

      queryClient.invalidateQueries({ queryKey: ['epi-assets'] });
      queryClient.invalidateQueries({ queryKey: ['active-epi-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['epi-tracking-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });

      setDeliveryModalOrder(null);
      await loadOrders();
    } catch (err: any) {
      console.error('Erro ao finalizar entrega:', err);
      toast({
        type: 'error',
        title: 'Erro na Entrega',
        message: err.message || 'Falha ao confirmar entrega.'
      });
    } finally {
      setDelivering(false);
    }
  };

  // Criar Pedido Rápido no Balcão
  const handleCreateQuickOrder = async (deliverImmediately: boolean = false) => {
    if (!selectedWorker) {
      toast({ type: 'warning', title: 'Atenção', message: 'Selecione um colaborador.' });
      return;
    }
    if (selectedItems.length === 0) {
      toast({ type: 'warning', title: 'Atenção', message: 'Adicione pelo menos 1 EPI ao pedido.' });
      return;
    }

    setCreatingOrder(true);
    try {
      const itemsPayload: AlmoxarifadoOrderItem[] = selectedItems.map(si => ({
        catalog_id: si.catalog.id,
        name: si.catalog.name,
        quantity: si.quantity,
        size: si.size || null,
        ca_number: si.catalog.ca_number || null,
        unit_price: si.catalog.unit_price || 0
      }));

      const now = new Date().toISOString();
      const siteId = selectedWorker.current_site_id || (selectedSiteId !== 'ALL' ? selectedSiteId : null);

      const { data, error } = await supabase
        .from('almoxarifado_orders')
        .insert({
          worker_id: selectedWorker.id,
          site_id: siteId,
          status: 'PREPARING',
          items: itemsPayload as any,
          requested_at: now
        })
        .select('*, worker:workers(*), site:construction_sites(name)')
        .single();

      if (error) throw error;

      if (soundEnabled) playKdsChime();
      toast({
        type: 'success',
        title: 'Pedido Registrado',
        message: `Pedido #${data.order_number} adicionado à fila do Almoxarifado!`
      });

      setIsNewOrderModalOpen(false);
      setSelectedWorker(null);
      setSelectedItems([]);
      setWorkerSearch('');
      setEpiSearch('');
      await loadOrders();

      if (deliverImmediately && data) {
        setDeliveryModalOrder(data as unknown as AlmoxarifadoOrder);
      }
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Erro ao Criar Pedido',
        message: err.message || 'Falha ao salvar no banco.'
      });
    } finally {
      setCreatingOrder(false);
    }
  };

  // Cancelar Pedido
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Deseja realmente cancelar esta solicitação da fila?')) return;
    try {
      // Cancelamento só pela RPC (registra autor e motivo); o banco recusa update direto para CANCELLED
      const { error } = await supabase.rpc('cancel_or_delete_almoxarifado_order', {
        p_order_id: orderId,
        p_cancelled_by: user?.email || 'Almoxarife',
        p_reason: 'Cancelado na fila do KDS'
      });
      if (error) throw error;

      toast({ type: 'info', title: 'Pedido Cancelado', message: 'A solicitação foi removida da fila.' });
      await loadOrders();
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message });
    }
  };

  // Filtragem dos pedidos para o KDS TV
  const preparingOrders = orders
    .filter(o => o.status === 'PREPARING' || o.status === 'READY')
    .sort((a, b) => new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime());

  const deliveredOrders = orders
    .filter(o => o.status === 'DELIVERED')
    .sort((a, b) => new Date(b.delivered_at || b.updated_at).getTime() - new Date(a.delivered_at || a.updated_at).getTime());

  // Métricas do turno
  const todayDeliveredCount = deliveredOrders.filter(o => {
    if (!o.delivered_at) return false;
    const d = new Date(o.delivered_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  // Cálculo de SLA (Tempo decorrido)
  const getElapsedTime = (requestedAt: string) => {
    const diffSec = Math.max(0, Math.floor((currentTime.getTime() - new Date(requestedAt).getTime()) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return {
      formatted: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
      totalSec: diffSec
    };
  };

  // Formatador de Hora (HH:mm)
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Workers filtrados no modal
  const filteredWorkers = workersList.filter(w => {
    if (!workerSearch.trim()) return true;
    const q = workerSearch.toLowerCase();
    return (
      w.full_name.toLowerCase().includes(q) ||
      w.registration_number.toLowerCase().includes(q) ||
      (w.cpf && w.cpf.includes(q))
    );
  });

  // EPIs filtrados no modal
  const filteredCatalog = catalogList.filter(c => {
    if (!epiSearch.trim()) return true;
    const q = epiSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      (c.ca_number && c.ca_number.includes(q))
    );
  });

  return (
    <div className={cn(
      "flex flex-col flex-1 bg-background text-foreground font-sans transition-all selection:bg-primary/30 selection:text-foreground space-y-4"
    )}>
      
      {/* Top Header / TV Control Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4 shrink-0 bg-surface/40 p-4 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 border border-primary/25 text-primary shadow-xs shadow-primary/10">
            <Tv className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground uppercase">
                Painel Almoxarifado <span className="text-primary">EngenharQ</span>
              </h1>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Ao Vivo
              </span>
            </div>
            <p className="text-xs text-muted font-mono">
              Central de Atendimento, Comandas Rápidas & Histórico Transacional
            </p>
          </div>
        </div>

        {/* Center: Live Clock & Obra Selector */}
        <div className="flex flex-wrap items-center gap-3 min-w-0 max-w-full">
          <div className="bg-surface border border-border rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-xs min-w-0 max-w-full">
            <span className="text-xs text-muted font-medium">Obra:</span>
            <select aria-label="Filtrar por obra"
              value={selectedSiteId}
              onChange={e => setSelectedSiteId(e.target.value)}
              className="min-w-0 max-w-full bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-surface text-foreground">Todas as Obras (Geral)</option>
              {sites.map(s => (
                <option key={s.id} value={s.id} className="bg-surface text-foreground">{s.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-surface border border-border rounded-xl px-4 py-1.5 text-center font-mono shadow-xs">
            <div className="text-xl md:text-2xl font-bold text-primary tracking-wider">
              {currentTime.toLocaleTimeString('pt-BR')}
            </div>
            <div className="text-[11px] text-muted uppercase tracking-widest font-sans">
              {currentTime.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Subir Estoque / Entrada NF */}
          <button
            onClick={() => setIsStockEntryModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-hover text-foreground border border-border font-semibold text-xs transition-all active:scale-95 cursor-pointer shadow-2xs"
            title="Registrar recebimento de carga / NF na obra"
          >
            <PackagePlus className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">+ Subir Estoque</span>
          </button>

          {/* Nova Retirada no Balcão */}
          <button
            onClick={() => setIsNewOrderModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-dark hover:bg-primary-darker text-white font-semibold text-xs md:text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Nova Solicitação</span>
          </button>

          {/* Som / Bip */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              "p-2.5 rounded-xl border transition-all cursor-pointer",
              soundEnabled ? "bg-primary/10 border-primary/30 text-primary" : "bg-surface border-border text-muted hover:text-foreground"
            )}
            title={soundEnabled ? "Som Ativado (Clique p/ silenciar)" : "Som Silenciado (Clique p/ ativar)"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Telão do balcão: página só de leitura em janela própria, para arrastar até a TV */}
          <button
            onClick={openTv}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-hover transition-all cursor-pointer text-xs font-semibold"
            title="Abre o telão da fila em uma nova janela (arraste para a TV)"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            <span>Abrir telão</span>
          </button>

          {/* Recarregar */}
          <button
            onClick={loadOrders}
            className="p-2.5 rounded-xl bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-hover transition-all cursor-pointer"
            title="Atualizar Dados"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </header>

      {/* Tabs Navigation */}
        <div className="flex gap-2 border-b border-border overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('tv')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 font-semibold text-xs uppercase tracking-wider transition-all relative cursor-pointer",
              activeTab === 'tv' ? "text-primary" : "text-muted hover:text-foreground"
            )}
          >
            <Tv className="w-4 h-4" />
            <span>1. Fila do Balcão (Ao Vivo)</span>
            {activeTab === 'tv' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-dark" />}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 font-semibold text-xs uppercase tracking-wider transition-all relative cursor-pointer",
              activeTab === 'history' ? "text-primary" : "text-muted hover:text-foreground"
            )}
          >
            <History className="w-4 h-4" />
            <span>2. Histórico com Data e Hora</span>
            {orders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[11px] font-mono bg-surface border border-border text-muted">
                {orders.length}
              </span>
            )}
            {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-dark" />}
          </button>

          <button
            onClick={() => setActiveTab('kardex')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 font-semibold text-xs uppercase tracking-wider transition-all relative cursor-pointer",
              activeTab === 'kardex' ? "text-primary" : "text-muted hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>3. Extrato & Movimentações de Estoque</span>
            {activeTab === 'kardex' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-dark" />}
          </button>
        </div>

      {/* ================= TAB 1: FILA DO BALCÃO (AO VIVO) ================= */}
      {activeTab === 'tv' && (
        <div className="flex flex-col flex-1 min-h-0 space-y-4">
          {/* Stats Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center justify-between hover:border-primary/40 transition-all shadow-xs">
              <div className="space-y-0.5">
                <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">Em Fila / Separação</p>
                <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{preparingOrders.length}</p>
                <p className="text-[11px] text-muted">{preparingOrders.length > 0 ? `${preparingOrders.length} aguardando separação` : 'Fila zerada'}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 text-primary border border-primary/20">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center justify-between hover:border-emerald-500/40 transition-all shadow-xs">
              <div className="space-y-0.5">
                <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">Entregues Hoje</p>
                <p className="text-2xl font-bold font-mono tracking-tight text-emerald-400">{todayDeliveredCount}</p>
                <p className="text-[11px] text-muted">Expedidos no turno</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center justify-between hover:border-blue-500/40 transition-all shadow-xs">
              <div className="space-y-0.5">
                <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">Total de Histórico</p>
                <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{orders.length}</p>
                <p className="text-[11px] text-muted">Movimentações gerais</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <HardHat className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center justify-between hover:border-emerald-500/40 transition-all shadow-xs">
              <div className="space-y-0.5">
                <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">Status Balcão</p>
                <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-1 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  OPERANDO
                </p>
                <p className="text-[11px] text-muted">Sincronização ativa</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Main Split-Screen Display (Fast-Food KDS) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-[500px]">
            
            {/* ================= COLUNA ESQUERDA: EM SEPARAÇÃO / FILA ================= */}
            <section className="flex flex-col bg-surface/50 border border-primary/30 rounded-2xl p-4 overflow-hidden shadow-lg">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-dark opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-dark" />
                  </span>
                  <h2 className="text-base md:text-lg font-bold uppercase tracking-tight text-foreground">
                    1. Em Separação / Fila
                  </h2>
                </div>
                <span className="px-2.5 py-1 text-xs font-mono font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
                  {preparingOrders.length} aguardando
                </span>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                {preparingOrders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted">
                    <div className="w-14 h-14 rounded-2xl bg-surface flex items-center justify-center mb-3 border border-border shadow-xs">
                      <CheckCircle2 className="w-7 h-7 text-muted" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">Nenhum Pedido na Fila</h3>
                    <p className="text-xs text-muted mt-1 max-w-xs">
                      O balcão de atendimento está livre. Novos pedidos registrados aparecerão aqui em tempo real.
                    </p>
                    <button
                      onClick={() => setIsNewOrderModalOpen(true)}
                      className="mt-4 px-4 py-2 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/25 rounded-xl transition-colors cursor-pointer"
                    >
                      + Lançar Pedido Balcão
                    </button>
                  </div>
                ) : (
                  preparingOrders.map(order => {
                    const elapsed = getElapsedTime(order.requested_at);
                    const isUrgent = elapsed.totalSec > 300; // > 5 min
                    const isModerate = elapsed.totalSec > 180 && elapsed.totalSec <= 300; // 3 a 5 min
                    const isCalling = callingOrderId === order.id;

                    return (
                      <div
                        key={order.id}
                        className={cn(
                          "rounded-xl border p-4 bg-surface transition-all duration-200 relative shadow-sm",
                          isCalling
                            ? "border-primary bg-primary/10 ring-4 ring-primary/40 scale-[1.01]"
                            : isUrgent
                              ? "border-red-500/50 bg-red-950/15"
                              : isModerate
                                ? "border-amber-500/50 bg-amber-950/15"
                                : "border-border hover:border-primary/40"
                        )}
                      >
                        {/* Header do Card */}
                        <div className="flex items-center justify-between gap-2 border-b border-border/80 pb-2 mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold font-mono text-foreground tracking-tight">
                              #{order.order_number}
                            </span>
                            <span className="text-xs text-muted flex items-center gap-1 font-mono">
                              <Clock className="w-3.5 h-3.5" />
                              {formatTime(order.requested_at)}
                            </span>
                          </div>

                          {/* Tempo Decorrido (SLA) */}
                          <div className={cn(
                            "px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border flex items-center gap-1.5",
                            isUrgent
                              ? "bg-red-500/15 text-red-400 border-red-500/30 animate-pulse"
                              : isModerate
                                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          )}>
                            <span>⏱️</span>
                            <span>{elapsed.formatted}</span>
                          </div>
                        </div>

                        {/* Colaborador */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-surface-hover border border-border flex items-center justify-center shrink-0 overflow-hidden">
                            {order.worker?.reference_photo_url ? (
                              <img 
                                src={order.worker.reference_photo_url} 
                                alt={order.worker.full_name} 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <User className="w-5 h-5 text-muted" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-foreground truncate leading-tight">
                              {order.worker?.full_name || 'Colaborador não identificado'}
                            </h4>
                            <p className="text-xs text-muted truncate">
                              {order.worker?.current_role || 'Função não informada'} • Matrícula: <strong className="text-foreground font-mono">{order.worker?.registration_number || 'S/N'}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Lista de Itens */}
                        <div className="bg-background/80 rounded-xl p-2.5 border border-border/80 mb-3 space-y-1.5">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block">
                            Itens Solicitados ({order.items.length}):
                          </span>
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 truncate pr-2">
                                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono font-bold text-[11px] shrink-0">
                                  {item.quantity}x
                                </span>
                                <span className="text-foreground font-medium truncate">
                                  {item.name}
                                </span>
                                {item.size && (
                                  <span className="text-[11px] text-muted font-mono">
                                    ({item.size})
                                  </span>
                                )}
                              </div>
                              {item.ca_number && (
                                <span className="text-[11px] text-muted font-mono shrink-0">
                                  CA: {item.ca_number}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Botões de Ação do Operador */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleCallOrder(order)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-surface hover:bg-surface-hover text-foreground font-semibold text-xs border border-border transition-all active:scale-98 cursor-pointer shadow-2xs"
                            title="Chamar no telão com alerta sonoro"
                          >
                            <Bell className="w-3.5 h-3.5 text-primary" />
                            <span>Chamar</span>
                          </button>

                          <button
                            onClick={() => setDeliveryModalOrder(order)}
                            className="flex-2 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-98 cursor-pointer"
                          >
                            <Check className="w-4 h-4 stroke-[2.5]" />
                            <span>ENTREGAR AGORA</span>
                          </button>

                          <button aria-label="Cancelar solicitação"
                            onClick={() => handleCancelOrder(order.id)}
                            className="p-2 rounded-xl bg-surface hover:bg-red-500/15 hover:text-red-400 text-muted border border-border transition-colors cursor-pointer"
                            title="Cancelar Solicitação"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* ================= COLUNA DIREITA: ENTREGUES RECENTEMENTE ================= */}
            <section className="flex flex-col bg-surface/50 border border-emerald-500/30 rounded-2xl p-4 overflow-hidden shadow-lg">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base md:text-lg font-bold uppercase tracking-tight text-foreground">
                    2. Entregues Recentemente / Prontos
                  </h2>
                </div>
                <span className="px-2.5 py-1 text-xs font-mono font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {deliveredOrders.length} entregas
                </span>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                {deliveredOrders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted">
                    <div className="w-14 h-14 rounded-2xl bg-surface flex items-center justify-center mb-3 border border-border shadow-xs">
                      <Clock className="w-7 h-7 text-muted" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">Nenhuma Entrega Registrada</h3>
                    <p className="text-xs text-muted mt-1 max-w-xs">
                      Assim que os EPIs forem conferidos e entregues, os comprovantes e horários de saída aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  deliveredOrders.slice(0, 15).map(order => (
                    <div
                      key={order.id}
                      className="rounded-xl border border-border bg-surface p-4 transition-all hover:border-border/80 shadow-xs"
                    >
                      {/* Header Card Entregue */}
                      <div className="flex items-center justify-between gap-2 border-b border-border/80 pb-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold font-mono text-foreground">
                            #{order.order_number}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1 font-mono">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            Entregue às {formatTime(order.delivered_at)}
                          </span>
                        </div>

                        <span className="text-[11px] text-muted font-mono">
                          {order.delivered_at ? new Date(order.delivered_at).toLocaleDateString('pt-BR') : ''}
                        </span>
                      </div>

                      {/* Colaborador que retirou */}
                      <div className="flex items-center justify-between gap-3 mb-2.5">
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-foreground truncate">
                            {order.worker?.full_name || 'Colaborador'}
                          </h4>
                          <p className="text-xs text-muted truncate">
                            {order.worker?.current_role || 'Função'} • Matrícula: <span className="font-mono text-foreground">{order.worker?.registration_number}</span>
                          </p>
                        </div>

                        {/* Comprovante / Assinatura Badge & Estorno */}
                        <div className="flex items-center gap-1.5">
                          {order.signature_url ? (
                            <button
                              onClick={() => setPreviewSignatureUrl(order.signature_url!)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-hover hover:bg-border border border-border text-emerald-400 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                              title="Clique para visualizar assinatura"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>Assinado [Ver]</span>
                            </button>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-surface-hover border border-border text-muted text-[11px] font-mono">
                              Confirmado
                            </span>
                          )}

                          {isAdmin && (
                            <button
                              onClick={() => setOrderToDelete(order)}
                              className="p-1 rounded-lg bg-surface-hover hover:bg-red-500/15 text-muted hover:text-red-400 border border-border hover:border-red-500/30 transition-colors cursor-pointer"
                              title="Estornar / Excluir Entrega"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Resumo dos Itens Entregues */}
                      <div className="bg-background/80 rounded-xl p-2.5 text-xs border border-border/80">
                        <div className="flex flex-wrap gap-2">
                          {order.items.map((it, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 bg-surface border border-border px-2 py-0.5 rounded-lg text-[11px] text-foreground">
                              <strong className="text-emerald-400 font-mono">{it.quantity}x</strong> {it.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

          </div>
        </div>
      )}

      {/* ================= TAB 2: HISTÓRICO DETALHADO (DATA E HORA) ================= */}
      {activeTab === 'history' && (
        <AlmoxarifadoHistoryTab
          orders={orders}
          sites={sites}
          selectedSiteId={selectedSiteId}
          onSelectSiteId={setSelectedSiteId}
          loading={loading}
          onRefresh={loadOrders}
        />
      )}

      {/* ================= TAB 3: EXTRATO & MOVIMENTAÇÕES DE ESTOQUE ================= */}
      {activeTab === 'kardex' && (
        <AlmoxarifadoKardexTab
          sites={sites}
          selectedSiteId={selectedSiteId}
          onSelectSiteId={setSelectedSiteId}
        />
      )}

      {/* ================= MODAL: ENTREGAR & COLETAR ASSINATURA ================= */}
      {deliveryModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 text-foreground">
            <button aria-label="Fechar"
              onClick={() => setDeliveryModalOrder(null)}
              className="absolute top-4 right-4 text-muted hover:text-foreground p-1.5 rounded-xl bg-surface-hover transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Confirmar Entrega • Pedido #{deliveryModalOrder.order_number}
                </h3>
                <p className="text-xs text-muted">
                  Colha a assinatura digital do colaborador no balcão para comprovação.
                </p>
              </div>
            </div>

            {/* Dados do Trabalhador e Itens */}
            <div className="bg-background rounded-xl p-3.5 border border-border mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Colaborador:</span>
                <span className="font-bold text-foreground">{deliveryModalOrder.worker?.full_name}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Matrícula:</span>
                <span className="font-mono text-foreground">{deliveryModalOrder.worker?.registration_number}</span>
              </div>
              <div className="border-t border-border/80 pt-2 text-xs">
                <span className="text-muted block mb-1">Itens entregues:</span>
                <div className="flex flex-wrap gap-1.5">
                  {deliveryModalOrder.items.map((it, idx) => (
                    <span key={idx} className="bg-surface border border-border px-2 py-0.5 rounded-lg text-[11px] text-foreground">
                      {it.quantity}x {it.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Canvas de Assinatura */}
            <div className="space-y-1.5 mb-5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Assinatura do Recebedor (Touch / Mouse):
                </label>
                <button
                  type="button"
                  onClick={() => signatureRef.current?.clear()}
                  className="text-xs text-primary hover:underline cursor-pointer font-medium"
                >
                  Limpar Traço
                </button>
              </div>
              <div className="border-2 border-dashed border-border rounded-xl overflow-hidden bg-white shadow-inner">
                <SignatureCanvas
                  ref={signatureRef}
                  penColor="#000000"
                  canvasProps={{
                    className: "w-full h-36 cursor-crosshair"
                  }}
                />
              </div>
              <p className="text-[11px] text-muted text-center">
                O colaborador deve assinar na área acima confirmando o recebimento dos EPIs em perfeitas condições.
              </p>
            </div>

            {/* Botões do Modal */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeliveryModalOrder(null)}
                className="flex-1 py-2.5 rounded-xl bg-surface-hover hover:bg-border text-foreground font-semibold text-sm transition-colors cursor-pointer border border-border"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={delivering}
                onClick={handleConfirmDelivery}
                className="flex-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {delivering ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processando Baixa...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Confirmar & Baixar Estoque</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: NOVA SOLICITAÇÃO RÁPIDA (BALCÃO) ================= */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 text-foreground">
            <button aria-label="Fechar"
              onClick={() => setIsNewOrderModalOpen(false)}
              className="absolute top-4 right-4 text-muted hover:text-foreground p-1.5 rounded-xl bg-surface-hover transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Nova Solicitação • Balcão Almoxarifado</h3>
                <p className="text-xs text-muted">
                  Cadastre uma comanda rápida para separação na TV ou entrega imediata.
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* 1. Seleção de Trabalhador */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                  1. Selecione o Colaborador:
                </label>
                {selectedWorker ? (
                  <div className="flex items-center justify-between p-3.5 bg-primary/5 rounded-xl border border-primary/30">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                        {selectedWorker.full_name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{selectedWorker.full_name}</p>
                        <p className="text-xs text-muted">
                          {selectedWorker.current_role || 'Função'} • Matrícula: <strong className="text-foreground font-mono">{selectedWorker.registration_number}</strong>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedWorker(null)}
                      className="text-xs text-primary hover:underline cursor-pointer font-medium"
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative mb-2">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-muted" />
                      <input aria-label="Buscar colaborador por nome, matrícula ou CPF"
                        type="text"
                        placeholder="Buscar colaborador por nome, matrícula ou CPF..."
                        value={workerSearch}
                        onChange={e => setWorkerSearch(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                      />
                    </div>
                    <div className="max-h-36 overflow-y-auto border border-border rounded-xl divide-y divide-border bg-background">
                      {filteredWorkers.slice(0, 15).map(w => (
                        <div
                          key={w.id}
                          onClick={() => {
                            setSelectedWorker(w);
                            setWorkerSearch('');
                          }}
                          className="p-2.5 hover:bg-surface-hover cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-foreground block">{w.full_name}</span>
                            <span className="text-muted text-[11px]">{w.current_role} • Mat: {w.registration_number}</span>
                          </div>
                          <span className="text-primary font-semibold">Selecionar →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Seleção de EPIs */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                  2. Adicionar EPIs ao Pedido:
                </label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted" />
                  <input aria-label="Filtrar catálogo de EPIs"
                    type="text"
                    placeholder="Filtrar catálogo de EPIs..."
                    value={epiSearch}
                    onChange={e => setEpiSearch(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto border border-border rounded-xl divide-y divide-border bg-background">
                  {filteredCatalog.slice(0, 15).map(epi => (
                    <div
                      key={epi.id}
                      className="p-2.5 flex items-center justify-between text-xs hover:bg-surface-hover transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-semibold text-foreground block truncate">{epi.name}</span>
                        <span className="text-muted text-[11px]">CA: {epi.ca_number || 'S/N'} • Categoria: {epi.category}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItems(prev => {
                            const exists = prev.find(p => p.catalog.id === epi.id);
                            if (exists) {
                              return prev.map(p => p.catalog.id === epi.id ? { ...p, quantity: p.quantity + 1 } : p);
                            }
                            return [...prev, { catalog: epi, quantity: 1, size: '' }];
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary-dark hover:text-white text-primary font-semibold border border-primary/20 transition-all text-xs shrink-0 cursor-pointer"
                      >
                        + Adicionar
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Itens Selecionados no Carrinho */}
              {selectedItems.length > 0 && (
                <div className="bg-background border border-border rounded-xl p-3.5 space-y-2">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider block">
                    Itens no Pedido ({selectedItems.length}):
                  </span>
                  {selectedItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-surface border border-border text-xs">
                      <div className="truncate flex-1">
                        <span className="font-medium text-foreground">{item.catalog.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <input aria-label="Tamanho"
                          type="text"
                          placeholder="Tam (Ex: G, 42)"
                          value={item.size}
                          onChange={e => {
                            const val = e.target.value;
                            setSelectedItems(prev => prev.map((p, i) => i === idx ? { ...p, size: val } : p));
                          }}
                          className="w-20 bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                        />
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedItems(prev => prev.map((p, i) => i === idx ? { ...p, quantity: Math.max(1, p.quantity - 1) } : p));
                            }}
                            className="w-6 h-6 rounded bg-surface-hover text-muted hover:text-foreground flex items-center justify-center font-bold"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-mono font-bold text-foreground">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedItems(prev => prev.map((p, i) => i === idx ? { ...p, quantity: p.quantity + 1 } : p));
                            }}
                            className="w-6 h-6 rounded bg-surface-hover text-muted hover:text-foreground flex items-center justify-center font-bold"
                          >
                            +
                          </button>
                        </div>
                        <button aria-label="Remover item"
                          type="button"
                          onClick={() => setSelectedItems(prev => prev.filter((_, i) => i !== idx))}
                          className="text-muted hover:text-red-400 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ações do Modal */}
            <div className="flex items-center gap-3 pt-4 border-t border-border shrink-0">
              <button
                type="button"
                onClick={() => setIsNewOrderModalOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-surface-hover hover:bg-border text-foreground font-semibold text-sm transition-colors cursor-pointer border border-border"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={creatingOrder || !selectedWorker || selectedItems.length === 0}
                onClick={() => handleCreateQuickOrder(false)}
                className="flex-1 py-2.5 rounded-xl bg-surface hover:bg-surface-hover text-foreground border border-border font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                Colocar na Fila (Separar)
              </button>
              <button
                type="button"
                disabled={creatingOrder || !selectedWorker || selectedItems.length === 0}
                onClick={() => handleCreateQuickOrder(true)}
                className="flex-1 py-2.5 rounded-xl bg-primary-dark hover:bg-primary-darker text-white font-bold text-sm shadow-md shadow-primary/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                Entregar Agora →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: SUBIR ESTOQUE / ENTRADA NF ================= */}
      <AlmoxarifadoStockEntryModal
        isOpen={isStockEntryModalOpen}
        onClose={() => setIsStockEntryModalOpen(false)}
        sites={sites}
        catalogs={catalogList}
        defaultSiteId={selectedSiteId}
        onSuccess={() => {
          loadOrders();
        }}
      />

      {/* ================= MODAL: PREVIEW DE ASSINATURA ================= */}
      {previewSignatureUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-center text-foreground">
            <button aria-label="Fechar"
              onClick={() => setPreviewSignatureUrl(null)}
              className="absolute top-4 right-4 text-muted hover:text-foreground p-1.5 rounded-xl bg-surface-hover transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-foreground mb-2">Comprovante de Assinatura Digital</h3>
            <p className="text-xs text-muted mb-4">Assinatura capturada na entrega do EPI no balcão.</p>
            <div className="bg-white rounded-xl p-4 border border-border mb-4 inline-block max-w-full shadow-inner">
              <img src={previewSignatureUrl} alt="Assinatura" className="max-h-48 mx-auto" />
            </div>
            <div>
              <button
                onClick={() => setPreviewSignatureUrl(null)}
                className="px-6 py-2 rounded-xl bg-surface-hover hover:bg-border text-foreground font-semibold text-sm transition-colors border border-border cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ESTORNO / EXCLUSÃO DE PEDIDO ================= */}
      {orderToDelete && (
        <AlmoxarifadoCancelOrderModal
          order={orderToDelete}
          isOpen={!!orderToDelete}
          onClose={() => setOrderToDelete(null)}
          onSuccess={() => {
            setOrderToDelete(null);
            loadOrders();
          }}
        />
      )}
    </div>
  );
}
