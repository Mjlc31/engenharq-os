import { supabase } from '../lib/supabase';
import { DisciplinaryRecord, DisciplinaryType } from '../types';

export const disciplinaryService = {
  async fetchRecords(workerId?: string) {
    let query = supabase
      .from('disciplinary_records')
      .select('*, worker:workers(full_name, registration_number, cpf, current_role)')
      .is('voided_at', null)
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
    // Garantir que applied_by seja um UUID válido para não quebrar a constraint de chave estrangeira
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id || null;

    const isUuid = payload.applied_by && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.applied_by);
    const appliedByUuid = isUuid ? payload.applied_by : currentUserId;

    const { data, error } = await supabase
      .from('disciplinary_records')
      .insert({
        worker_id: payload.worker_id,
        type: payload.type,
        title: payload.title,
        content_html: payload.content_html,
        applied_by: appliedByUuid,
        pdf_url: payload.pdf_url || null
      })
      .select()
      .single();

    if (error) throw error;
    return data as DisciplinaryRecord;
  }
};
