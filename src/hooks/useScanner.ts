import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { cleanDigits, applyCpfMask } from '../lib/validators';
import { Worker, EpiInventory } from '../types';

export function useScanner() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorker = async (searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const isId = searchTerm.startsWith('WK-');
      const cleanTerm = searchTerm.replace('WK-', '');
      let query = supabase.from('workers').select('*, site:construction_sites(name, latitude, longitude)').is('deleted_at', null);
      
      if (isId) {
        query = query.eq('id', cleanTerm);
      } else {
        // CPF pode estar gravado com ou sem pontuação; procura nas duas formas
        const digits = cleanDigits(cleanTerm);
        query = query.or(`cpf.eq."${cleanTerm}",cpf.eq."${digits}",cpf.eq."${applyCpfMask(digits)}",registration_number.eq."${cleanTerm}"`);
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
      let query = supabase.from('epi_catalog').select('*').is('deleted_at', null).eq('status', 'ACTIVE');
      
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
          quantity: item.quantity || 1,
          unit_price_at_delivery: Number(item.unit_price ?? 0),
          expected_return_date: expectedReturn.toISOString(),
          digital_signature_url: signatureUrl,
          audit_selfie_url: selfieUrl || biometricsData?.selfieUrl,
          biometric_match_score: biometricsData?.score,
          liveness_verified: biometricsData?.liveness,
          condition_on_delivery: 'GOOD' as const
        };
      });

      // O banco debita a obra do colaborador e grava o Kardex (trigger trg_epi_assignment_stock)
      const { error: insertError } = await supabase.from('epi_assignments').insert(assignments);
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['epi-assets'] });
      queryClient.invalidateQueries({ queryKey: ['active-epi-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['epi-tracking-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });

      return true;
    } catch (err: unknown) {
      setError(`Erro ao confirmar: ${(err as { message?: string })?.message ?? String(err)}`);
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
