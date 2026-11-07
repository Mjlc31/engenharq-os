import React, { useRef } from 'react';
import { Modal } from '../../ui/Modal';
import { AlmoxarifadoOrder } from '../../../types';
import { X, Printer, CheckCircle2, ShieldCheck, Clock, User, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AlmoxarifadoReceiptModalProps {
  order: AlmoxarifadoOrder | null;
  onClose: () => void;
}

export function AlmoxarifadoReceiptModal({ order, onClose }: AlmoxarifadoReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const requestedAtFormatted = order.requested_at
    ? format(new Date(order.requested_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })
    : '--/--/---- --:--:--';

  const deliveredAtFormatted = order.delivered_at
    ? format(new Date(order.delivered_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })
    : 'Pendente de Entrega';

  // SLA Calculation
  let slaFormatted = '--';
  if (order.requested_at && order.delivered_at) {
    const diffSec = Math.max(0, Math.floor((new Date(order.delivered_at).getTime() - new Date(order.requested_at).getTime()) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    slaFormatted = `${mins}m ${secs}s`;
  }

  const totalQuantity = (order.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);

  return (
    <Modal onClose={onClose} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-foreground flex flex-col max-h-[92vh] print:border-none print:shadow-none print:max-w-none print:p-2 print:bg-white print:text-black">
        
        {/* Header - No print */}
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Comprovante de Retirada • Comanda #{order.order_number}</h3>
              <p className="text-xs text-muted">Termo de recebimento e entrega de balcão</p>
            </div>
          </div>
          <button aria-label="Fechar"
            onClick={onClose}
            className="text-muted hover:text-foreground p-1 rounded-lg bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Ticket Receipt Area */}
        <div 
          ref={receiptRef} 
          className="flex-1 overflow-y-auto pr-1 space-y-4 font-mono text-xs text-foreground bg-background p-4 rounded-xl border border-border print:bg-white print:text-black print:border-none print:p-0"
        >
          {/* Header Ticket */}
          <div className="text-center border-b-2 border-dashed border-border pb-3 print:border-black">
            <h2 className="text-base font-black tracking-wider uppercase text-foreground print:text-black">
              ENGENHAR<span className="text-primary print:text-black">Q</span> OS
            </h2>
            <p className="text-[11px] font-sans text-muted print:text-gray-600">Sistema Integrado de SST & Gestão de Canteiro</p>
            <p className="text-[10px] text-muted font-sans mt-0.5 print:text-gray-600">Almoxarifado Central & Controle de EPIs (NR-6)</p>
            
            <div className="mt-2 inline-block px-3 py-1 rounded bg-primary/10 border border-primary/30 text-primary font-bold text-xs print:border-black print:text-black">
              COMANDA DE BALCÃO #{order.order_number}
            </div>
          </div>

          {/* Dados do Atendimento com Data e Hora */}
          <div className="border-b border-dashed border-border pb-3 space-y-1 text-[11px] print:border-black">
            <div className="flex justify-between">
              <span className="text-muted print:text-gray-600">Data/Hora Solicitação:</span>
              <strong className="text-foreground print:text-black">{requestedAtFormatted}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted print:text-gray-600">Data/Hora Entrega:</span>
              <strong className="text-emerald-400 print:text-black">{deliveredAtFormatted}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted print:text-gray-600">Tempo de Atendimento (SLA):</span>
              <strong className="text-foreground print:text-black">{slaFormatted}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted print:text-gray-600">Obra / Local:</span>
              <strong className="text-foreground print:text-black truncate max-w-[220px]">
                {order.site?.name || 'Canteiro Central (Geral)'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted print:text-gray-600">Atendido por (Almoxarife):</span>
              <strong className="text-foreground print:text-black truncate max-w-[220px]">
                {order.delivered_by || 'Operador de Balcão'}
              </strong>
            </div>
          </div>

          {/* Dados do Colaborador */}
          <div className="border-b border-dashed border-border pb-3 space-y-1 text-[11px] print:border-black">
            <div className="flex justify-between">
              <span className="text-muted print:text-gray-600">Colaborador:</span>
              <strong className="text-foreground print:text-black">{order.worker?.full_name || 'Não identificado'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted print:text-gray-600">Matrícula:</span>
              <strong className="text-foreground print:text-black">{order.worker?.registration_number || 'S/N'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted print:text-gray-600">Função:</span>
              <strong className="text-foreground print:text-black">{order.worker?.current_role || 'Não informada'}</strong>
            </div>
            {order.worker?.cpf && (
              <div className="flex justify-between">
                <span className="text-muted print:text-gray-600">CPF:</span>
                <strong className="text-foreground print:text-black">{order.worker.cpf}</strong>
              </div>
            )}
          </div>

          {/* Tabela de Itens Entregues */}
          <div className="border-b border-dashed border-border pb-3 print:border-black">
            <div className="flex justify-between text-[11px] font-bold text-muted uppercase pb-1 print:text-gray-700">
              <span>Item / EPI</span>
              <span>Qtd</span>
            </div>
            <div className="space-y-1.5 mt-1">
              {order.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-xs items-start">
                  <div className="pr-2">
                    <span className="font-bold text-foreground print:text-black block">{it.name}</span>
                    <span className="text-[10px] text-muted print:text-gray-600">
                      {it.ca_number ? `CA: ${it.ca_number}` : 'S/ CA'} {it.size ? `• Tam: ${it.size}` : ''}
                    </span>
                  </div>
                  <span className="font-bold text-foreground print:text-black shrink-0 font-mono">
                    {it.quantity}x
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs font-bold pt-2 mt-2 border-t border-border print:border-black">
              <span>Total de Itens:</span>
              <span className="font-mono">{totalQuantity} un</span>
            </div>
          </div>

          {/* Termo Legal NR-6 */}
          <p className="text-[9px] text-muted text-justify font-sans leading-relaxed print:text-gray-600">
            Declaro ter recebido os Equipamentos de Proteção Individual (EPIs) acima relacionados, novos ou em perfeitas condições de uso, comprometendo-me a utilizá-los estritamente nas minhas atividades laborais conforme a NR-6 do Ministério do Trabalho e Emprego, zelando por sua guarda e conservação.
          </p>

          {/* Área da Assinatura Digital Coletada */}
          <div className="pt-2 text-center">
            {order.signature_url ? (
              <div className="border border-border rounded-lg p-2 bg-white inline-block max-w-[280px] print:border-black">
                <img 
                  src={order.signature_url} 
                  alt="Assinatura Digital do Recebedor" 
                  className="max-h-20 mx-auto object-contain" 
                />
              </div>
            ) : (
              <div className="border border-dashed border-border p-4 rounded text-center text-muted print:border-black">
                <p className="text-[10px]">Confirmação presencial registrada no sistema</p>
              </div>
            )}
            <p className="text-[10px] font-bold text-foreground mt-1 print:text-black">
              {order.worker?.full_name || 'Assinatura do Colaborador'}
            </p>
            <p className="text-[9px] text-muted print:text-gray-500 font-sans">
              Autenticado digitalmente via EngenharQ OS
            </p>
          </div>
        </div>

        {/* Footer Buttons - No print */}
        <div className="flex items-center gap-3 pt-4 border-t border-border mt-3 shrink-0 print:hidden">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-surface-hover hover:bg-border text-foreground font-semibold text-sm transition-colors border border-border cursor-pointer"
          >
            Fechar
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-primary-dark hover:bg-primary-darker text-white font-bold text-sm shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Cupom / Termo</span>
          </button>
        </div>

      </div>
    </Modal>
  );
}
