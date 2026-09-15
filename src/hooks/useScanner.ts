import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Worker, EpiInventory } from '../types';

export function useScanner() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorker = async (searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('workers')
        .select('*, site:construction_sites(name, latitude, longitude)')
        .or(`cpf.eq.${searchTerm},registration_number.eq.${searchTerm}`)
        .single();
        
      if (fetchError) {
         if (fetchError.message === 'Failed to fetch') {
           setError('Falha de conexão. Verifique sua rede e tente novamente.');
           return null;
         }
         throw fetchError;
      }
      
      return data as unknown as Worker;
    } catch (err: unknown) {
      console.error(err);
      setError('Colaborador não encontrado.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchEpi = async (searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('epi_inventory')
        .select('*')
        .or(`tracking_code.eq.${searchTerm},ca_number.eq.${searchTerm}`)
        .single();
        
      if (fetchError) {
         if (fetchError.message === 'Failed to fetch') {
           setError('Falha de conexão. Verifique sua rede e tente novamente.');
           return null;
         }
         throw fetchError;
      }
      
      return data as EpiInventory;
    } catch (err: unknown) {
      console.error(err);
      setError('EPI não encontrado.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const confirmAssignment = async (
    workerId: string, 
    epis: EpiInventory[], 
    signatureUrl: string, 
    selfieUrl: string | undefined, 
    biometricsData: any
  ) => {
    setLoading(true);
    setError(null);
    try {
      const assignments = epis.map(item => {
        const expectedReturn = new Date();
        expectedReturn.setDate(expectedReturn.getDate() + (item.recommended_lifespan_days || 180));
        
        return {
          epi_id: item.id, 
          expected_return_date: expectedReturn.toISOString(),
          digital_signature_url: signatureUrl,
          audit_selfie_url: selfieUrl || biometricsData?.selfieUrl,
          biometric_match_score: biometricsData?.score,
          liveness_verified: biometricsData?.liveness
        };
      });

      const { data, error: rpcError } = await supabase.rpc('bulk_assign_epis', {
        p_worker_id: workerId,
        p_assignments: assignments
      });

      if (rpcError) throw rpcError;
      if (!data) throw new Error('Falha ao executar bulk_assign_epis no banco');

      return true;
    } catch (err: unknown) {
      setError(`Erro ao confirmar: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    setError,
    setLoading,
    fetchWorker,
    fetchEpi,
    confirmAssignment
  };
}
