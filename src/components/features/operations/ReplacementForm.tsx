import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../ui/Toast';
import { ArrowRightLeft } from 'lucide-react';

export function ReplacementForm({ workers, catalogs, epis, setIsSignatureModalOpen, setPendingReplacement }: { workers: any[], catalogs: any[], epis: any[], setIsSignatureModalOpen: any, setPendingReplacement: any }) {
  const { toast } = useToast();
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [activeAssignments, setActiveAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  const handleSubstituicao = (assignmentId: string, catalogId: string) => {
    const catalog = catalogs.find((c: any) => c.id === catalogId);
    if (!catalog || catalog.current_stock === 0) {
      toast({ type: 'error', title: 'Estoque Insuficiente', message: 'Não há itens disponíveis no estoque para substituição deste mesmo modelo.' });
      return;
    }
    setPendingReplacement({
      workerId: selectedWorkerId,
      oldEpiId: assignmentId, // Pass assignmentId as oldEpiId for the RPC
      newEpiId: catalogId // Pass catalogId as newEpiId for the RPC
    });
    setIsSignatureModalOpen(true);
  };

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><ArrowRightLeft className="w-5 h-5" /> Substituição de EPI</h2>
      <p className="text-sm text-muted mb-4">A substituição devolve o equipamento atual (desgastado) e entrega um novo do mesmo modelo em uma única operação.</p>
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
          <p className="text-sm text-muted">Este trabalhador não possui EPIs para substituição.</p>
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
                    <td className="px-4 py-2">{new Date(a.assigned_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      <button 
                        onClick={() => handleSubstituicao(a.id, a.catalog_id)}
                        className="px-3 py-1 bg-primary text-background rounded-md hover:bg-primary-dark disabled:opacity-50"
                      >
                        Substituir
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
