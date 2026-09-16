import re

with open('src/pages/Operations.tsx', 'r') as f:
    content = f.read()

# Replace availableInventory logic
old_logic = """  const availableInventory = epis.filter(e => e.epi_catalog_id === selectedCatalogId && e.status === 'AVAILABLE');

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
        
        // Em seguida, recupera o ID do assignment recém-criado para atualizar a assinatura e gerar o PDF
        // Como o RPC acabou de rodar, pegamos o assignment mais recente deste EPI e trabalhador
        const { data: assignmentData } = await supabase
          .from('epi_assignments')
          .select('id')
          .eq('epi_id', item.id)
          .eq('worker_id', selectedWorkerId)
          .order('assigned_at', { ascending: false })
          .limit(1)
          .single();

        if (assignmentData) {
          const { error: sigError } = await supabase
            .from('epi_assignments')
            .update({ digital_signature_url: signatureDataUrl })
            .eq('id', assignmentData.id);
            
          if (sigError) console.error("Erro ao salvar assinatura:", sigError);
        }
      }

      toast({ type: 'success', title: 'Sucesso', message: `${quantity} EPI(s) entregue(s) com sucesso.` });
      setSelectedWorkerId('');
      setSelectedCatalogId('');
      setQuantity(1);
      
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      toast({ type: 'error', title: 'Erro', message: err.message || 'Falha ao registrar entrega.' });
    } finally {
      setSubmitting(false);
      setIsSignatureModalOpen(false);
    }
  };"""

new_logic = """  const selectedCatalog = catalogs.find(c => c.id === selectedCatalogId);
  const currentStock = selectedCatalog?.current_stock || 0;

  const handleEntrega = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId || !selectedCatalogId || quantity < 1) return;

    if (quantity > currentStock) {
      toast({ type: 'error', title: 'Estoque Insuficiente', message: `Você solicitou ${quantity}, mas há apenas ${currentStock} em estoque.` });
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
      
      // Get the newly created assignments to attach signature
      const { data: assignments } = await supabase
        .from('epi_assignments')
        .select('id')
        .eq('catalog_id', selectedCatalogId)
        .eq('worker_id', selectedWorkerId)
        .order('assigned_at', { ascending: false })
        .limit(quantity);

      if (assignments && assignments.length > 0) {
        const assignmentIds = assignments.map(a => a.id);
        const { error: sigError } = await supabase
          .from('epi_assignments')
          .update({ digital_signature_url: signatureDataUrl })
          .in('id', assignmentIds);
          
        if (sigError) console.error("Erro ao salvar assinatura:", sigError);
      }

      toast({ type: 'success', title: 'Sucesso', message: `${quantity} EPI(s) entregue(s) com sucesso.` });
      setSelectedWorkerId('');
      setSelectedCatalogId('');
      setQuantity(1);
      
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      toast({ type: 'error', title: 'Erro', message: err.message || 'Falha ao registrar entrega.' });
    } finally {
      setSubmitting(false);
      setIsSignatureModalOpen(false);
    }
  };"""

content = content.replace(old_logic, new_logic)

with open('src/pages/Operations.tsx', 'w') as f:
    f.write(content)
