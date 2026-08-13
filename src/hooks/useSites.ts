import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ConstructionSite } from '../types';
import { useToast } from '../components/ui/Toast';

export function useSites() {
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('construction_sites')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setSites(data as ConstructionSite[] || []);
      return data;
    } catch (err: any) {
      console.error('Erro ao buscar obras:', err);
      setError('Falha ao carregar as obras.');
      toast({ type: 'error', title: 'Erro de Carregamento', message: 'Falha ao carregar as obras.' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const addSite = async (siteData: Partial<ConstructionSite>) => {
    try {
      const { error: insertError } = await supabase.from('construction_sites').insert([siteData]);
      if (insertError) throw insertError;
      toast({ type: 'success', title: 'Sucesso', message: 'Obra registrada com sucesso.' });
      await fetchSites();
      return true;
    } catch (err: any) {
      console.error('Erro ao criar obra:', err);
      toast({ type: 'error', title: 'Erro no Registro', message: 'Falha ao registrar nova obra.' });
      return false;
    }
  };

  return { sites, setSites, loading, error, fetchSites, addSite };
}
