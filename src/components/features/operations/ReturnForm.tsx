import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../ui/Toast';
import { ArrowRightLeft } from 'lucide-react';

export function ReturnForm({ workers }: { workers: any[] }) {
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
  }, [selectedWorkerId]);

  const loadActiveAssignments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('epi_assignments')
      .select(`
        id, assigned_at, catalog_id, condition_on_delivery,
        catalog:epi_catalog(name)
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

  const handleDevolucao = async (assignmentId: string, epiId: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('return_epi', {
        p_assignment_id: epiId,
        p_condition: 'GOOD'
      });
      if (error) throw error;
      toast({ type: 'success', title: 'Sucesso', message: 'EPI devolvido com sucesso.' });
      loadActiveAssignments();
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><ArrowRightLeft className="w-5 h-5" /> Devolução de EPI</h2>
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
          <p className="text-sm text-muted">Este trabalhador não possui EPIs pendentes de devolução.</p>
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
                    <td className="px-4 py-2">{a.epi?.catalog?.name} ({a.epi?.tracking_code})</td>
                    <td className="px-4 py-2">{new Date(a.assigned_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      <button 
                        onClick={() => handleDevolucao(a.id, a.epi_id)}
                        disabled={submitting}
                        className="px-3 py-1 bg-primary text-background rounded-md hover:bg-primary-dark disabled:opacity-50"
                      >
                        Devolver
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
