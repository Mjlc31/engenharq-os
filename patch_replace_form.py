import re

with open('src/components/features/operations/ReplacementForm.tsx', 'r') as f:
    content = f.read()

# Update fetch query
old_query = """    const { data, error } = await supabase
      .from('epi_assignments')
      .select(`
        id, assigned_at, epi_id, condition_on_delivery,
        epi:epi_inventory(id, tracking_code, catalog:epi_catalog(id, name))
      `)
      .eq('worker_id', selectedWorkerId)
      .is('returned_at', null);"""

new_query = """    const { data, error } = await supabase
      .from('epi_assignments')
      .select(`
        id, assigned_at, catalog_id, condition_on_delivery,
        catalog:epi_catalog(id, name)
      `)
      .eq('worker_id', selectedWorkerId)
      .is('returned_at', null);"""
content = content.replace(old_query, new_query)

content = re.sub(r"\{assignment\.epi\.catalog\.name\} - \{assignment\.epi\.tracking_code\}", "{assignment.catalog.name}", content)

# Look at processSubstituicao
old_process = """  const processSubstituicao = async (signatureDataUrl: string) => {
    if (!pendingReplacement) return;
    setSubmitting(true);
    
    try {
      // 1. Devolve o antigo
      const { error: returnError } = await supabase.rpc('return_epi', {
        p_worker_id: pendingReplacement.workerId,
        p_epi_id: pendingReplacement.oldEpiId,
        p_condition: pendingReplacement.condition
      });
      if (returnError) throw returnError;

      // 2. Entrega o novo
      const { error: assignError } = await supabase.rpc('assign_epi', {
        p_worker_id: pendingReplacement.workerId,
        p_epi_id: pendingReplacement.newEpiId
      });
      if (assignError) throw assignError;
      
      // 3. Atualiza assinatura do novo
      const { data: assignmentData } = await supabase
        .from('epi_assignments')
        .select('id')
        .eq('epi_id', pendingReplacement.newEpiId)
        .eq('worker_id', pendingReplacement.workerId)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .single();

      if (assignmentData) {
        await supabase
          .from('epi_assignments')
          .update({ digital_signature_url: signatureDataUrl })
          .eq('id', assignmentData.id);
      }

      toast({ type: 'success', title: 'Sucesso', message: 'EPI substituído com sucesso.' });
      loadActiveAssignments();
    } catch (err: any) {
      console.error(err);
      toast({ type: 'error', title: 'Erro', message: err.message || 'Falha ao processar substituição.' });
    } finally {
      setSubmitting(false);
      setPendingReplacement(null);
    }
  };"""

new_process = """  const processSubstituicao = async (signatureDataUrl: string) => {
    if (!pendingReplacement) return;
    setSubmitting(true);
    
    try {
      // 1. Devolve o antigo
      const { error: returnError } = await supabase.rpc('return_epi', {
        p_assignment_id: pendingReplacement.oldEpiId,
        p_condition: pendingReplacement.condition
      });
      if (returnError) throw returnError;

      // 2. Entrega o novo
      const { error: assignError } = await supabase.rpc('assign_epi', {
        p_worker_id: pendingReplacement.workerId,
        p_catalog_id: pendingReplacement.newEpiId,
        p_quantity: 1
      });
      if (assignError) throw assignError;
      
      // 3. Atualiza assinatura do novo
      const { data: assignments } = await supabase
        .from('epi_assignments')
        .select('id')
        .eq('catalog_id', pendingReplacement.newEpiId)
        .eq('worker_id', pendingReplacement.workerId)
        .order('assigned_at', { ascending: false })
        .limit(1);

      if (assignments && assignments.length > 0) {
        await supabase
          .from('epi_assignments')
          .update({ digital_signature_url: signatureDataUrl })
          .eq('id', assignments[0].id);
      }

      toast({ type: 'success', title: 'Sucesso', message: 'EPI substituído com sucesso.' });
      loadActiveAssignments();
    } catch (err: any) {
      console.error(err);
      toast({ type: 'error', title: 'Erro', message: err.message || 'Falha ao processar substituição.' });
    } finally {
      setSubmitting(false);
      setPendingReplacement(null);
    }
  };"""
content = content.replace(old_process, new_process)

# Find replacement logic
# We need to find an available EPI of the same catalog type.
# Old: const newEpi = epis.find(e => e.epi_catalog_id === assignment.epi.catalog.id && e.status === 'AVAILABLE');
old_find_epi = """    const newEpi = epis.find(e => e.epi_catalog_id === assignment.epi.catalog.id && e.status === 'AVAILABLE');
    
    if (!newEpi) {
      toast({ type: 'error', title: 'Sem Estoque', message: 'Não há itens disponíveis no estoque para substituição deste modelo.' });
      return;
    }

    setPendingReplacement({
      workerId: selectedWorkerId,
      oldEpiId: assignment.epi_id,
      newEpiId: newEpi.id,
      condition
    });"""

new_find_epi = """    const catalogId = assignment.catalog_id;
    const catalog = catalogs.find(c => c.id === catalogId);
    
    if (!catalog || (catalog.current_stock || 0) < 1) {
      toast({ type: 'error', title: 'Sem Estoque', message: 'Não há itens disponíveis no estoque para substituição deste modelo.' });
      return;
    }

    setPendingReplacement({
      workerId: selectedWorkerId,
      oldEpiId: assignment.id, // This is assignment_id now
      newEpiId: catalogId,
      condition
    });"""
content = content.replace(old_find_epi, new_find_epi)

with open('src/components/features/operations/ReplacementForm.tsx', 'w') as f:
    f.write(content)
