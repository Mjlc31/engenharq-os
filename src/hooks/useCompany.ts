import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

export interface Company {
  id?: string;
  legal_name: string;
  trade_name?: string;
  cnpj: string;
  state_registration?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  legal_representative?: string;
  logo_url?: string;
}

export function useCompany() {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCompany = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setCompany(data || null);
      return data;
    } catch (err) {
      console.error('Erro ao buscar dados da empresa:', err);
      toast({ type: 'error', title: 'Erro', message: 'Falha ao carregar dados da matriz.' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const saveCompany = async (companyData: Company) => {
    try {
      if (company?.id) {
        const { error } = await supabase
          .from('companies')
          .update(companyData as any)
          .eq('id', company.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('companies')
          .insert([companyData as any]);
        if (error) throw error;
      }
      toast({ type: 'success', title: 'Sucesso', message: 'Dados da empresa atualizados.' });
      await fetchCompany();
      return true;
    } catch (err) {
      console.error('Erro ao salvar empresa:', err);
      toast({ type: 'error', title: 'Erro', message: 'Falha ao salvar dados da empresa.' });
      return false;
    }
  };

  return { company, loading, fetchCompany, saveCompany };
}
