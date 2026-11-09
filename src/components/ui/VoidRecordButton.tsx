import React, { useState } from 'react';
import { Ban, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../AuthProvider';
import { useToast } from './Toast';
import { Modal } from './Modal';
import { GOVERNANCE_ROLES } from '../../services/rbacService';

type VoidableTable = 'worker_asos' | 'worker_trainings' | 'disciplinary_records';

interface VoidRecordButtonProps {
  table: VoidableTable;
  id: string;
  /** Descrição curta do registro para o colaborador entender o que está anulando (ex.: "ASO de João, 12/03/2026"). */
  description: string;
  onVoided: () => void;
}

// Registro de compliance não se apaga: anula-se com motivo. O banco (trg_guard_void) confere o perfil,
// exige o motivo e grava quem e quando; aqui só se mostra o botão para quem pode.
export function VoidRecordButton({ table, id, description, onVoided }: VoidRecordButtonProps) {
  const { role } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  if (!role || !GOVERNANCE_ROLES.includes(role)) return null;

  const close = () => { setOpen(false); setReason(''); };

  const confirm = async () => {
    setSaving(true);
    const { error } = await supabase
      .from(table)
      .update({ voided_at: new Date().toISOString(), void_reason: reason.trim() })
      .eq('id', id);
    setSaving(false);
    if (error) {
      toast({ type: 'error', title: 'Não foi possível anular', message: error.message });
      return;
    }
    toast({ type: 'success', title: 'Registro anulado', message: 'Ele sai das listas, mas continua na Auditoria com o motivo.' });
    close();
    onVoided();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded border border-border text-muted hover:text-red-400 hover:border-red-500/40 transition-colors cursor-pointer"
        title="Anular registro lançado por engano"
      >
        <Ban className="w-3.5 h-3.5" aria-hidden="true" />
        Anular
      </button>

      {open && (
        <Modal onClose={close} closeDisabled={saving} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface w-full max-w-md rounded-xl border border-border shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Anular registro</h2>
              <button aria-label="Fechar" type="button" onClick={close} disabled={saving}
                className="p-1 text-muted hover:text-foreground hover:bg-surface-hover rounded transition-colors disabled:opacity-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-muted">
                <span className="text-foreground font-medium">{description}</span> sai das listas e dos indicadores.
                Ele não é apagado: fica na Auditoria com o motivo, quem anulou e quando. A anulação não pode ser desfeita.
              </p>
              <label className="block text-xs font-semibold text-muted" htmlFor={`void-reason-${id}`}>Motivo (obrigatório)</label>
              <textarea
                id={`void-reason-${id}`}
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder="Ex.: lançado no colaborador errado"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-border">
              <button type="button" onClick={close} disabled={saving}
                className="px-4 py-2 text-sm rounded-md border border-border text-muted hover:text-foreground disabled:opacity-50 cursor-pointer">
                Cancelar
              </button>
              <button type="button" onClick={confirm} disabled={saving || reason.trim().length < 5}
                className="px-4 py-2 text-sm font-semibold rounded-md bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 cursor-pointer">
                {saving ? 'Anulando...' : 'Anular'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
