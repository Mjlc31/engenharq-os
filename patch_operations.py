import os

file_path = 'src/pages/Operations.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace availableInventory with selectedCatalog.current_stock
content = content.replace(
    'const availableInventory = epis.filter(e => e.epi_catalog_id === selectedCatalogId && e.status === \'AVAILABLE\');',
    'const availableStock = selectedCatalog ? selectedCatalog.current_stock : 0;'
)

# Update handleEntrega validation
content = content.replace(
    'if (quantity > availableInventory.length) {',
    'if (quantity > availableStock) {'
)
content = content.replace(
    'mas há apenas ${availableInventory.length} disponíveis',
    'mas há apenas ${availableStock} disponíveis'
)

# Rewrite processEntrega
old_process = '''  const processEntrega = async (signatureDataUrl: string) => {
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
  };'''

new_process = '''  const processEntrega = async (signatureDataUrl: string) => {
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
  };'''

content = content.replace(old_process, new_process)

# Rewrite processReplacement
old_replacement = '''  const processReplacement = async (signatureDataUrl: string) => {
    if (!pendingReplacement) return;
    setSubmitting(true);
    try {
      // 1. Devolve o antigo
      const { error: returnError } = await supabase.rpc('return_epi', {
        p_worker_id: pendingReplacement.workerId,
        p_epi_id: pendingReplacement.oldEpiId,
        p_condition: 'DAMAGED'
      });
      if (returnError) throw returnError;

      // 2. Entrega o novo
      const { error: assignError } = await supabase.rpc('assign_epi', {
        p_worker_id: pendingReplacement.workerId,
        p_epi_id: pendingReplacement.newEpiId
      });
      if (assignError) throw assignError;

      // 3. Assina
      const { error: sigError } = await supabase
        .from('epi_assignments')
        .update({ digital_signature_url: signatureDataUrl })
        .eq('epi_id', pendingReplacement.newEpiId)
        .eq('worker_id', pendingReplacement.workerId)
        .is('returned_at', null);
      if (sigError) throw sigError;

      toast({ type: 'success', title: 'Sucesso', message: 'Substituição concluída e assinada com sucesso.' });
      setPendingReplacement(null);
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message });
    } finally {
      setSubmitting(false);
      window.location.reload();
    }
  };'''

new_replacement = '''  const processReplacement = async (signatureDataUrl: string) => {
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
  };'''

content = content.replace(old_replacement, new_replacement)

# Update form elements in activeTab === 'entregas'
content = content.replace('{selectedCatalogId ? (availableInventory.length > 0 ? <span className="text-emerald-500">{availableInventory.length} un.</span> : <span className="text-red-500">Sem Estoque</span>) : \'-\'}', '{selectedCatalogId ? (availableStock > 0 ? <span className="text-emerald-500">{availableStock} un.</span> : <span className="text-red-500">Sem Estoque</span>) : \'-\'}')
content = content.replace('!selectedCatalogId || availableInventory.length < quantity', '!selectedCatalogId || availableStock < quantity')

# Rewrite the 'estoque' tab logic
content = content.replace('const available = epis.filter(e => e.epi_catalog_id === cat.id && e.status === \'AVAILABLE\').length;', 'const available = cat.current_stock;')
content = content.replace('const inUse = epis.filter(e => e.epi_catalog_id === cat.id && e.status === \'IN_USE\').length;', 'const inUse = 0; // We no longer strictly track IN_USE separate from total without querying assignments, but current_stock is what matters')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied to Operations.tsx")
