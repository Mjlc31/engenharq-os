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
      const isId = searchTerm.startsWith('WK-');
      const cleanTerm = searchTerm.replace('WK-', '');
      let query = supabase.from('workers').select('*, site:construction_sites(name, latitude, longitude)');
      
      if (isId) {
        query = query.eq('id', cleanTerm);
      } else {
        query = query.or(`cpf.eq.${cleanTerm},registration_number.eq.${cleanTerm}`);
      }
      
      const { data, error: fetchError } = await query.single();
        
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
      const isId = searchTerm.startsWith('EPI-');
      const cleanTerm = searchTerm.replace('EPI-', '');
      let query = supabase.from('epi_catalog').select('*');
      
      if (isId) {
        query = query.eq('id', cleanTerm);
      } else {
        query = query.or(`code.eq.${cleanTerm},ca_number.eq.${cleanTerm}`);
      }
      
      const { data, error: fetchError } = await query.single();
        
      if (fetchError) {
         if (fetchError.message === 'Failed to fetch') {
           setError('Falha de conexão. Verifique sua rede e tente novamente.');
           return null;
         }
         throw fetchError;
      }
      
      return { ...data, status: data.current_stock > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK' } as any;
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
    epis: any[], 
    signatureUrl: string, 
    selfieUrl: string | undefined, 
    biometricsData: any
  ) => {
    setLoading(true);
    setError(null);
    try {
      const assignments = epis.map(item => {
        const expectedReturn = new Date();
        expectedReturn.setDate(expectedReturn.getDate() + (item.lifespan_days || 180));
        
        return {
          catalog_id: item.id,
          worker_id: workerId,
          expected_return_date: expectedReturn.toISOString(),
          digital_signature_url: signatureUrl,
          audit_selfie_url: selfieUrl || biometricsData?.selfieUrl,
          biometric_match_score: biometricsData?.score,
          liveness_verified: biometricsData?.liveness,
          condition_on_delivery: 'GOOD'
        };
      });

      const { error: insertError } = await supabase.from('epi_assignments').insert(assignments);
      if (insertError) throw insertError;

      // Update stock for each epi
      for (const item of epis) {
        if (item.current_stock !== undefined) {
           await supabase.from('epi_catalog').update({ current_stock: Math.max(0, item.current_stock - 1) }).eq('id', item.id);
        }
      }

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
