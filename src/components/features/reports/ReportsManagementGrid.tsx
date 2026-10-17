import React, { useState } from 'react';
import { useWorkers } from '../../../hooks/useWorkers';
import { supabase } from '../../../lib/supabase';
import { generateManagementReportPdf } from '../../../lib/pdfGenerator';
import { ReportPreviewModal } from './ReportPreviewModal';
import { useToast } from '../../ui/Toast';
import { 
  Users, 
  HardHat, 
  Package, 
  RotateCcw, 
  TrendingUp, 
  Calendar, 
  Clock, 
  AlertTriangle,
  Eye,
  Download,
  CalendarDays,
  Building2,
  Layers
} from 'lucide-react';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay, addDays } from 'date-fns';

export function ReportsManagementGrid() {
  const { workers, sites } = useWorkers();
  const { toast } = useToast();

  // Filters (matching Image 5 top card)
  const [siteFilter, setSiteFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal preview state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewSubtitle, setPreviewSubtitle] = useState('');
  const [previewColumns, setPreviewColumns] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [activeReportKey, setActiveReportKey] = useState<string | null>(null);

  // Extract distinct sectors
  const sectors = Array.from(new Set(workers.map(w => w.work_sector).filter(Boolean))) as string[];

  const getFilterDescription = () => {
    const parts: string[] = [];
    if (siteFilter) {
      const site = sites.find(s => s.id === siteFilter);
      if (site) parts.push(`Filial: ${site.name}`);
    } else {
      parts.push('Todas as filiais');
    }
    if (sectorFilter) {
      parts.push(`Setor: ${sectorFilter}`);
    } else {
      parts.push('Todos os setores');
    }
    if (startDate) {
      parts.push(`De: ${format(parseISO(startDate), 'dd/MM/yyyy')}`);
    }
    if (endDate) {
      parts.push(`Até: ${format(parseISO(endDate), 'dd/MM/yyyy')}`);
    }
    return parts.join(' • ');
  };

  const fetchReportData = async (reportKey: string): Promise<{ columns: any[]; data: any[]; title: string; subtitle: string }> => {
    switch (reportKey) {
      case 'workers': {
        let query = supabase.from('workers').select('full_name, registration_number, cpf, work_sector, current_role, admission_date, current_site_id, status');
        if (siteFilter) query = query.eq('current_site_id', siteFilter);
        if (sectorFilter) query = query.eq('work_sector', sectorFilter);

        const { data } = await query;
        const columns = [
          { key: 'Nome', label: 'Nome Completo' },
          { key: 'Matricula', label: 'Matrícula' },
          { key: 'CPF', label: 'CPF' },
          { key: 'Setor', label: 'Setor' },
          { key: 'Funcao', label: 'Função' },
          { key: 'Admissao', label: 'Data Admissão', align: 'center' as const },
          { key: 'Status', label: 'Status', align: 'center' as const }
        ];

        const formatted = (data || []).map(w => ({
          Nome: w.full_name,
          Matricula: w.registration_number || 'N/A',
          CPF: w.cpf || 'N/A',
          Setor: w.work_sector || 'N/A',
          Funcao: w.current_role || 'N/A',
          Admissao: w.admission_date ? format(new Date(w.admission_date), 'dd/MM/yyyy') : 'N/A',
          Status: w.status === 'INACTIVE' || w.status === 'DISMISSED' ? 'Inativo' : 'Ativo'
        }));

        return {
          title: 'Relatório de Funcionários',
          subtitle: 'Lista completa de funcionários cadastrados e seus respectivos setores',
          columns,
          data: formatted
        };
      }

      case 'epis': {
        const { data } = await supabase.from('epi_catalog').select('code, name, category, brand, model, ca_number, current_stock, minimum_stock');
        const columns = [
          { key: 'Codigo', label: 'Código' },
          { key: 'Nome', label: 'Nome do EPI' },
          { key: 'Categoria', label: 'Categoria' },
          { key: 'Marca', label: 'Marca / Modelo' },
          { key: 'CA', label: 'C.A.', align: 'center' as const },
          { key: 'Estoque_Atual', label: 'Estoque Atual', align: 'right' as const },
          { key: 'Estoque_Minimo', label: 'Mínimo', align: 'right' as const },
          { key: 'Status', label: 'Situação', align: 'center' as const }
        ];

        const formatted = (data || []).map(e => ({
          Codigo: e.code,
          Nome: e.name,
          Categoria: e.category,
          Marca: `${e.brand || ''} ${e.model || ''}`.trim() || 'Padrão',
          CA: e.ca_number || '-',
          Estoque_Atual: e.current_stock,
          Estoque_Minimo: e.minimum_stock,
          Status: e.current_stock <= e.minimum_stock ? 'CRÍTICO' : 'REGULAR'
        }));

        return {
          title: 'Relatório de EPIs',
          subtitle: 'Catálogo de equipamentos de proteção individual cadastrados',
          columns,
          data: formatted
        };
      }

      case 'deliveries': {
        const { data } = await supabase.from('epi_assignments').select(`
          assigned_at, returned_at,
          worker:workers(full_name, work_sector, current_site_id),
          catalog:epi_catalog!catalog_id(name, code, ca_number)
        `).order('assigned_at', { ascending: false });

        let list = data || [];
        if (siteFilter) {
          list = list.filter((a: any) => a.worker?.current_site_id === siteFilter);
        }
        if (sectorFilter) {
          list = list.filter((a: any) => a.worker?.work_sector === sectorFilter);
        }
        if (startDate) {
          const start = startOfDay(parseISO(startDate));
          list = list.filter((a: any) => a.assigned_at && !isBefore(parseISO(a.assigned_at), start));
        }
        if (endDate) {
          const end = endOfDay(parseISO(endDate));
          list = list.filter((a: any) => a.assigned_at && !isAfter(parseISO(a.assigned_at), end));
        }

        const columns = [
          { key: 'Colaborador', label: 'Colaborador' },
          { key: 'Setor', label: 'Setor' },
          { key: 'EPI', label: 'EPI' },
          { key: 'CA', label: 'C.A.', align: 'center' as const },
          { key: 'Data_Entrega', label: 'Data Entrega', align: 'center' as const },
          { key: 'Situacao', label: 'Status', align: 'center' as const }
        ];

        const formatted = list.map((a: any) => ({
          Colaborador: a.worker?.full_name || 'N/A',
          Setor: a.worker?.work_sector || 'N/A',
          EPI: a.catalog?.name || 'EPI',
          CA: a.catalog?.ca_number || '-',
          Data_Entrega: a.assigned_at ? format(new Date(a.assigned_at), 'dd/MM/yyyy HH:mm') : '-',
          Situacao: a.returned_at ? 'Devolvido' : 'Em Uso'
        }));

        return {
          title: 'Relatório de Entregas',
          subtitle: 'Histórico de entregas de EPIs por período e setor',
          columns,
          data: formatted
        };
      }

      case 'returns': {
        const { data } = await supabase.from('epi_assignments').select(`
          assigned_at, returned_at, condition_on_return,
          worker:workers(full_name, work_sector, current_site_id),
          catalog:epi_catalog!catalog_id(name, code)
        `).not('returned_at', 'is', null).order('returned_at', { ascending: false });

        let list = data || [];
        if (siteFilter) {
          list = list.filter((a: any) => a.worker?.current_site_id === siteFilter);
        }
        if (sectorFilter) {
          list = list.filter((a: any) => a.worker?.work_sector === sectorFilter);
        }
        if (startDate) {
          const start = startOfDay(parseISO(startDate));
          list = list.filter((a: any) => a.returned_at && !isBefore(parseISO(a.returned_at), start));
        }
        if (endDate) {
          const end = endOfDay(parseISO(endDate));
          list = list.filter((a: any) => a.returned_at && !isAfter(parseISO(a.returned_at), end));
        }

        const columns = [
          { key: 'Colaborador', label: 'Colaborador' },
          { key: 'Setor', label: 'Setor' },
          { key: 'EPI', label: 'EPI' },
          { key: 'Data_Devolucao', label: 'Data Devolução', align: 'center' as const },
          { key: 'Condicao', label: 'Condição de Retorno', align: 'center' as const }
        ];

        const formatted = list.map((a: any) => ({
          Colaborador: a.worker?.full_name || 'N/A',
          Setor: a.worker?.work_sector || 'N/A',
          EPI: a.catalog?.name || 'EPI',
          Data_Devolucao: a.returned_at ? format(new Date(a.returned_at), 'dd/MM/yyyy HH:mm') : '-',
          Condicao: a.condition_on_return || 'Desgaste Normal'
        }));

        return {
          title: 'Relatório de Devoluções',
          subtitle: 'Registro de devoluções de equipamentos realizadas',
          columns,
          data: formatted
        };
      }

      case 'stock': {
        const { data } = await supabase.from('epi_catalog').select('code, name, category, unit_price, current_stock, minimum_stock');
        const columns = [
          { key: 'Codigo', label: 'Código' },
          { key: 'Nome', label: 'Nome do EPI' },
          { key: 'Categoria', label: 'Categoria' },
          { key: 'Estoque_Atual', label: 'Estoque Atual', align: 'right' as const },
          { key: 'Estoque_Minimo', label: 'Estoque Mínimo', align: 'right' as const },
          { key: 'Valor_Unit', label: 'Valor Unit. (R$)', align: 'right' as const },
          { key: 'Valor_Total', label: 'Valor Total (R$)', align: 'right' as const },
          { key: 'Alerta', label: 'Status', align: 'center' as const }
        ];

        const formatted = (data || []).map(e => {
          const unit = Number(e.unit_price || 0);
          const current = Number(e.current_stock || 0);
          return {
            Codigo: e.code,
            Nome: e.name,
            Categoria: e.category,
            Estoque_Atual: current,
            Estoque_Minimo: e.minimum_stock,
            Valor_Unit: unit.toFixed(2),
            Valor_Total: (current * unit).toFixed(2),
            Alerta: current <= e.minimum_stock ? 'REPOR ESTOQUE' : 'REGULAR'
          };
        });

        return {
          title: 'Relatório de Estoque',
          subtitle: 'Posição atual de inventário físico e valoração de estoque',
          columns,
          data: formatted
        };
      }

      case 'expiring': {
        const { data } = await supabase.from('epi_catalog').select('code, name, ca_number, ca_validity, current_stock');
        const today = startOfDay(new Date());
        const limit = addDays(today, 60); // Next 60 days

        const list = (data || []).filter(e => {
          if (!e.ca_validity) return false;
          const exp = parseISO(e.ca_validity);
          return !isAfter(exp, limit);
        });

        const columns = [
          { key: 'Codigo', label: 'Código' },
          { key: 'Nome', label: 'Nome do Equipamento' },
          { key: 'CA', label: 'C.A.', align: 'center' as const },
          { key: 'Validade_CA', label: 'Validade do C.A.', align: 'center' as const },
          { key: 'Situacao_CA', label: 'Status do C.A.', align: 'center' as const },
          { key: 'Estoque', label: 'Estoque em Risco', align: 'right' as const }
        ];

        const formatted = list.map(e => {
          const exp = parseISO(e.ca_validity);
          const isExpired = isBefore(exp, today);
          return {
            Codigo: e.code,
            Nome: e.name,
            CA: e.ca_number || '-',
            Validade_CA: format(exp, 'dd/MM/yyyy'),
            Situacao_CA: isExpired ? 'VENCIDO' : 'A VENCER (<60d)',
            Estoque: e.current_stock
          };
        });

        return {
          title: 'EPIs Vencendo',
          subtitle: 'Equipamentos com Certificado de Aprovação (C.A.) vencido ou a vencer',
          columns,
          data: formatted
        };
      }

      case 'forecast': {
        const { data } = await supabase.from('epi_assignments').select(`
          assigned_at,
          worker:workers(full_name, work_sector),
          catalog:epi_catalog!catalog_id(name, code, ca_number, recommended_lifespan_days)
        `).is('returned_at', null);

        const today = new Date();
        const columns = [
          { key: 'Colaborador', label: 'Colaborador' },
          { key: 'Setor', label: 'Setor' },
          { key: 'EPI', label: 'EPI em Uso' },
          { key: 'Data_Entrega', label: 'Data Entrega', align: 'center' as const },
          { key: 'Vida_Util_Dias', label: 'Vida Útil (Dias)', align: 'center' as const },
          { key: 'Previsao_Troca', label: 'Previsão de Troca', align: 'center' as const }
        ];

        const formatted = (data || []).map((a: any) => {
          const assigned = a.assigned_at ? new Date(a.assigned_at) : today;
          const lifespan = a.catalog?.recommended_lifespan_days || 90;
          const dueDate = addDays(assigned, lifespan);

          return {
            Colaborador: a.worker?.full_name || 'N/A',
            Setor: a.worker?.work_sector || 'N/A',
            EPI: a.catalog?.name || 'EPI',
            Data_Entrega: a.assigned_at ? format(assigned, 'dd/MM/yyyy') : '-',
            Vida_Util_Dias: lifespan,
            Previsao_Troca: format(dueDate, 'dd/MM/yyyy')
          };
        });

        return {
          title: 'Previsão de Trocas',
          subtitle: 'Estimativa de reposição de equipamentos com base na vida útil regulamentar',
          columns,
          data: formatted
        };
      }

      case 'lost': {
        const { data } = await supabase.from('disciplinary_records').select(`
          created_at, title, type,
          worker:workers(full_name, registration_number, cpf, work_sector)
        `).order('created_at', { ascending: false });

        const columns = [
          { key: 'Colaborador', label: 'Colaborador' },
          { key: 'Matricula', label: 'Matrícula' },
          { key: 'Setor', label: 'Setor' },
          { key: 'Tipo_Ocorrencia', label: 'Tipo de Ocorrência' },
          { key: 'Descricao', label: 'Descrição' },
          { key: 'Data_Registro', label: 'Data Registro', align: 'center' as const }
        ];

        const formatted = (data || []).map((d: any) => ({
          Colaborador: d.worker?.full_name || 'N/A',
          Matricula: d.worker?.registration_number || 'N/A',
          Setor: d.worker?.work_sector || 'N/A',
          Tipo_Ocorrencia: d.type === 'ORIENTACAO_SEGURANCA' ? 'Orientação' : d.type === 'ADVERTENCIA_ESCRITA' ? 'Advertência Escrita' : 'Advertência Verbal',
          Descricao: d.title || 'Extravio de EPI / Ocorrência',
          Data_Registro: d.created_at ? format(new Date(d.created_at), 'dd/MM/yyyy') : '-'
        }));

        return {
          title: 'Relatório de Extravios',
          subtitle: 'Histórico de ocorrências disciplinares e extravios de equipamentos',
          columns,
          data: formatted
        };
      }

      default:
        throw new Error('Tipo de relatório desconhecido');
    }
  };

  const handlePreview = async (reportKey: string) => {
    setLoadingReport(true);
    setActiveReportKey(reportKey);
    try {
      const res = await fetchReportData(reportKey);
      setPreviewTitle(res.title);
      setPreviewSubtitle(res.subtitle);
      setPreviewColumns(res.columns);
      setPreviewData(res.data);
      setPreviewModalOpen(true);
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro ao carregar dados', message: err.message });
    } finally {
      setLoadingReport(false);
    }
  };

  const handleDownloadPdf = async (reportKey: string) => {
    try {
      const res = await fetchReportData(reportKey);
      if (res.data.length === 0) {
        toast({ type: 'warning', title: 'Sem Registros', message: 'Nenhum dado encontrado para os filtros selecionados.' });
        return;
      }
      await generateManagementReportPdf(res.title, getFilterDescription(), res.columns, res.data, 'download');
      toast({ type: 'success', title: 'PDF Gerado com Sucesso', message: `O download de "${res.title}" foi iniciado.` });
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro ao gerar PDF', message: err.message });
    }
  };

  // 8 Report Cards Definition (matching Image 5)
  const reportCards = [
    {
      id: 'workers',
      title: 'Relatório de Funcionários',
      description: 'Lista completa de funcionários com seus EPIs',
      icon: Users,
      badgeColor: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
    },
    {
      id: 'epis',
      title: 'Relatório de EPIs',
      description: 'Cadastro de equipamentos de proteção',
      icon: HardHat,
      badgeColor: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
    },
    {
      id: 'deliveries',
      title: 'Relatório de Entregas',
      description: 'Histórico de entregas por período',
      icon: Package,
      badgeColor: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400'
    },
    {
      id: 'returns',
      title: 'Relatório de Devoluções',
      description: 'Devoluções realizadas por período',
      icon: RotateCcw,
      badgeColor: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
    },
    {
      id: 'stock',
      title: 'Relatório de Estoque',
      description: 'Posição atual e movimentações',
      icon: TrendingUp,
      badgeColor: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
    },
    {
      id: 'expiring',
      title: 'EPIs Vencendo',
      description: 'Equipamentos com CA próximo ao vencimento',
      icon: Calendar,
      badgeColor: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
    },
    {
      id: 'forecast',
      title: 'Previsão de Trocas',
      description: 'EPIs com previsão de substituição',
      icon: Clock,
      badgeColor: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
    },
    {
      id: 'lost',
      title: 'Relatório de Extravios',
      description: 'Equipamentos extraviados por período',
      icon: AlertTriangle,
      badgeColor: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Filter Card (matching Image 5) */}
      <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Filial */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">Filial</label>
            <div className="relative">
              <select
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                className="w-full h-10 px-3 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
              >
                <option value="">Todas as filiais</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted">
                ▼
              </div>
            </div>
          </div>

          {/* Setor */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">Setor</label>
            <div className="relative">
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="w-full h-10 px-3 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
              >
                <option value="">Todos os setores</option>
                {sectors.map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted">
                ▼
              </div>
            </div>
          </div>

          {/* Data Início */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">Data Início</label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 px-3 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              />
            </div>
          </div>

          {/* Data Fim */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">Data Fim</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-10 px-3 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid of 8 Cards (matching Image 5) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {reportCards.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="bg-surface rounded-xl border border-border p-6 shadow-sm flex flex-col items-center text-center justify-between hover:border-primary/40 transition-all duration-200 group min-h-[220px]"
            >
              {/* Circular Badge Icon */}
              <div className={`h-12 w-12 rounded-full ${card.badgeColor} flex items-center justify-center mb-4 transition-transform group-hover:scale-105`}>
                <Icon className="w-6 h-6" />
              </div>

              {/* Title & Description */}
              <div className="flex flex-col gap-1.5 mb-6">
                <h3 className="text-sm font-bold text-foreground">
                  {card.title}
                </h3>
                <p className="text-xs text-muted line-clamp-2 px-1">
                  {card.description}
                </p>
              </div>

              {/* Action Buttons: [Visualizar] and [PDF] (matching Image 5) */}
              <div className="grid grid-cols-2 gap-2.5 w-full mt-auto">
                <button
                  onClick={() => handlePreview(card.id)}
                  disabled={loadingReport}
                  className="h-8 rounded-lg border border-border bg-background hover:bg-surface-hover text-foreground text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-muted" />
                  Visualizar
                </button>

                <button
                  onClick={() => handleDownloadPdf(card.id)}
                  className="h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inspection / Preview Modal */}
      <ReportPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title={previewTitle}
        subtitle={`${previewSubtitle} (${getFilterDescription()})`}
        columns={previewColumns}
        data={previewData}
        loading={loadingReport}
        onDownloadPdf={() => activeReportKey && handleDownloadPdf(activeReportKey)}
      />
    </div>
  );
}
