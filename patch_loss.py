import os

file_path = 'src/components/features/operations/LossForm.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix handleExtravio
old_handle = '''  const handleExtravio = async (assignmentId: string, epiId: string) => {
    if (!window.confirm('Tem certeza? O EPI será marcado como extraviado/perdido e removido permanentemente do estoque.')) return;
    
    setSubmitting(true);
    try {
      // 1. Marca como descartado no inventário (não volta pro estoque)
      const { error: epiError } = await supabase
        .from('epi_inventory')
        .update({ status: 'DISCARDED' })
        .eq('id', epiId);
      if (epiError) throw epiError;

      // 2. Encerra o assignment
      const { error: assignError } = await supabase
        .from('epi_assignments')
        .update({ returned_at: new Date().toISOString(), condition_on_return: 'DAMAGED' })
        .eq('id', assignmentId);
      if (assignError) throw assignError;

      toast({ type: 'success', title: 'Sucesso', message: 'EPI registrado como extraviado.' });
      loadActiveAssignments();
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };'''

new_handle = '''  const handleExtravio = async (assignmentId: string) => {
    if (!window.confirm('Tem certeza? O EPI será marcado como extraviado/perdido e não retornará ao estoque.')) return;
    
    setSubmitting(true);
    try {
      // Usa o RPC para retornar com condição DAMAGED (assim o estoque não é incrementado)
      const { error } = await supabase.rpc('return_epi', {
        p_assignment_id: assignmentId,
        p_condition: 'DAMAGED'
      });
      if (error) throw error;

      toast({ type: 'success', title: 'Sucesso', message: 'EPI registrado como extraviado.' });
      loadActiveAssignments();
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };'''

content = content.replace(old_handle, new_handle)

# Fix JSX
content = content.replace('{a.epi?.catalog?.name} ({a.epi?.tracking_code})', '{a.catalog?.name}')
content = content.replace('onClick={() => handleExtravio(a.id, a.epi_id)}', 'onClick={() => handleExtravio(a.id)}')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied to LossForm.tsx")
