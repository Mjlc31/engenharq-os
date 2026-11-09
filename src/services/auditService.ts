import { supabase } from '../lib/supabase';
import Papa from 'papaparse';

export type AuditActionType = 
  | 'Login'
  | 'Entrega'
  | 'Devolução'
  | 'Substituição'
  | 'Extravio'
  | 'Emissão PDF'
  | 'Treinamento'
  | 'ASO'
  | 'Descarte'
  | 'Transferência'
  | 'Medida Disciplinar'
  | 'Anulação'
  | 'Alteração';

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userName: string;
  userInitials: string;
  userColor: string;
  type: AuditActionType;
  typeBadgeColor: string;
  module: string;
  description: string;
  ipAddress: string;
  details?: Record<string, any>;
}

const BADGE_COLORS: Record<string, string> = {
  'Login': 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
  'Entrega': 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
  'Devolução': 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20',
  'Substituição': 'bg-purple-500/10 text-purple-500 border border-purple-500/20',
  'Extravio': 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
  'Emissão PDF': 'bg-sky-500/10 text-sky-500 border border-sky-500/20',
  'Treinamento': 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  'ASO': 'bg-teal-500/10 text-teal-500 border border-teal-500/20',
  'Descarte': 'bg-orange-500/10 text-orange-500 border border-orange-500/20',
  'Transferência': 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20',
  'Medida Disciplinar': 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  'Anulação': 'bg-zinc-500/10 text-zinc-300 border border-zinc-500/20',
  'Alteração': 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
};

const TABLE_LABELS: Record<string, string> = {
  workers: 'Colaborador',
  epi_catalog: 'EPI do catálogo',
  construction_sites: 'Obra',
  users: 'Usuário do sistema',
  training_catalog: 'Treinamento do catálogo',
  system_settings: 'Configurações'
};

const FIELD_LABELS: Record<string, string> = {
  name: 'nome', full_name: 'nome', ca_number: 'CA', ca_validity: 'validade do CA', status: 'status',
  role: 'perfil', custom_role: 'cargo', permissions: 'permissões', deleted_at: 'desativação/exclusão',
  current_site_id: 'obra', cpf: 'CPF', unit_price: 'preço', lifespan_days: 'vida útil',
  minimum_stock: 'estoque mínimo', aso_date: 'data do ASO', apt_for_height: 'aptidão em altura',
  apt_for_confined_space: 'aptidão em espaço confinado', current_role: 'cargo',
  epi_declaration_text: 'texto da declaração', epi_terms_text: 'termos da ficha', epi_legal_base_text: 'base legal'
};

// Junções do PostgREST chegam como objeto ou lista de um item
const nameOf = (rel: any): string | undefined => (Array.isArray(rel) ? rel[0]?.full_name : rel?.full_name) || undefined;

// Autor e IP não são gravados nessas tabelas; mostrar isso em vez de inventar um valor
const NOT_RECORDED = 'Não registrado';

