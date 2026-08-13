import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

export function useAudit() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await supabase.from('epi_assignments')
        .select(`
          id,
          assigned_at,
          returned_at,
          condition_on_return,
          generated_pdf_url,
          epi:epi_inventory(tracking_code, category, ca_number),
          worker:workers(full_name, cpf, registration_number)
        `)
        .order('assigned_at', { ascending: false });
        
      setAssignments(data || []);
      return data;
    } catch (err: any) {
      console.error('Error loading audit data:', err);
      setError('Falha ao carregar registros de auditoria.');
      toast({ type: 'error', title: 'Erro de Carregamento', message: 'Falha ao carregar registros de auditoria.' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return { assignments, loading, error, fetchAssignments };
}
