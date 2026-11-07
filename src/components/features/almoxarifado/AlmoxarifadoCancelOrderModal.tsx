import React, { useState } from 'react';
import { Modal } from '../../ui/Modal';
import { AlmoxarifadoOrder } from '../../../types';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../components/AuthProvider';
import { useToast } from '../../../components/ui/Toast';
import { AlertTriangle, X, RotateCcw, Package, User, Building2, Calendar, Clock, Check, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AlmoxarifadoCancelOrderModalProps {
  order: AlmoxarifadoOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AlmoxarifadoCancelOrderModal({
  order,
  isOpen,
  onClose,
  onSuccess
}: AlmoxarifadoCancelOrderModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [reason, setReason] = useState('Cancelamento de entrega realizado no balcão');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const quickReasons = [
    'Entrega registrada por engano no sistema',
    'Colaborador desistiu da retirada do item',
    'EPI entregue com tamanho incorreto',
    'Comanda duplicada no balcão',
    'Teste operacional de validação'
  ];

  const handleConfirmCancellation = async () => {
    if (!reason.trim()) {
      setErrorMessage('Por favor, informe a justificativa do cancelamento/estorno.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.rpc('cancel_or_delete_almoxarifado_order', {
        p_order_id: order.id,
        p_cancelled_by: user?.email || 'admin@engenharq.com',
        p_reason: reason.trim()
      });

      if (error) throw error;

      toast({
        type: 'success',
        title: 'Comanda Estornada!',
        message: `Comanda #${order.order_number} estornada com sucesso. As peças retornaram ao estoque da obra.`
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao estornar pedido do almoxarifado:', err);
      setErrorMessage(err.message || 'Falha ao estornar o pedido. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} closeDisabled={submitting} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="bg-surface border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5 bg-background/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Estornar & Excluir Comanda</span>
                <span className="font-mono text-red-400">#{order.order_number}</span>
              </h3>
              <p className="text-xs text-muted">
                Devolução física ao estoque e cancelamento da comanda
              </p>
            </div>
          </div>
          <button aria-label="Fechar"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Impact Alert Card */}
          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-xs text-muted space-y-1.5">
            <p className="font-bold text-red-400 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5" />
              Impactos Contábeis & Físicos no Sistema:
            </p>
            <ul className="list-disc list-inside space-y-1 text-foreground/80 pl-1">
              <li>
                As peças entregues serão <strong>devolvidas automaticamente ao estoque da obra</strong>.
              </li>
              <li>
                A cautela de entrega será <strong>estornada da Ficha NR-6</strong> do colaborador.
              </li>
              <li>
                Uma movimentação contábil positiva (<span className="text-emerald-400 font-mono">+un</span>) será gravada no <strong>Extrato Kardex</strong>.
              </li>
            </ul>
          </div>

          {/* Order Details Card */}
          <div className="p-3.5 rounded-xl bg-background border border-border space-y-2 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <User className="w-3.5 h-3.5 text-muted" />
                <span>{order.worker?.full_name || 'Colaborador não identificado'}</span>
              </div>
              <span className="font-mono text-muted text-[11px]">
                Mat: {order.worker?.registration_number || 'S/N'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span className="truncate">{order.site?.name || 'Obra Geral'}</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end font-mono">
                <Clock className="w-3.5 h-3.5 text-muted" />
                <span>
                  {order.delivered_at 
                    ? format(new Date(order.delivered_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })
                    : format(new Date(order.requested_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })
                  }
                </span>
              </div>
            </div>

            {/* Items summary */}
            <div className="pt-2 border-t border-border/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                Itens a serem estornados:
              </span>
              <div className="space-y-1">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-surface/60 px-2 py-1 rounded border border-border/50">
                    <span className="text-foreground truncate">
                      <strong className="text-primary font-mono">{item.quantity}x</strong> {item.name}
                      {item.size ? ` (${item.size})` : ''}
                    </span>
                    {item.ca_number && (
                      <span className="text-[11px] text-muted font-mono ml-2 shrink-0">
                        CA: {item.ca_number}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cancellation Reason */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Motivo do Estorno / Exclusão <span className="text-red-400">*</span>
            </label>
            <textarea aria-label="Motivo do Estorno / Exclusão"
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ex: Item entregue duplicado por equívoco no balcão..."
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-red-500 transition-colors"
            />

            {/* Quick buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickReasons.map((qr, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setReason(qr)}
                  className="text-[11px] px-2 py-1 rounded-md bg-surface-hover hover:bg-border border border-border text-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  {qr}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-border p-4 bg-background/50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={handleConfirmCancellation}
            disabled={submitting || !reason.trim()}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Estornando...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirmar Estorno & Exclusão</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
