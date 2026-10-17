import { supabase } from '../lib/supabase';
import { TrainingCatalog, WorkerTraining, WorkerAso, AsoType } from '../types';

export const sstService = {
  // === TREINAMENTOS ===
  async fetchTrainingCatalog() {
    const { data, error } = await supabase
      .from('training_catalog')
      .select('*')
      .order('nr_code');
    if (error) throw error;
    return (data || []) as TrainingCatalog[];
  },

  async createTrainingCatalogItem(payload: {
    nr_code: string;
    title: string;
    workload_hours: number;
    default_validity_months: number;
  }) {
    const { data, error } = await supabase
      .from('training_catalog')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as TrainingCatalog;
  },

  async fetchWorkerTrainings(workerId?: string) {
    let query = supabase
      .from('worker_trainings')
      .select('*, training:training_catalog(*), worker:workers(full_name, registration_number, cpf, current_role)')
      .order('completed_at', { ascending: false });

    if (workerId) {
      query = query.eq('worker_id', workerId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as any[];
  },

  async recordWorkerTraining(payload: {
    worker_id: string;
    training_id: string;
    instructor_name: string;
    completed_at: string;
    valid_until: string;
    photos_urls?: string[];
    notes?: string;
  }) {
    const { data, error } = await supabase
      .from('worker_trainings')
      .insert({
        worker_id: payload.worker_id,
        training_id: payload.training_id,
        instructor_name: payload.instructor_name,
        completed_at: payload.completed_at,
        valid_until: payload.valid_until,
        photos_urls: payload.photos_urls || [],
        notes: payload.notes || null
      })
      .select()
      .single();
    if (error) throw error;
    return data as WorkerTraining;
  },

  // === ASO ===
  async fetchWorkerAsos(workerId?: string) {
    let query = supabase
      .from('worker_asos')
      .select('*, worker:workers(full_name, registration_number, cpf, current_role)')
      .order('issued_at', { ascending: false });

    if (workerId) {
      query = query.eq('worker_id', workerId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as any[];
  },

  async recordWorkerAso(payload: {
    worker_id: string;
    type: AsoType;
    issued_at: string;
    validity_years: number;
    fit_for_height: boolean;
    fit_for_confined_space: boolean;
    doctor_name?: string;
    document_url?: string;
  }) {
    // Cálculo automático da data de vencimento: data de emissão + validade_anos
    const issueDate = new Date(payload.issued_at);
    const validUntilDate = new Date(issueDate);
    validUntilDate.setFullYear(validUntilDate.getFullYear() + payload.validity_years);
    const valid_until = validUntilDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('worker_asos')
      .insert({
        worker_id: payload.worker_id,
        type: payload.type,
        issued_at: payload.issued_at,
        validity_years: payload.validity_years,
        valid_until: valid_until,
        fit_for_height: payload.fit_for_height,
        fit_for_confined_space: payload.fit_for_confined_space,
        doctor_name: payload.doctor_name || null,
        document_url: payload.document_url || null
      })
      .select()
      .single();

    if (error) throw error;
    return data as WorkerAso;
  }
};
