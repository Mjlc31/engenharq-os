import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Worker, ConstructionSite } from '../types';
import Papa from 'papaparse';

export function useWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [workersData, sitesData] = await Promise.all([
        supabase.from('workers').select('*, site:construction_sites(*)').order('created_at', { ascending: false }),
        supabase.from('construction_sites').select('*').order('name')
      ]);
      
      if (workersData.error) throw workersData.error;
      if (sitesData.error) throw sitesData.error;

      setWorkers((workersData.data as Worker[]) || []);
      setSites((sitesData.data as ConstructionSite[]) || []);
    } catch (err: unknown) {
      console.error('Erro ao buscar dados:', err);
      setError('Falha ao carregar dados dos trabalhadores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addWorker = async (workerData: Partial<Worker>) => {
    setError(null);
    try {
      const { error: insertError } = await supabase.from('workers').insert([workerData as any]);
      if (insertError) throw insertError;
      await loadData();
    } catch (err: unknown) {
      console.error('Erro ao criar trabalhador:', err);
      throw new Error('Falha ao registrar trabalhador. Verifique os dados e tente novamente.');
    }
  };

  const importCSV = (file: File) => {
    return new Promise<void>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            setLoading(true);
            const newWorkers = results.data
              .map((row: Record<string, string>) => ({
                full_name: row['Nome Completo'] || row['Nome'] || row['full_name'],
                cpf: row['CPF'] || row['cpf'],
                registration_number: row['Matrícula'] || row['Matricula'] || row['registration_number']
              }))
              .filter((w: { full_name: string; cpf: string; registration_number: string }) => w.full_name && w.cpf && w.registration_number);

            if (newWorkers.length === 0) {
              throw new Error('Nenhum dado válido encontrado no CSV.');
            }

            const { error: insertError } = await supabase.from('workers').insert(newWorkers);
            if (insertError) throw insertError;
            
            await loadData();
            resolve();
          } catch (err: unknown) {
            console.error('Erro ao importar CSV:', err);
            const msg = err instanceof Error ? err.message : 'Falha ao importar. Verifique se os CPFs ou Matrículas já existem no sistema.';
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

  const exportCSV = () => {
    const csvData = workers.map(w => ({
      'Nome Completo': w.full_name,
      'CPF': w.cpf,
      'Matrícula': w.registration_number,
      'Obra Atual': w.site?.name || 'Não alocado'
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `engenharq_colaboradores_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteWorker = async (id: string) => {
    setError(null);
    try {
      const { error: deleteError } = await supabase.from('workers').delete().eq('id', id);
      if (deleteError) throw deleteError;
      await loadData();
    } catch (err: unknown) {
      console.error('Erro ao deletar trabalhador:', err);
      throw new Error('Falha ao remover trabalhador. Verifique dependências.');
    }
  };

  return {
    workers,
    sites,
    loading,
    error,
    setError,
    addWorker,
    deleteWorker,
    importCSV,
    exportCSV
  };
}
