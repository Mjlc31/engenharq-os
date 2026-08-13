import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Worker } from '../types';
import { useToast } from '../components/ui/Toast';

export function useWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('workers')
        .select('*, site:construction_sites(*)')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setWorkers(data as Worker[] || []);
      return data;
    } catch (err: any) {
      console.error('Erro ao buscar trabalhadores:', err);
      setError('Falha ao carregar os trabalhadores.');
      toast({ type: 'error', title: 'Erro de Carregamento', message: 'Falha ao carregar os trabalhadores.' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const addWorker = async (workerData: Partial<Worker>) => {
    try {
      const { error: insertError } = await supabase.from('workers').insert([workerData]);
      if (insertError) throw insertError;
      toast({ type: 'success', title: 'Sucesso', message: 'Trabalhador registrado com sucesso.' });
      await fetchWorkers();
      return true;
    } catch (err: any) {
      console.error('Erro ao registrar trabalhador:', err);
      toast({ type: 'error', title: 'Erro no Registro', message: 'Falha ao registrar novo trabalhador.' });
      return false;
    }
  };

  return { workers, setWorkers, loading, error, fetchWorkers, addWorker };
}
