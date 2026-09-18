import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { EpiInventory } from '../types';
import { useToast } from '../components/ui/Toast';

export function useEpiInventory() {
  const [epis, setEpis] = useState<EpiInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEpis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('epi_inventory')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setEpis(data as EpiInventory[] || []);
      return data;
    } catch (err: any) {
      console.error('Erro ao buscar EPIs:', err);
      setError('Falha ao carregar o inventário.');
      toast({ type: 'error', title: 'Erro de Carregamento', message: 'Falha ao carregar o inventário.' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const addEpi = async (epiData: Partial<EpiInventory>) => {
    try {
      const { error: insertError } = await supabase.from('epi_inventory').insert([epiData as any]);
      if (insertError) throw insertError;
      toast({ type: 'success', title: 'Sucesso', message: 'Equipamento registrado com sucesso.' });
      await fetchEpis();
      return true;
    } catch (err: any) {
      console.error('Erro ao criar EPI:', err);
      toast({ type: 'error', title: 'Erro no Registro', message: 'Falha ao registrar novo equipamento.' });
      return false;
    }
  };
  
  const assignEpi = async (epiId: string, workerId: string) => {
    try {
      const { data, error } = await supabase.rpc('assign_epi', {
        p_worker_id: workerId,
        p_catalog_id: epiId, p_quantity: 1
      });
      
      if (error) throw error;
      if (!data) throw new Error('Falha ao designar EPI via RPC');

      toast({ type: 'success', title: 'Sucesso', message: 'Equipamento designado com sucesso.' });
      await fetchEpis();
      return true;
    } catch (err: any) {
      console.error('Erro ao designar EPI:', err);
      toast({ type: 'error', title: 'Erro na Designação', message: 'Falha ao designar equipamento ao trabalhador.' });
      return false;
    }
  };

  const returnEpi = async (epiId: string) => {
    try {
      const { data, error } = await supabase.rpc('return_epi', {
        p_assignment_id: epiId, p_condition: "GOOD"
      });

      if (error) throw error;
      if (!data) throw new Error('Falha ao devolver EPI via RPC');
        
      toast({ type: 'success', title: 'Devolvido', message: 'Equipamento devolvido com sucesso.' });
      await fetchEpis();
      return true;
    } catch (err: any) {
      console.error('Erro ao devolver EPI:', err);
      toast({ type: 'error', title: 'Erro na Devolução', message: 'Falha ao registrar a devolução do equipamento.' });
      return false;
    }
  };

  return { epis, setEpis, loading, error, fetchEpis, addEpi, assignEpi, returnEpi };
}
