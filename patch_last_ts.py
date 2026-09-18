import os

# ReplacementForm
f1 = 'src/components/features/operations/ReplacementForm.tsx'
if os.path.exists(f1):
    with open(f1, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('onClick={() => handleSubstituicao(a.id, a.catalog_id, a.epi?.epi_catalog_id)}', 'onClick={() => handleSubstituicao(a.id, a.catalog_id)}')
    with open(f1, 'w', encoding='utf-8') as f:
        f.write(c)

# Reports
f2 = 'src/pages/Reports.tsx'
if os.path.exists(f2):
    with open(f2, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('e.catalog?.ca_validity', '(e.catalog as any)?.ca_validity')
    with open(f2, 'w', encoding='utf-8') as f:
        f.write(c)

# useEpiAssets
f3 = 'src/hooks/useEpiAssets.ts'
if os.path.exists(f3):
    with open(f3, 'r', encoding='utf-8') as f:
        c = f.read()
    old = '''  const returnEpi = async (epiId: string) => {
    setError(null);
    try {
      const { data, error } = await supabase.rpc('return_epi', {
        p_catalog_id: epiId, p_quantity: 1
      });'''
    new = '''  const returnEpi = async (epiId: string) => {
    setError(null);
    try {
      const { data, error } = await supabase.rpc('return_epi', {
        p_assignment_id: epiId, p_condition: 'GOOD'
      });'''
    c = c.replace(old, new)
    with open(f3, 'w', encoding='utf-8') as f:
        f.write(c)

# useEpiInventory
f4 = 'src/hooks/useEpiInventory.ts'
if os.path.exists(f4):
    with open(f4, 'r', encoding='utf-8') as f:
        c = f.read()
    old2 = '''  const returnEpi = async (epiId: string) => {
    setError(null);
    try {
      const { data, error } = await supabase.rpc('return_epi', {
        p_catalog_id: epiId, p_quantity: 1
      });'''
    new2 = '''  const returnEpi = async (epiId: string) => {
    setError(null);
    try {
      const { data, error } = await supabase.rpc('return_epi', {
        p_assignment_id: epiId, p_condition: 'GOOD'
      });'''
    c = c.replace(old2, new2)
    with open(f4, 'w', encoding='utf-8') as f:
        f.write(c)

print("Done")
