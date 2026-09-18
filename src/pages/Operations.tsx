import React, { useState } from 'react';
import { useEpiAssets } from '../hooks/useEpiAssets';
import { useToast } from '../components/ui/Toast';
import { Package, Users, FileText, CheckCircle, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SignaturePadModal } from '../components/ui/SignaturePadModal';
import { ReturnForm } from '../components/features/operations/ReturnForm';
import { ReplacementForm } from '../components/features/operations/ReplacementForm';
import { LossForm } from '../components/features/operations/LossForm';

export function Operations() {
  const { epis, catalogs, workers, loading } = useEpiAssets();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('entregas');
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [pendingReplacement, setPendingReplacement] = useState<{workerId: string, oldEpiId: string, newEpiId: string} | null>(null);

  // Form states
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedCatalog = catalogs.find(c => c.id === selectedCatalogId);
  const availableStock = selectedCatalog ? selectedCatalog.current_stock : 0;

  const handleEntrega = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId || !selectedCatalogId || quantity < 1) return;

    if (quantity > availableStock) {
      toast({ type: 'error', title: 'Estoque Insuficiente', message: `Você solicitou ${quantity}, mas há apenas ${availableStock} disponíveis.` });
      return;
    }
    
    // Abrir o modal de assinatura antes de processar
    setIsSignatureModalOpen(true);
  };

  const processEntrega = async (signatureDataUrl: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('assign_epi', {
        p_worker_id: selectedWorkerId,
        p_catalog_id: selectedCatalogId,
        p_quantity: quantity
      });
      if (error) throw error;
      
      // Update signature on new assignments
      const { data: newAssignments } = await supabase
        .from('epi_assignments')
        .select('id')
        .eq('catalog_id', selectedCatalogId)
        .eq('worker_id', selectedWorkerId)
        .is('returned_at', null)
        .order('assigned_at', { ascending: false })
        .limit(quantity);
        
      if (newAssignments && newAssignments.length > 0) {
        const ids = newAssignments.map(a => a.id);
        await supabase
          .from('epi_assignments')
          .update({ digital_signature_url: signatureDataUrl })
          .in('id', ids);
      }

      toast({ type: 'success', title: 'Sucesso', message: `${quantity} EPI(s) entregues, assinados e registrados na ficha.` });
      setSelectedWorkerId('');
      setSelectedCatalogId('');
      setQuantity(1);
      setObservations('');
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro na Operação', message: err.message });
    } finally {
      setSubmitting(false);
      window.location.reload();
    }
  };

  const processReplacement = async (signatureDataUrl: string) => {
    if (!pendingReplacement) return;
    setSubmitting(true);
    try {
      // 1. Devolve o antigo
      const { error: returnError } = await supabase.rpc('return_epi', {
        p_assignment_id: pendingReplacement.oldEpiId, // Using oldEpiId as assignmentId here for compatibility
        p_condition: 'DAMAGED'
      });
      if (returnError) throw returnError;

      // 2. Entrega o novo
      const { error: assignError } = await supabase.rpc('assign_epi', {
        p_worker_id: pendingReplacement.workerId,
        p_catalog_id: pendingReplacement.newEpiId, // Using newEpiId as catalogId
        p_quantity: 1
      });
      if (assignError) throw assignError;

      // 3. Assina
      const { data: newAssignments } = await supabase
        .from('epi_assignments')
        .select('id')
        .eq('catalog_id', pendingReplacement.newEpiId)
        .eq('worker_id', pendingReplacement.workerId)
        .is('returned_at', null)
        .order('assigned_at', { ascending: false })
        .limit(1);
        
      if (newAssignments && newAssignments.length > 0) {
        await supabase
          .from('epi_assignments')
          .update({ digital_signature_url: signatureDataUrl })
          .eq('id', newAssignments[0].id);
      }

      toast({ type: 'success', title: 'Sucesso', message: 'Substituição concluída e assinada com sucesso.' });
      setPendingReplacement(null);
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message });
    } finally {
      setSubmitting(false);
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Operações</h1>
        <p className="text-muted mt-2">Central de Movimentações: Entregas, Devoluções e Extravios.</p>
      </div>

      <div className="flex gap-2 border-b border-border">
        {['entregas', 'devolucoes', 'substituicoes', 'extravios', 'estoque'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === tab ? 'text-primary' : 'text-muted hover:text-foreground'}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        {activeTab === 'entregas' && (
          <div className="max-w-3xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><ArrowRightLeft className="w-5 h-5" /> Nova Entrega de EPI</h2>
            <form onSubmit={handleEntrega} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">Funcionário</label>
                  <select required value={selectedWorkerId} onChange={e => setSelectedWorkerId(e.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-md">
                    <option value="">Selecione o Trabalhador</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.full_name} - Mat: {w.registration_number}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">EPI (Modelo)</label>
                  <select required value={selectedCatalogId} onChange={e => setSelectedCatalogId(e.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-md">
                    <option value="">Selecione o EPI</option>
                    {catalogs.map(c => <option key={c.id} value={c.id}>{c.name} (CA: {c.ca_number || 'N/A'})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">Quantidade</label>
                  <input type="number" min="1" required value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full px-4 py-2 bg-background border border-border rounded-md" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">Data da Entrega</label>
                  <input type="date" required defaultValue={new Date().toISOString().slice(0,10)} className="w-full px-4 py-2 bg-background border border-border rounded-md" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">Estoque Disponível</label>
                  <div className="w-full px-4 py-2 bg-surface-hover border border-border rounded-md text-foreground font-medium flex items-center gap-2">
                    {selectedCatalogId ? (availableStock > 0 ? <span className="text-emerald-500">{availableStock} un.</span> : <span className="text-red-500">Sem Estoque</span>) : '-'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">Observações</label>
                <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={3} className="w-full px-4 py-2 bg-background border border-border rounded-md" placeholder="Detalhes adicionais..." />
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" disabled={submitting || !selectedCatalogId || availableStock < quantity} className="px-6 py-2 bg-primary text-background font-medium rounded-md hover:bg-primary-dark disabled:opacity-50">
                  {submitting ? 'Registrando...' : 'Confirmar Entrega'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'devolucoes' && <ReturnForm workers={workers} />}
        {activeTab === 'substituicoes' && <ReplacementForm workers={workers} catalogs={catalogs} epis={epis} setIsSignatureModalOpen={setIsSignatureModalOpen} setPendingReplacement={setPendingReplacement} />}
        {activeTab === 'extravios' && <LossForm workers={workers} />}

        {activeTab === 'estoque' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-4">Posição de Estoque (Disponíveis vs Em Uso)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogs.map(cat => {
                const available = cat.current_stock;
                const inUse = 0; // We no longer strictly track IN_USE separate from total without querying assignments, but current_stock is what matters
                return (
                  <div key={cat.id} className="p-4 border border-border rounded-lg bg-background">
                    <h3 className="font-bold text-foreground truncate">{cat.name}</h3>
                    <p className="text-sm text-muted mb-2">CA: {cat.ca_number || 'N/A'}</p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-emerald-500 font-medium">{available} Disponíveis</span>
                      <span className="text-blue-500 font-medium">{inUse} Em Uso</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      <SignaturePadModal
        isOpen={isSignatureModalOpen}
        onClose={() => { setIsSignatureModalOpen(false); setPendingReplacement(null); }}
        onSave={pendingReplacement ? processReplacement : processEntrega}
        title="Assinatura da Nova Entrega"
      />
    </div>
  );
}