function getInitials(name: string): string {
  if (!name) return 'EQ';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const auditService = {
  async getAuditLogs(): Promise<AuditLogItem[]> {
    const logs: AuditLogItem[] = [];

    try {
      const [assignmentsRes, trainingsRes, asosRes, discRes, changesRes] = await Promise.allSettled([
        supabase
          .from('epi_assignments')
          .select('id, assigned_at, returned_at, condition_on_return, created_at, creator:users!created_by(full_name), catalog:epi_catalog!catalog_id(name), worker:workers!worker_id(full_name)')
          .order('assigned_at', { ascending: false })
          .limit(100),
        supabase
          .from('worker_trainings')
          .select('id, completed_at, instructor_name, voided_at, void_reason, voider:users!voided_by(full_name), training:training_catalog!training_id(title, nr_code), worker:workers!worker_id(full_name)')
          .order('completed_at', { ascending: false })
          .limit(50),
        supabase
          .from('worker_asos')
          .select('id, issued_at, type, doctor_name, voided_at, void_reason, voider:users!voided_by(full_name), worker:workers!worker_id(full_name)')
          .order('issued_at', { ascending: false })
          .limit(50),
        supabase
          .from('disciplinary_records')
          .select('id, applied_at, type, title, applied_by, voided_at, void_reason, voider:users!voided_by(full_name), applier:users!applied_by_id(full_name), worker:workers!worker_id(full_name)')
          .order('applied_at', { ascending: false })
          .limit(50),
        supabase
          .from('audit_log')
          .select('id, table_name, action, changed_fields, changed_at, author:users!changed_by(full_name)')
          .order('changed_at', { ascending: false })
          .limit(100)
      ]);

      const getData = (res: PromiseSettledResult<any>) => res.status === 'fulfilled' ? res.value.data || [] : [];

      // 1. Entregas e Devoluções
      const assignments = getData(assignmentsRes);
      assignments.forEach((a: any) => {
        const workerName = Array.isArray(a.worker) ? a.worker[0]?.full_name : a.worker?.full_name || 'Colaborador';
        const epiName = Array.isArray(a.catalog) ? a.catalog[0]?.name : a.catalog?.name || 'EPI';

        const creator = nameOf(a.creator);
        logs.push({
          id: `assign-${a.id}`,
          timestamp: a.assigned_at,
          userName: creator || NOT_RECORDED,
          userInitials: creator ? getInitials(creator) : '—',
          userColor: 'bg-emerald-500 text-emerald-950',
          type: 'Entrega',
          typeBadgeColor: BADGE_COLORS['Entrega'],
          module: 'Entregas',
          description: `Registrada entrega de ${epiName} para ${workerName}`,
          ipAddress: NOT_RECORDED,
          details: { workerName, epiName, assignedAt: a.assigned_at, lancadoEm: a.created_at || 'antes do controle (06/11/2026)' }
        });

        if (a.returned_at) {
          const isLoss = a.condition_on_return === 'DAMAGED';
          logs.push({
            id: `return-${a.id}`,
            timestamp: a.returned_at,
            userName: NOT_RECORDED,
            userInitials: '—',
            userColor: isLoss ? 'bg-rose-500 text-rose-950' : 'bg-emerald-500 text-emerald-950',
            type: isLoss ? 'Extravio' : 'Devolução',
            typeBadgeColor: isLoss ? BADGE_COLORS['Extravio'] : BADGE_COLORS['Devolução'],
            module: 'Entregas',
            description: isLoss
              ? `Extravio/Perda registrada de ${epiName} do colaborador ${workerName}`
              : `Devolução registrada de ${epiName} do colaborador ${workerName}`,
            ipAddress: NOT_RECORDED,
            details: { workerName, epiName, returnedAt: a.returned_at, condition: a.condition_on_return }
          });
        }
      });

      // 2. Treinamentos
      const trainings = getData(trainingsRes);
      trainings.forEach((t: any) => {
        const workerName = Array.isArray(t.worker) ? t.worker[0]?.full_name : t.worker?.full_name || 'Colaborador';
        const nr = Array.isArray(t.training) ? t.training[0]?.nr_code : t.training?.nr_code || 'NR';
        const title = Array.isArray(t.training) ? t.training[0]?.title : t.training?.title || 'Treinamento';

        logs.push({
          id: `train-${t.id}`,
          timestamp: t.completed_at,
          userName: t.instructor_name || NOT_RECORDED,
          userInitials: getInitials(t.instructor_name || 'IS'),
          userColor: 'bg-amber-500 text-amber-950',
          type: 'Treinamento',
          typeBadgeColor: BADGE_COLORS['Treinamento'],
          module: 'SST',
          description: `Conclusão do treinamento ${nr} (${title}) para o colaborador ${workerName}`,
          ipAddress: NOT_RECORDED,
          details: { workerName, nr, title, instructor: t.instructor_name }
        });
      });

      // 3. ASOs
      const asos = getData(asosRes);
      asos.forEach((aso: any) => {
        const workerName = Array.isArray(aso.worker) ? aso.worker[0]?.full_name : aso.worker?.full_name || 'Colaborador';
        logs.push({
          id: `aso-${aso.id}`,
          timestamp: aso.issued_at,
          userName: aso.doctor_name || NOT_RECORDED,
          userInitials: getInitials(aso.doctor_name || '—'),
          userColor: 'bg-teal-500 text-teal-950',
          type: 'ASO',
          typeBadgeColor: BADGE_COLORS['ASO'],
          module: 'SST',
          description: `Emissão de ASO (${aso.type}) para ${workerName} por ${aso.doctor_name || 'Médico Coordenador'}`,
          ipAddress: NOT_RECORDED,
          details: { workerName, type: aso.type, doctor: aso.doctor_name }
        });
      });

      // 4. Medidas Disciplinares
      const disc = getData(discRes);
      disc.forEach((d: any) => {
        const workerName = Array.isArray(d.worker) ? d.worker[0]?.full_name : d.worker?.full_name || 'Colaborador';
        logs.push({
          id: `disc-${d.id}`,
          timestamp: d.applied_at,
          userName: nameOf(d.applier) || d.applied_by || NOT_RECORDED,
          userInitials: getInitials(nameOf(d.applier) || d.applied_by || '—'),
          userColor: 'bg-rose-500 text-rose-950',
          type: 'Medida Disciplinar',
          typeBadgeColor: BADGE_COLORS['Medida Disciplinar'],
          module: 'Colaboradores',
          description: `${d.title || 'Medida disciplinar'} aplicada para ${workerName}`,
          ipAddress: NOT_RECORDED,
          details: { workerName, title: d.title, type: d.type }
        });
      });

      // 5. Anulações (ASO, treinamento, medida): o registro original continua acima; aqui o ato de anular
      const pushVoid = (r: any, what: string) => {
        if (!r.voided_at) return;
        const by = nameOf(r.voider);
        logs.push({
          id: `void-${r.id}`,
          timestamp: r.voided_at,
          userName: by || NOT_RECORDED,
          userInitials: by ? getInitials(by) : '—',
          userColor: 'bg-zinc-500 text-zinc-950',
          type: 'Anulação',
          typeBadgeColor: BADGE_COLORS['Anulação'],
          module: 'Compliance',
          description: `${what} de ${nameOf(r.worker) || 'colaborador'} anulado(a). Motivo: ${r.void_reason}`,
          ipAddress: NOT_RECORDED,
          details: { motivo: r.void_reason }
        });
      };
      trainings.forEach((t: any) => pushVoid(t, 'Treinamento'));
      asos.forEach((a: any) => pushVoid(a, 'ASO'));
      disc.forEach((d: any) => pushVoid(d, 'Medida disciplinar'));

      // 6. Alterações de cadastro (trilha gravada pelo banco)
      getData(changesRes).forEach((c: any) => {
        const by = nameOf(c.author);
        const table = TABLE_LABELS[c.table_name] || c.table_name;
        const fields = Object.keys(c.changed_fields || {});
        const label = c.changed_fields?.full_name?.para ?? c.changed_fields?.name?.para;
        logs.push({
          id: `change-${c.id}`,
          timestamp: c.changed_at,
          userName: by || 'Sistema',
          userInitials: by ? getInitials(by) : 'SI',
          userColor: 'bg-violet-500 text-violet-950',
          type: 'Alteração',
          typeBadgeColor: BADGE_COLORS['Alteração'],
          module: table,
          description: c.action === 'INSERT'
            ? `${table} cadastrado(a)${c.changed_fields?.full_name || c.changed_fields?.name ? `: ${c.changed_fields.full_name || c.changed_fields.name}` : ''}`
            : `${table} alterado(a)${label ? ` (${label})` : ''}: ${fields.map(f => FIELD_LABELS[f] || f).join(', ')}`,
          ipAddress: NOT_RECORDED,
          details: c.changed_fields
        });
      });

    } catch (err) {
      console.error('Erro ao montar logs de auditoria:', err);
    }

    // Ordena do mais recente ao mais antigo
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  exportToCSV(logs: AuditLogItem[]) {
    const csvData = logs.map(l => ({
      'Data/Hora': new Date(l.timestamp).toLocaleString('pt-BR'),
      'Usuário': l.userName,
      'Tipo de Ação': l.type,
      'Módulo': l.module,
      'Descrição': l.description,
      'Endereço IP': l.ipAddress
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `auditoria_sistema_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
