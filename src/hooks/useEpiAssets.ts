import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { EpiInventory, EpiCatalog, Worker } from '../types';
import Papa from 'papaparse';

export function useEpiAssets() {
  const [epis, setEpis] = useState<EpiInventory[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [catalogs, setCatalogs] = useState<EpiCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [episData, workersData, catalogsData] = await Promise.all([
        supabase.from('epi_inventory').select('*').order('created_at', { ascending: false }),
        supabase.from('workers').select('*').order('full_name', { ascending: true }),
        supabase.from('epi_catalog').select('*').order('name', { ascending: true })
      ]);
      
      if (episData.error) throw episData.error;
      if (workersData.error) throw workersData.error;
      if (catalogsData.error) throw catalogsData.error;

      setEpis((episData.data as EpiInventory[]) || []);
      setWorkers((workersData.data as Worker[]) || []);
      setCatalogs((catalogsData.data as EpiCatalog[]) || []);
    } catch (err: unknown) {
      console.error('Erro ao buscar dados:', err);
      setError('Falha ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addEpi = async (category: string, caNumber: string) => {
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
      await loadData();
    } catch (err: unknown) {
      console.error('Erro ao criar EPI:', err);
      throw new Error('Falha ao registrar novo equipamento.');
    }
  };

  const assignEpi = async (epiId: string, workerId: string) => {
    setError(null);
    try {
      const { error: assignError } = await supabase.from('epi_assignments').insert([
        { epi_id: epiId, worker_id: workerId }
      ]);
      if (assignError) throw assignError;

      const { error: updateError } = await supabase.from('epi_inventory').update({ status: 'IN_USE' }).eq('id', epiId);
      if (updateError) throw updateError;

      await loadData();
    } catch (err: unknown) {
      console.error('Erro ao designar EPI:', err);
      throw new Error('Falha ao designar equipamento ao trabalhador.');
    }
  };

  const returnEpi = async (epiId: string) => {
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.from('epi_assignments')
        .select('*')
        .eq('epi_id', epiId)
        .is('returned_at', null)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (data) {
        const { error: updateAssignError } = await supabase.from('epi_assignments')
          .update({ returned_at: new Date().toISOString(), condition_on_return: 'GOOD' })
          .eq('id', data.id);
        
        if (updateAssignError) throw updateAssignError;
      }

      const { error: updateEpiError } = await supabase.from('epi_inventory')
        .update({ status: 'AVAILABLE' })
        .eq('id', epiId);
      
      if (updateEpiError) throw updateEpiError;
        
      await loadData();
    } catch (err: unknown) {
      console.error('Erro ao devolver EPI:', err);
      throw new Error('Falha ao registrar a devolução do equipamento.');
    }
  };

  const saveCatalog = async (payload: Partial<EpiCatalog>, id?: string) => {
    setError(null);
    try {
      if (id) {
        const { error: updateError } = await supabase.from('epi_catalog').update(payload as any).eq('id', id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('epi_catalog').insert([payload as any]);
        if (insertError) throw insertError;
      }
      await loadData();
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
      await loadData();
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
            setLoading(true);
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
            
            await loadData();
            resolve();
          } catch (err: unknown) {
            console.error('Erro ao importar CSV:', err);
            const msg = err instanceof Error ? err.message : 'Falha ao importar EPIs. Verifique se os Códigos de Rastreio já existem.';
            setError(msg);
            reject(err);
          } finally {
            setLoading(false);
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
    loading,
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
