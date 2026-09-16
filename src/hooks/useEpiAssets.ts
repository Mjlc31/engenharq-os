import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { EpiInventory, EpiCatalog, Worker } from '../types';
import Papa from 'papaparse';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useEpiAssets() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const { data, isLoading: queryLoading } = useQuery({
    queryKey: ['epi-assets'],
    queryFn: async () => {
      const [workersData, catalogsData] = await Promise.all([
        
        supabase.from('workers').select('*').order('full_name', { ascending: true }),
        supabase.from('epi_catalog').select('*').order('name', { ascending: true })
      ]);
      
      
      if (workersData.error) throw workersData.error;
      if (catalogsData.error) throw catalogsData.error;

      return {
        epis: [],
        workers: (workersData.data as Worker[]) || [],
        catalogs: (catalogsData.data as EpiCatalog[]) || []
      };
    }
  });

  const epis = data?.epis || [];
  const workers = data?.workers || [];
  const catalogs = data?.catalogs || [];

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
      const { error: insertError } = await supabase.from('epi_inventory').insert([
        { category, tracking_code, ca_number: caNumber, status: 'AVAILABLE' }
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
        p_epi_id: epiId
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
        p_epi_id: epiId
      });

      if (error) throw error;
      if (!data) throw new Error('Falha ao devolver EPI via RPC');
        
      await queryClient.invalidateQueries({ queryKey: ['epi-assets'] });
    } catch (err: unknown) {
      console.error('Erro ao devolver EPI:', err);
      throw new Error('Falha ao registrar a devolução do equipamento.');
    }
  };

  const saveCatalog = async (payload: Partial<EpiCatalog>, id?: string, initialStock?: number) => {
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
  };

  const deleteCatalog = async (id: string) => {
    setError(null);
    try {
      const { error: deleteError } = await supabase.from('epi_catalog').delete().eq('id', id);
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

            const { error: insertError } = await supabase.from('epi_inventory').insert(newEpis);
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
    loading: queryLoading || isImporting,
    error,
    setError,
    addEpi,
    assignEpi,
    returnEpi,
    saveCatalog,
    deleteCatalog,
    importInventoryCSV,
    exportInventoryCSV
  };
}
