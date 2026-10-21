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
    try {
      if (id) {
        const updatePayload: any = { ...payload };
        if (initialStock !== undefined) {
          updatePayload.current_stock = initialStock;
        }
        const { error: updateError } = await supabase.from('epi_catalog').update(updatePayload).eq('id', id);
        if (updateError) throw updateError;

        // Se uma obra foi selecionada, atualizar ou inserir no site_inventory
        if (siteId && initialStock !== undefined) {
          await supabase.from('site_inventory').upsert({
            site_id: siteId,
            catalog_id: id,
            quantity: initialStock,
            updated_at: new Date().toISOString()
          }, { onConflict: 'site_id,catalog_id' });
        }
      } else {
        const payloadWithStock = { ...payload, current_stock: initialStock ?? 0 };
        const { data: newCat, error: insertError } = await supabase.from('epi_catalog').insert([payloadWithStock as any]).select().single();
        if (insertError) throw insertError;

        // Se houver estoque inicial, registrar no histórico de compras
        if (newCat && initialStock && initialStock > 0) {
          await supabase.from('epi_purchases').insert({
            catalog_id: newCat.id,
            site_id: siteId || null,
            quantity: initialStock,
            unit_price: payload.unit_price || 0,
            invoice_number: 'INICIAL',
            supplier: 'ESTOQUE INICIAL',
            notes: 'Cadastro inicial de modelo com lote.'
          });

          // Se houver obra vinculada, registrar também no estoque da obra
          if (siteId) {
            await supabase.from('site_inventory').upsert({
              site_id: siteId,
              catalog_id: newCat.id,
              quantity: initialStock,
              updated_at: new Date().toISOString()
            }, { onConflict: 'site_id,catalog_id' });
          }
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['epi-assets'] });
      await queryClient.invalidateQueries({ queryKey: ['site-inventory'] });
    } catch (err: unknown) {
      console.error('Erro ao salvar catálogo:', err);
      throw new Error('Falha ao salvar o modelo de EPI no catálogo.');
    }
  };

  const updateSiteStock = async (siteId: string, catalogId: string, quantity: number) => {
    setError(null);
    try {
      const qty = Math.max(0, quantity);
      const { error: upsertError } = await supabase.from('site_inventory').upsert({
        site_id: siteId,
        catalog_id: catalogId,
        quantity: qty,
        updated_at: new Date().toISOString()
      }, { onConflict: 'site_id,catalog_id' });

      if (upsertError) throw upsertError;
      await queryClient.invalidateQueries({ queryKey: ['epi-assets'] });
    } catch (err: any) {
      console.error('Erro ao atualizar estoque da obra:', err);
      throw new Error('Falha ao atualizar estoque na obra selecionada.');
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
      throw new Error('Falha ao excluir o modelo. Pode estar em uso.');
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
              .map((row: Record<string, string>) => ({
                category: row['Categoria'] || row['category'],
                tracking_code: row['Código Rastreio'] || row['Codigo Rastreio'] || row['tracking_code'],
                ca_number: row['CA'] || row['ca_number'],
                size: row['Tamanho'] || row['size'] || 'Único',
                ca_expiration_date: row['Validade CA'] || row['ca_expiration_date'] || null,
                recommended_lifespan_days: parseInt(row['Vida Útil (dias)'] || row['recommended_lifespan_days'] || '180', 10),
                status: row['Status'] || row['status'] || 'AVAILABLE'
              }))
              .filter((e: { category: string; tracking_code: string; ca_number: string }) => e.category && e.tracking_code && e.ca_number);

            if (newEpis.length === 0) {
              throw new Error('Nenhum dado válido encontrado no CSV.');
            }

            const { error: insertError } = await supabase.from('epi_catalog').insert(newEpis);
            if (insertError) throw insertError;
            
            await queryClient.invalidateQueries({ queryKey: ['epi-assets'] });
            resolve();
          } catch (err: unknown) {
            console.error('Erro ao importar CSV:', err);
            const msg = err instanceof Error ? err.message : 'Falha ao importar EPIs. Verifique se os Códigos de Rastreio já existem.';
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
    const csvData = epis.map(e => ({
      'Categoria': e.category,
      'Código Rastreio': e.tracking_code,
      'CA': e.ca_number,
      'Tamanho': e.size || 'Único',
      'Validade CA': e.ca_expiration_date || '',
      'Vida Útil (dias)': e.recommended_lifespan_days || 180,
      'Status': e.status
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `engenharq_estoque_${new Date().toISOString().slice(0,10)}.csv`);
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
