import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Worker, ConstructionSite } from '../types';
import Papa from 'papaparse';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useWorkers() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const { data, isLoading: queryLoading } = useQuery({
    queryKey: ['workers-sites'],
    queryFn: async () => {
      const [workersData, sitesData] = await Promise.all([
        supabase.from('workers').select('*, site:construction_sites(*)').order('created_at', { ascending: false }),
        supabase.from('construction_sites').select('*').order('name')
      ]);
      
      if (workersData.error) throw workersData.error;
      if (sitesData.error) throw sitesData.error;

      return {
        workers: (workersData.data as Worker[]) || [],
        sites: (sitesData.data as ConstructionSite[]) || []
      };
    }
  });

  const workers = data?.workers || [];
  const sites = data?.sites || [];

  const addWorkerMutation = useMutation({
    mutationFn: async (workerData: Partial<Worker>) => {
      const { error: insertError } = await supabase.from('workers').insert([workerData as any]);
      if (insertError) throw insertError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workers-sites'] }),
    onError: (err: any) => {
      console.error('Erro ao criar trabalhador:', err);
      throw new Error('Falha ao registrar trabalhador. Verifique os dados e tente novamente.');
    }
  });

  const addWorker = async (workerData: Partial<Worker>) => {
    setError(null);
    return addWorkerMutation.mutateAsync(workerData);
  };

  const importCSV = (file: File) => {
    return new Promise<void>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            setIsImporting(true);
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
            
            await queryClient.invalidateQueries({ queryKey: ['workers-sites'] });
            resolve();
          } catch (err: unknown) {
            console.error('Erro ao importar CSV:', err);
            const msg = err instanceof Error ? err.message : 'Falha ao importar. Verifique se os CPFs ou Matrículas já existem no sistema.';
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

  const deleteWorkerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: deleteError } = await supabase.from('workers').delete().eq('id', id);
      if (deleteError) throw deleteError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workers-sites'] }),
    onError: (err: any) => {
      console.error('Erro ao deletar trabalhador:', err);
      throw new Error('Falha ao remover trabalhador. Verifique dependências.');
    }
  });

  const deleteWorker = async (id: string) => {
    setError(null);
    return deleteWorkerMutation.mutateAsync(id);
  };

  return {
    workers,
    sites,
    loading: queryLoading || isImporting,
    error,
    setError,
    addWorker,
    deleteWorker,
    importCSV,
    exportCSV
  };
}
