import re

with open('src/hooks/useEpiAssets.ts', 'r') as f:
    content = f.read()

# 1. Remove epi_inventory fetch
content = re.sub(
    r"supabase\.from\('epi_inventory'\)\.select\('\*'\)\.order\('created_at', \{ ascending: false \}\),",
    "",
    content
)
content = re.sub(r"if \(episData\.error\) throw episData\.error;", "", content)
content = re.sub(r"epis: \(episData\.data as EpiInventory\[\]\) \|\| \[\],", "epis: [],", content)
content = re.sub(r"const \[episData, workersData, catalogsData\] = await Promise\.all\(\[", "const [workersData, catalogsData] = await Promise.all([", content)

# 2. Rewrite saveCatalog
# We no longer generate epi_inventory rows in saveCatalog
save_catalog_old = """  const saveCatalog = async (payload: Partial<EpiCatalog>, id?: string, initialStock?: number) => {
    setError(null);
    try {
      if (id) {
        const { error: updateError } = await supabase.from('epi_catalog').update(payload as any).eq('id', id);
        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase.from('epi_catalog').insert([payload as any]).select().single();
        if (insertError) throw insertError;
        
        if (initialStock && initialStock > 0 && data) {
          const prefix = payload.category!.substring(0, 3).toUpperCase();
          const existingSamePrefix = epis.filter(e => e.tracking_code.startsWith(prefix));
          let nextNum = 1;
          if (existingSamePrefix.length > 0) {
            const nums = existingSamePrefix.map(e => parseInt(e.tracking_code.replace(prefix, '') || '0'));
            nextNum = Math.max(...nums) + 1;
          }
          
          const newItems = Array.from({ length: initialStock }).map((_, i) => ({
            epi_catalog_id: data.id,
            category: payload.category,
            tracking_code: `${prefix}${String(nextNum + i).padStart(3, '0')}`,
            ca_number: payload.ca_number || 'N/A',
            ca_expiration_date: payload.ca_validity || null,
            recommended_lifespan_days: payload.lifespan_days || 180,
            status: 'AVAILABLE' as const
          }));
          
          const { error: stockError } = await supabase.from('epi_inventory').insert(newItems);
          if (stockError) throw stockError;
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['epi-assets'] });
    } catch (err: unknown) {
      console.error('Erro ao salvar catálogo:', err);
      throw new Error('Falha ao salvar o modelo de EPI no catálogo.');
    }
  };"""

save_catalog_new = """  const saveCatalog = async (payload: Partial<EpiCatalog>, id?: string, initialStock?: number) => {
    setError(null);
    try {
      if (id) {
        const { error: updateError } = await supabase.from('epi_catalog').update(payload as any).eq('id', id);
        if (updateError) throw updateError;
      } else {
        const payloadWithStock = { ...payload, current_stock: initialStock || 0 };
        const { error: insertError } = await supabase.from('epi_catalog').insert([payloadWithStock as any]);
        if (insertError) throw insertError;
      }
      await queryClient.invalidateQueries({ queryKey: ['epi-assets'] });
    } catch (err: unknown) {
      console.error('Erro ao salvar catálogo:', err);
      throw new Error('Falha ao salvar o modelo de EPI no catálogo.');
    }
  };"""

content = content.replace(save_catalog_old, save_catalog_new)

with open('src/hooks/useEpiAssets.ts', 'w') as f:
    f.write(content)
