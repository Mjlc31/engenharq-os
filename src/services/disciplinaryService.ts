import { supabase } from '../lib/supabase';
import { DisciplinaryRecord, DisciplinaryType } from '../types';

export const disciplinaryService = {
  async fetchRecords(workerId?: string) {
    let query = supabase
      .from('disciplinary_records')
      .select('*, worker:workers(full_name, registration_number, cpf, current_role)')
      .order('applied_at', { ascending: false });

    if (workerId) {
      query = query.eq('worker_id', workerId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as any[];
  },

  async createRecord(payload: {
    worker_id: string;
    type: DisciplinaryType;
    title: string;
    content_html: string;
    applied_by?: string;
    pdf_url?: string;
  }) {
    const { data, error } = await supabase
      .from('disciplinary_records')
      .insert({
        worker_id: payload.worker_id,
        type: payload.type,
        title: payload.title,
        content_html: payload.content_html,
        applied_by: payload.applied_by || null,
        pdf_url: payload.pdf_url || null
      })
      .select()
      .single();

    if (error) throw error;
    return data as DisciplinaryRecord;
  }
};
