const fs = require('fs');

let code = fs.readFileSync('src/hooks/useEpiAssets.ts', 'utf8');

// We need to modify saveCatalog to generate inventory items for the initial stock.
// Instead of regexing, let's just replace the whole saveCatalog function.
const saveCatalogReplacement = `
  const saveCatalog = async (payload: Partial<EpiCatalog>, id?: string) => {
    setError(null);
    try {
      if (id) {
        const { error: updateError } = await supabase.from('epi_catalog').update(payload as any).eq('id', id);
        if (updateError) throw updateError;
      } else {
        // Create Catalog
        const { data: newCatalog, error: insertError } = await supabase.from('epi_catalog').insert([payload as any]).select().single();
        if (insertError) throw insertError;
        
        // If initial stock is provided, create those inventory items
        const initialStock = payload.current_stock || 0;
        if (initialStock > 0 && newCatalog) {
          const inventoryItems = [];
          
          // Generate a prefix based on category
          const prefix = payload.category ? payload.category.substring(0, 3).toUpperCase() : 'EPI';
          
          for (let i = 1; i <= initialStock; i++) {
            inventoryItems.push({
              catalog_id: newCatalog.id,
              tracking_code: \`\${prefix}-\${Date.now().toString().slice(-4)}-\${i}\`,
              status: 'AVAILABLE',
              category: payload.category || 'EPI',
              ca_number: payload.ca_number || null,
            });
          }
          
          const { error: invError } = await supabase.from('epi_inventory').insert(inventoryItems);
          if (invError) console.error('Erro ao gerar estoque inicial:', invError);
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['epi-assets'] });
    } catch (err: unknown) {
      console.error('Erro ao salvar catálogo:', err);
      throw new Error('Falha ao salvar o modelo de EPI no catálogo.');
    }
  };
`;

code = code.replace(/const saveCatalog = async \([\s\S]*?throw new Error\('Falha ao salvar o modelo de EPI no catálogo\.'\);\n    }\n  };/, saveCatalogReplacement.trim());

fs.writeFileSync('src/hooks/useEpiAssets.ts', code);
console.log('Patched saveCatalog in useEpiAssets.ts');
