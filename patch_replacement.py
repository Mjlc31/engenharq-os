import os

file_path = 'src/components/features/operations/ReplacementForm.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix query
content = content.replace(
    'epi:epi_inventory(id, tracking_code, epi_catalog_id, catalog:epi_catalog(name))',
    'catalog:epi_catalog(name)'
)
content = content.replace('epi_id, ', 'catalog_id, ')

# Fix JSX
content = content.replace('{a.epi?.catalog?.name} ({a.epi?.tracking_code})', '{a.catalog?.name}')

# Fix handleSubstituicao
old_handle = '''  const handleSubstituicao = (assignmentId: string, epiId: string, catalogId: string) => {
    const availableInventory = epis.filter((e: any) => e.epi_catalog_id === catalogId && e.status === 'AVAILABLE');
    if (availableInventory.length === 0) {
      toast({ type: 'error', title: 'Estoque Insuficiente', message: 'Não há itens disponíveis no estoque para substituição deste mesmo modelo.' });
      return;
    }
    setPendingReplacement({
      workerId: selectedWorkerId,
      oldEpiId: epiId,
      newEpiId: availableInventory[0].id
    });
    setIsSignatureModalOpen(true);
  };'''

new_handle = '''  const handleSubstituicao = (assignmentId: string, catalogId: string) => {
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
  };'''

content = content.replace(old_handle, new_handle)

# Fix onClick call
content = content.replace('onClick={() => handleSubstituicao(a.id, a.epi_id, a.epi?.epi_catalog_id)}', 'onClick={() => handleSubstituicao(a.id, a.catalog_id)}')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied to ReplacementForm.tsx")
