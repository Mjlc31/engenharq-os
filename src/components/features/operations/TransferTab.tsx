import React, { useState, useEffect } from 'react';
import { ConstructionSite, EpiCatalog, SiteTransfer } from '../../../types';
import { transfersService } from '../../../services/transfersService';
import { useAuth } from '../../../components/AuthProvider';
import { useToast } from '../../../components/ui/Toast';
import { ArrowRight, CheckCircle2, Clock, Send, Shield, AlertCircle, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface TransferTabProps {
  catalogs: EpiCatalog[];
}

export function TransferTab({ catalogs }: TransferTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form State
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [originSiteId, setOriginSiteId] = useState('');
  const [destinationSiteId, setDestinationSiteId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  // Receive Modal State
  const [receivingTransfer, setReceivingTransfer] = useState<any | null>(null);
  const [receiverName, setReceiverName] = useState('');
  const [isReceiving, setIsReceiving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sitesRes, transfersData] = await Promise.all([
        supabase.from('construction_sites').select('*').is('deleted_at', null).order('name'),
        transfersService.fetchTransfers()
      ]);

      if (sitesRes.error) throw sitesRes.error;
      setSites(sitesRes.data || []);
      setTransfers(transfersData);
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: 'Falha ao carregar dados de transferências.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedCatalog = catalogs.find(c => c.id === selectedCatalogId);
  const currentCatalogStock = selectedCatalog?.current_stock || 0;

  const handleSendTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatalogId || !originSiteId || !destinationSiteId || quantity < 1) return;

    if (originSiteId === destinationSiteId) {
      toast({ type: 'error', title: 'Erro de Validação', message: 'A obra de origem e destino devem ser diferentes.' });
      return;
    }

    setSending(true);
    try {
      const senderName = user?.user_metadata?.full_name || user?.email || 'Operador Logístico';
      await transfersService.sendTransfer({
        catalog_id: selectedCatalogId,
        origin_site_id: originSiteId,
        destination_site_id: destinationSiteId,
        quantity: Number(quantity),
        sender_id: user?.id || '00000000-0000-0000-0000-000000000000',
        sender_name: senderName,
        notes: notes || undefined
      });

      toast({ type: 'success', title: 'Transferência Enviada', message: `Lote de ${quantity} item(ns) despachado com sucesso em trânsito.` });
      setSelectedCatalogId('');
      setOriginSiteId('');
      setDestinationSiteId('');
      setQuantity(1);
      setNotes('');
      await loadData();
    } catch (err: any) {
      toast({ type: 'error', title: 'Falha no Envio', message: err.message || 'Erro ao registrar envio da transferência.' });
    } finally {
      setSending(false);
    }
  };

  const handleConfirmReceive = async () => {
    if (!receivingTransfer) return;
    setIsReceiving(true);
    try {
      const confirmedReceiverName = receiverName.trim() || user?.user_metadata?.full_name || user?.email || 'Recebedor da Obra';
      await transfersService.receiveTransfer({
        transfer_id: receivingTransfer.id,
        receiver_id: user?.id || '00000000-0000-0000-0000-000000000000',
        receiver_name: confirmedReceiverName
      });

      toast({ type: 'success', title: 'Recebimento Confirmado', message: 'EPIs recebidos e saldo creditado na obra de destino com sucesso!' });
      setReceivingTransfer(null);
      setReceiverName('');
      await loadData();
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro no Recebimento', message: err.message || 'Falha ao confirmar recebimento.' });
    } finally {
      setIsReceiving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Formulário de Envio de Transferência */}
      <div className="max-w-4xl bg-background border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-primary">
          <Send className="w-5 h-5" />
          <h2 className="text-xl font-bold text-foreground">Despachar Transferência entre Obras</h2>
        </div>
        <p className="text-xs text-muted mb-6">
          Subtrai o saldo da obra de origem no despacho e credita na obra de destino após confirmação física de recebimento.
        </p>

        <form onSubmit={handleSendTransfer} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-muted">EPI / Modelo *</label>
              <select 
                required 
                value={selectedCatalogId} 
                onChange={e => setSelectedCatalogId(e.target.value)} 
                className="w-full px-3 py-2 bg-surface border border-border rounded-md text-foreground text-sm focus:outline-none focus:border-primary"
              >
                <option value="">Selecione o EPI para Transferência</option>
                {catalogs.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.ca_number ? `(CA: ${c.ca_number})` : ''} • Disponível Geral: {c.current_stock || 0}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted">Quantidade a Transferir *</label>
              <input 
                type="number" 
                min="1" 
                required 
                value={quantity} 
                onChange={e => setQuantity(Number(e.target.value))} 
                className="w-full px-3 py-2 bg-surface border border-border rounded-md text-foreground text-sm font-mono focus:outline-none focus:border-primary" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted">Obra de Origem (Remetente) *</label>
              <select 
                required 
                value={originSiteId} 
                onChange={e => setOriginSiteId(e.target.value)} 
                className="w-full px-3 py-2 bg-surface border border-border rounded-md text-foreground text-sm focus:outline-none focus:border-primary"
              >
                <option value="">Selecione a Obra de Origem</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name} {s.city ? `(${s.city})` : ''}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted">Obra de Destino (Recebedor) *</label>
              <select 
                required 
                value={destinationSiteId} 
                onChange={e => setDestinationSiteId(e.target.value)} 
                className="w-full px-3 py-2 bg-surface border border-border rounded-md text-foreground text-sm focus:outline-none focus:border-primary"
              >
                <option value="">Selecione a Obra de Destino</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name} {s.city ? `(${s.city})` : ''}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted">Observações / Motivo da Transferência</label>
            <textarea 
              rows={2} 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              placeholder="Ex: Reforço emergencial de capacetes para a frente de trabalho..."
              className="w-full px-3 py-2 bg-surface border border-border rounded-md text-foreground text-sm focus:outline-none focus:border-primary" 
            />
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="submit" 
              disabled={sending || !selectedCatalogId || !originSiteId || !destinationSiteId || quantity < 1} 
              className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2 text-sm shadow-md"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Despachando...' : 'Confirmar Envio (Em Trânsito)'}
            </button>
          </div>
        </form>
      </div>

      {/* Tabela de Histórico de Transferências com Confirmação de Recebimento */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">Histórico de Transferências entre Obras</h3>
        
        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-hover/50 text-[11px] uppercase tracking-wider text-muted">
                  <th className="p-4 font-semibold">EPI / Item</th>
                  <th className="p-4 font-semibold text-center">Qtd</th>
                  <th className="p-4 font-semibold">Trajeto (Origem ➔ Destino)</th>
                  <th className="p-4 font-semibold">Envio (Despacho)</th>
                  <th className="p-4 font-semibold">Recebimento</th>
                  <th className="p-4 font-semibold text-center">Status</th>
                  <th className="p-4 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {transfers.map((t: any) => {
                  const isEmTransito = t.status === 'EM_TRANSITO';

                  return (
                    <tr key={t.id} className="border-b border-border hover:bg-surface-hover/30 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-foreground">{t.catalog?.name || 'EPI'}</div>
                        <div className="text-xs text-muted font-mono">{t.catalog?.ca_number ? `CA: ${t.catalog.ca_number}` : ''}</div>
                      </td>
                      <td className="p-4 text-center font-bold text-foreground font-mono">
                        {t.quantity} un
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium text-foreground">{t.origin_site?.name || 'Origem'}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-muted shrink-0" />
                          <span className="font-bold text-primary">{t.destination_site?.name || 'Destino'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-muted">
                        <div className="font-medium text-foreground">{t.sender_name}</div>
                        <div>{new Date(t.sent_at).toLocaleString()}</div>
                      </td>
                      <td className="p-4 text-xs text-muted">
                        {t.received_at ? (
                          <>
                            <div className="font-medium text-foreground">{t.receiver_name}</div>
                            <div>{new Date(t.received_at).toLocaleString()}</div>
                          </>
                        ) : (
                          <span className="text-amber-500 font-medium">Aguardando Destino</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {isEmTransito ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                            <Clock className="w-3 h-3 shrink-0" /> Em Trânsito
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 shrink-0" /> Recebido
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {isEmTransito && (
                          <button
                            onClick={() => {
                              setReceivingTransfer(t);
                              setReceiverName(user?.user_metadata?.full_name || user?.email || '');
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-md shadow transition-colors flex items-center gap-1.5 ml-auto"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirmar Recebimento
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {transfers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted">
                      {loading ? 'Carregando transferências...' : 'Nenhuma transferência registrada.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Recebimento no Destino */}
      {receivingTransfer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Confirmar Entrada no Destino
                </h3>
                <p className="text-xs text-muted mt-1">
                  Ao confirmar, o lote de <strong>{receivingTransfer.quantity} un</strong> do EPI <strong>{receivingTransfer.catalog?.name}</strong> será creditado no estoque da obra <strong>{receivingTransfer.destination_site?.name}</strong>.
                </p>
              </div>
              <button onClick={() => setReceivingTransfer(null)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Nome do Responsável pelo Recebimento *</label>
                <input 
                  type="text" 
                  required
                  value={receiverName} 
                  onChange={e => setReceiverName(e.target.value)} 
                  placeholder="Seu nome completo ou cargo"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="p-3 bg-surface-hover/40 border border-border rounded-md text-xs text-muted space-y-1">
                <div><strong>Origem:</strong> {receivingTransfer.origin_site?.name}</div>
                <div><strong>Destino:</strong> {receivingTransfer.destination_site?.name}</div>
                <div><strong>Enviado por:</strong> {receivingTransfer.sender_name} em {new Date(receivingTransfer.sent_at).toLocaleString()}</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button onClick={() => setReceivingTransfer(null)} className="px-4 py-2 text-sm text-muted hover:text-foreground">
                Cancelar
              </button>
              <button 
                onClick={handleConfirmReceive} 
                disabled={isReceiving} 
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-md shadow transition-colors disabled:opacity-50"
              >
                {isReceiving ? 'Confirmando...' : 'Confirmar e Creditar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
