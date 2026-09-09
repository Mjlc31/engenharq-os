import React, { useState } from 'react';
import { useEpiAssets } from '../hooks/useEpiAssets';
import { useToast } from '../components/ui/Toast';
import { Package, Users, FileText, CheckCircle, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SignaturePadModal } from '../components/ui/SignaturePadModal';

export function Operations() {
  const { epis, catalogs, workers, loading } = useEpiAssets();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('entregas');
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  // Form states
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedCatalog = catalogs.find(c => c.id === selectedCatalogId);
  const availableInventory = epis.filter(e => e.epi_catalog_id === selectedCatalogId && e.status === 'AVAILABLE');

  const handleEntrega = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId || !selectedCatalogId || quantity < 1) return;

    if (quantity > availableInventory.length) {
      toast({ type: 'error', title: 'Estoque Insuficiente', message: `Você solicitou ${quantity}, mas há apenas ${availableInventory.length} disponíveis.` });
      return;
    }
    
    // Abrir o modal de assinatura antes de processar
    setIsSignatureModalOpen(true);
  };

  const processEntrega = async (signatureDataUrl: string) => {
    setSubmitting(true);
    try {
      const itemsToAssign = availableInventory.slice(0, quantity);
      
      for (const item of itemsToAssign) {
        // Primeiro, vincula o EPI via RPC (que altera o estoque e cria o assignment)
        const { error } = await supabase.rpc('assign_epi', {
          p_worker_id: selectedWorkerId,
          p_epi_id: item.id
        });
        if (error) throw error;
        
        // Agora, localiza o assignment recém criado (ativo) para este EPI e insere a assinatura
        const { error: sigError } = await supabase
          .from('epi_assignments')
          .update({ digital_signature_url: signatureDataUrl })
          .eq('epi_id', item.id)
          .eq('worker_id', selectedWorkerId)
          .is('returned_at', null);
          
        if (sigError) throw sigError;
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Operações</h1>
        <p className="text-muted mt-2">Central de Movimentações: Entregas, Devoluções e Extravios.</p>
      </div>

      <div className="flex gap-2 border-b border-border">
        {['entregas', 'devolucoes', 'substituicoes', 'extravios'].map((tab) => (
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
                    {selectedCatalogId ? (availableInventory.length > 0 ? <span className="text-emerald-500">{availableInventory.length} un.</span> : <span className="text-red-500">Sem Estoque</span>) : '-'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">Observações</label>
                <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={3} className="w-full px-4 py-2 bg-background border border-border rounded-md" placeholder="Detalhes adicionais..." />
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" disabled={submitting || !selectedCatalogId || availableInventory.length < quantity} className="px-6 py-2 bg-primary text-background font-medium rounded-md hover:bg-primary-dark disabled:opacity-50">
                  {submitting ? 'Registrando...' : 'Confirmar Entrega'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab !== 'entregas' && (
          <div className="text-center py-12 text-muted">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">Módulo em Desenvolvimento</h3>
            <p>O fluxo de {activeTab} está planejado para a próxima iteração do MVP.</p>
          </div>
        )}
      </div>

      <SignaturePadModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={processEntrega}
        title="Assinatura da Nova Entrega"
      />
    </div>
  );
}
