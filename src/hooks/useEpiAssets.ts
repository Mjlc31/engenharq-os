import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { EpiInventory, EpiCatalog, Worker, ConstructionSite, SiteInventory } from '../types';
import Papa from 'papaparse';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useEpiAssets() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const { data, isLoading: queryLoading } = useQuery({
    queryKey: ['epi-assets'],
    queryFn: async () => {
      const [workersData, catalogsData, sitesData, siteInvData] = await Promise.all([
        supabase.from('workers').select('*').is('deleted_at', null).order('full_name', { ascending: true }),
        supabase.from('epi_catalog').select('*').is('deleted_at', null).order('name', { ascending: true }),
        supabase.from('construction_sites').select('*').is('deleted_at', null).order('name', { ascending: true }),
        supabase.from('site_inventory').select('*')
      ]);
      
      if (workersData.error) throw workersData.error;
      if (catalogsData.error) throw catalogsData.error;

      return {
        epis: [],
        workers: (workersData.data as Worker[]) || [],
        catalogs: (catalogsData.data as EpiCatalog[]) || [],
        sites: (sitesData.data as ConstructionSite[]) || [],
        siteInventories: (siteInvData.data as SiteInventory[]) || []
      };
    }
  });

  const epis = data?.epis || [];
  const workers = data?.workers || [];
  const catalogs = data?.catalogs || [];
  const sites = data?.sites || [];
  const siteInventories = data?.siteInventories || [];

  const addEpi = async (category: string, caNumber: string): Promise<string> => {
    setError(null);
    const prefix = category.substring(0, 3).toUpperCase();
    const existingSamePrefix = epis.filter(e => e.tracking_code.startsWith(prefix));
    let nextNum = 1;
    if (existingSamePrefix.length > 0) {
      const nums = existingSamePrefix.map(e => parseInt(e.tracking_code.replace(prefix, '') || '0'));
      nextNum = Math.max(...nums) + 1;
    }
    const tracking_code = `${prefix}${nextNum.toString().padStart(2, '0')}`;
    
    try {
      const { error: insertError } = await supabase.from('epi_catalog').insert([
        { name: category, category, tracking_code, ca_number: caNumber, status: 'AVAILABLE' }
      ]);
      if (insertError) throw insertError;
      await queryClient.invalidateQueries({ queryKey: ['epi-assets'] });
      return tracking_code;
    } catch (err: unknown) {
      console.error('Erro ao criar EPI:', err);
      throw new Error('Falha ao registrar novo equipamento.');
    }
  };

  const assignEpi = async (epiId: string, workerId: string) => {
    setError(null);
    try {
      const { data, error } = await supabase.rpc('assign_epi', {
        p_worker_id: workerId,
        p_catalog_id: epiId, p_quantity: 1
      });
      
      if (error) throw error;
      if (!data) throw new Error('Falha ao designar EPI via RPC');

      await queryClient.invalidateQueries({ queryKey: ['epi-assets'] });
    } catch (err: unknown) {
      console.error('Erro ao designar EPI:', err);
      throw new Error('Falha ao designar equipamento ao trabalhador.');
    }
  };

  const returnEpi = async (epiId: string) => {
    setError(null);
    try {
      const { data, error } = await supabase.rpc('return_epi', {
        p_assignment_id: epiId, p_condition: 'GOOD'
      });

      if (error) throw error;
      if (!data) throw new Error('Falha ao devolver EPI via RPC');
        
      await queryClient.invalidateQueries({ queryKey: ['epi-assets'] });
    } catch (err: unknown) {
      console.error('Erro ao devolver EPI:', err);
      throw new Error('Falha ao registrar a devolução do equipamento.');
    }
  };

  const saveCatalog = async (payload: Partial<EpiCatalog>, id?: string, initialStock?: number, siteId?: string) => {
    setError(null);
    // Estoque só muda por RPC (Kardex + saldo por obra); epi_catalog.current_stock é a soma das obras, calculada no banco.
    try {
      if (id) {
        const { error: updateError } = await supabase.from('epi_catalog').update(payload as any).eq('id', id);
        if (updateError) throw updateError;

        // O campo "Saldo em Estoque" mostra o total do catálogo: aplica só a diferença na obra escolhida
        if (initialStock !== undefined) {
          const { data: cat, error: catError } = await supabase.from('epi_catalog').select('current_stock').eq('id', id).single();
          if (catError) throw catError;
          const delta = initialStock - (cat?.current_stock ?? 0);
          if (delta !== 0) {
            if (!siteId) throw new Error('Selecione a obra para ajustar o saldo.');
            const { data: inv, error: invError } = await supabase
              .from('site_inventory').select('quantity').eq('site_id', siteId).eq('catalog_id', id).maybeSingle();
            if (invError) throw invError;
            const { error: rpcError } = await supabase.rpc('set_site_stock', {
              p_catalog_id: id,
              p_site_id: siteId,
              p_quantity: (inv?.quantity ?? 0) + delta,
              p_notes: 'Ajuste pelo cadastro do EPI'
            });
            if (rpcError) throw rpcError;
          }
        }
      } else {
        const hasInitialStock = !!initialStock && initialStock > 0;
        if (hasInitialStock && !siteId) throw new Error('Selecione a obra que recebe o estoque inicial.');

        const { data: newCat, error: insertError } = await supabase.from('epi_catalog').insert([payload as any]).select().single();
        if (insertError) throw insertError;

        if (newCat && hasInitialStock && siteId) {
          const { error: rpcError } = await supabase.rpc('register_stock_entry', {
            p_catalog_id: newCat.id,
            p_site_id: siteId,
            p_quantity: initialStock,
            p_unit_price: payload.unit_price || 0,
            p_invoice_number: 'INICIAL',
            p_supplier: 'ESTOQUE INICIAL',
            p_notes: 'Cadastro inicial de modelo com lote.'
          });
          if (rpcError) throw rpcError;
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['epi-assets'] });
      await queryClient.invalidateQueries({ queryKey: ['site-inventory'] });
    } catch (err: unknown) {
      console.error('Erro ao salvar catálogo:', err);
      throw new Error((err as { message?: string })?.message || 'Falha ao salvar o modelo de EPI no catálogo.');
    }
  };

  const updateSiteStock = async (siteId: string, catalogId: string, quantity: number) => {
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('set_site_stock', {
        p_catalog_id: catalogId,
        p_site_id: siteId,
        p_quantity: Math.max(0, quantity),
        p_notes: 'Ajuste manual de saldo'
      });
      if (rpcError) throw rpcError;
      await queryClient.invalidateQueries({ queryKey: ['epi-assets'] });
    } catch (err: unknown) {
      console.error('Erro ao atualizar estoque da obra:', err);
      throw new Error((err as { message?: string })?.message || 'Falha ao atualizar estoque na obra selecionada.');
    }
  };

  const deleteCatalog = async (id: string) => {
    setError(null);
    try {
      const { error: deleteError } = await supabase.from('epi_catalog').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (deleteError) throw deleteError;
      await queryClient.invalidateQueries({ queryKey: ['epi-assets'] });
    } catch (err: unknown) {
      console.error('Erro ao excluir catálogo:', err);
      throw new Error((err as { message?: string })?.message || 'Falha ao excluir o modelo.');
    }
  };

  const importInventoryCSV = (file: File) => {
    return new Promise<void>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            setIsImporting(true);
            const newEpis = results.data
              .map((row: any) => ({
                name: row['Nome'] || row['name'] || row['Nome do EPI'] || 'EPI Sem Nome',
                category: row['Categoria'] || row['category'] || 'PROTECAO_CABECA',
                brand: row['Marca'] || row['brand'] || null,
                model: row['Modelo'] || row['model'] || null,
                ca_number: row['CA'] || row['ca_number'] || null,
                ca_validity: row['Validade CA'] || row['ca_validity'] || null,
                lifespan_days: parseInt(row['Vida Útil (dias)'] || row['lifespan_days'] || '180', 10),
                minimum_stock: parseInt(row['Estoque Mínimo'] || row['minimum_stock'] || '5', 10),
                unit_price: parseFloat(row['Preço Unitário'] || row['unit_price'] || '0') || 0,
                status: 'ACTIVE'
              }))
              .filter((e: { name: string; category: string }) => e.name && e.category);

            if (newEpis.length === 0) {
              throw new Error('Nenhum dado válido encontrado no CSV.');
            }

            const { error: insertError } = await supabase.from('epi_catalog').insert(newEpis);
            if (insertError) throw insertError;
            
            await queryClient.invalidateQueries({ queryKey: ['epi-assets'] });
            resolve();
          } catch (err: unknown) {
            console.error('Erro ao importar CSV:', err);
            const msg = err instanceof Error ? err.message : 'Falha ao importar EPIs. Verifique se os dados estão corretos.';
            setError(msg);
            reject(err);
          } finally {
            setIsImporting(false);
          }
        },
        error: (err) => {
          console.error('Erro no parse do CSV:', err);
          setError('Erro ao ler o arquivo CSV.');
          reject(err);
        }
      });
    });
  };

  const exportInventoryCSV = () => {
    const csvData = catalogs.map(c => ({
      'Código': c.code || '',
      'Nome do EPI': c.name,
      'Categoria': c.category,
      'Marca': c.brand || '',
      'Modelo': c.model || '',
      'Número CA': c.ca_number || '',
      'Validade CA': c.ca_validity || '',
      'Estoque Atual': c.current_stock || 0,
      'Estoque Mínimo': c.minimum_stock || 0,
      'Preço Unitário (R$)': c.unit_price ? Number(c.unit_price).toFixed(2) : '0.00',
      'Vida Útil (dias)': c.lifespan_days || 180,
      'Status': c.status || 'ACTIVE'
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `engenharq_catalogo_estoque_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    epis,
    workers,
    catalogs,
    sites,
    siteInventories,
    loading: queryLoading || isImporting,
    error,
    setError,
    addEpi,
    assignEpi,
    returnEpi,
    saveCatalog,
    deleteCatalog,
    updateSiteStock,
    importInventoryCSV,
    exportInventoryCSV
  };
}
