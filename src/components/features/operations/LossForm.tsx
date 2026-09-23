import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../ui/Toast';
import { AlertTriangle } from 'lucide-react';

export function LossForm({ workers, setIsSignatureModalOpen, setPendingLoss }: { workers: any[], setIsSignatureModalOpen: (b: boolean) => void, setPendingLoss: (v: any) => void }) {
  const { toast } = useToast();
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [activeAssignments, setActiveAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedWorkerId) {
      loadActiveAssignments();
    } else {
      setActiveAssignments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkerId]);

  const loadActiveAssignments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('epi_assignments')
      .select(`
        id, assigned_at, catalog_id, condition_on_delivery,
        catalog:epi_catalog!catalog_id(name)
      `)
      .eq('worker_id', selectedWorkerId)
      .is('returned_at', null);
      
    if (error) {
      toast({ type: 'error', title: 'Erro', message: error.message });
    } else {
      setActiveAssignments(data || []);
    }
    setLoading(false);
  };

  const handleExtravio = async (assignmentId: string) => {
    setPendingLoss({ assignmentId, workerId: selectedWorkerId, reason: 'Perda/Extravio' });
    setIsSignatureModalOpen(true);
  };

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-500"><AlertTriangle className="w-5 h-5" /> Registro de Extravio</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted">Funcionário</label>
          <select value={selectedWorkerId} onChange={e => setSelectedWorkerId(e.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-md">
            <option value="">Selecione o Trabalhador</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
          </select>
        </div>
        
        {loading && <p className="text-sm text-muted">Carregando EPIs pendentes...</p>}

        {!loading && selectedWorkerId && activeAssignments.length === 0 && (
          <p className="text-sm text-muted">Este trabalhador não possui EPIs pendentes.</p>
        )}

        {!loading && activeAssignments.length > 0 && (
          <div className="mt-4 border border-border rounded-md overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm text-left">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="px-4 py-2 font-medium">EPI / Código</th>
                  <th className="px-4 py-2 font-medium">Data Entrega</th>
                  <th className="px-4 py-2 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {activeAssignments.map(a => (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-surface-hover">
                    <td className="px-4 py-2">{a.catalog?.name}</td>
                    <td className="px-4 py-2">{new Date(a.assigned_at).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-2">
                      <button 
                        onClick={() => handleExtravio(a.id)}
                        disabled={submitting}
                        className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
                      >
                        Registrar Perda
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
