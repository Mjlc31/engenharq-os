import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface SuccessViewProps {
  onNext: () => void;
}

export function SuccessView({ onNext }: SuccessViewProps) {
  return (
    <div className="text-center py-12 space-y-6">
      <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
      </div>
      <h2 className="text-2xl font-bold text-foreground">Entrega Registrada</h2>
      <p className="text-muted max-w-lg mx-auto">
        A Ficha de EPI foi gerada digitalmente com a assinatura do colaborador e vinculada ao banco de dados em conformidade com a NR-6.
      </p>
      <div className="pt-8">
        <button
          onClick={onNext}
          className="bg-surface-hover border border-border hover:bg-border text-foreground font-medium py-3 px-8 rounded-lg transition-colors"
        >
          Próximo Atendimento
        </button>
      </div>
    </div>
  );
}
