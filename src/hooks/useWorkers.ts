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
      const { data: newWorker, error: insertError } = await supabase
        .from('workers')
        .insert([workerData as any])
        .select()
        .single();
        
      if (insertError) throw insertError;

      // Se houver initial_role, insere no histórico também
      if (newWorker && newWorker.initial_role) {
        await supabase.from('worker_roles_history').insert([{
          worker_id: newWorker.id,
          role_name: newWorker.initial_role,
          start_date: newWorker.admission_date || new Date().toISOString().split('T')[0]
        }]);
      }
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

  const downloadTemplateCSV = () => {
    const templateData = [{
      'Nome Completo (*)': 'João da Silva',
      'CPF (*)': '123.456.789-00',
      'Matrícula (*)': 'MAT-001',
      'Email': 'joao@email.com',
      'Função': 'Pedreiro',
      'Data de Admissão (DD/MM/AAAA)': '15/01/2023',
      'Data de Nascimento (DD/MM/AAAA)': '20/05/1985',
      'Setor': 'Obras',
      'Tamanho Uniforme': 'M',
      'Tamanho Bota': '42',
      'Apto Altura/Confinado (Sim/Não)': 'Sim',
      'Telefone': '(11) 99999-9999',
      'Status (Ativo/Inativo/Férias/Desligado)': 'Ativo'
    }];
    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo_importacao_colaboradores.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              .map((row: Record<string, string>) => {
                const parseDate = (dateStr?: string) => {
                  if (!dateStr) return null;
                  const parts = dateStr.split('/');
                  if (parts.length === 3) {
                    return `${parts[2]}-${parts[1]}-${parts[0]}`;
                  }
                  return dateStr;
                };

                const parseBoolean = (val?: string) => {
                  if (!val) return null;
                  const lower = val.toLowerCase().trim();
                  return ['sim', 's', 'yes', 'y', 'true', '1'].includes(lower);
                };

                const parseStatus = (val?: string) => {
                  if (!val) return 'ACTIVE';
                  const lower = val.toLowerCase().trim();
                  if (lower === 'inativo') return 'INACTIVE';
                  if (lower === 'férias' || lower === 'ferias') return 'VACATION';
                  if (lower === 'desligado') return 'DISMISSED';
                  return 'ACTIVE';
                };

                return {
                  full_name: row['Nome Completo (*)'] || row['Nome Completo'] || row['Nome'] || row['full_name'],
                  cpf: row['CPF (*)'] || row['CPF'] || row['cpf'],
                  registration_number: row['Matrícula (*)'] || row['Matrícula'] || row['Matricula'] || row['registration_number'],
                  email: row['Email'] || row['email'] || null,
                  initial_role: row['Função'] || row['initial_role'] || null,
                  current_role: row['Função'] || row['current_role'] || null,
                  admission_date: parseDate(row['Data de Admissão (DD/MM/AAAA)'] || row['Data de Admissão']),
                  birth_date: parseDate(row['Data de Nascimento (DD/MM/AAAA)'] || row['Data de Nascimento']),
                  work_sector: row['Setor'] || row['work_sector'] || null,
                  uniform_size: row['Tamanho Uniforme'] || row['uniform_size'] || null,
                  boot_size: row['Tamanho Bota'] || row['boot_size'] || null,
                  apt_for_height_and_confined_space: parseBoolean(row['Apto Altura/Confinado (Sim/Não)'] || row['Apto']),
                  phone_contact: row['Telefone'] || row['phone_contact'] || null,
                  status: parseStatus(row['Status (Ativo/Inativo/Férias/Desligado)'] || row['Status'])
                };
              })
              .filter((w) => w.full_name && w.cpf && w.registration_number);

            if (newWorkers.length === 0) {
              throw new Error('Nenhum dado válido encontrado no CSV. Verifique se as colunas Nome Completo, CPF e Matrícula estão preenchidas.');
            }

            const cpfsArray = newWorkers.map((w) => w.cpf);

            const { data: existingWorkers, error: checkError } = await supabase
              .from('workers')
              .select('cpf')
              .in('cpf', cpfsArray);

            if (checkError) throw checkError;

            const existingCpfs = existingWorkers?.map((w) => w.cpf) || [];
            const filteredWorkers = newWorkers.filter((w) => !existingCpfs.includes(w.cpf));

            if (filteredWorkers.length === 0) {
              throw new Error('Todos os colaboradores desta planilha já estão cadastrados (CPFs duplicados).');
            }

            const { error: insertError } = await supabase.from('workers').insert(filteredWorkers);
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
    link.download = `engenharq_colaboradores_${new Date().toISOString().slice(0, 10)}.csv`;
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
    exportCSV,
    downloadTemplateCSV
  };
}
