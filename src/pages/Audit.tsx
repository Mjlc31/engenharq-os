import React, { useEffect, useState, useMemo } from 'react';
import { Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { TableRowSkeleton } from '../components/ui/Skeleton';
import { useAudit } from '../hooks/useAudit';
import Papa from 'papaparse';

export function Audit() {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'CRITICAL'>('ALL');

  const { assignments, loading, fetchAssignments } = useAudit();

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      const workerInfo = Array.isArray(a.worker) ? a.worker[0] : a.worker;
      const matchesSearch = workerInfo?.full_name?.toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [assignments, search]);

  const handleExportCSV = () => {
    const csvData = filteredAssignments.map(a => {
      const epiInfo = Array.isArray(a.epi) ? a.epi[0] : a.epi;
      const workerInfo = Array.isArray(a.worker) ? a.worker[0] : a.worker;
      
      return {
        'ID Transação': a.id,
        'Data Entrega': format(new Date(a.assigned_at), 'dd/MM/yyyy HH:mm'),
        'Data Devolução': a.returned_at ? format(new Date(a.returned_at), 'dd/MM/yyyy HH:mm') : 'Em Uso',
        'Colaborador': workerInfo?.full_name,
        'CPF': workerInfo?.cpf,
        'Matrícula': workerInfo?.registration_number,
        'Categoria EPI': epiInfo?.category,
        'CA EPI': epiInfo?.ca_number,
        'Código Rastreio': epiInfo?.tracking_code,
        'Condição Devolução': a.condition_on_return || 'N/A',
        'Link PDF NR-6': a.generated_pdf_url || 'Pendente'
      };
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `engenharq_audit_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex justify-between items-center bg-surface p-4 rounded-xl border border-border">
        <div>
          <h1 className="text-xl font-bold">Auditoria e Compliance</h1>
          <p className="text-muted text-sm">Relatórios gerenciais e exportação de recibos NR-6</p>
        </div>
        <button 
          onClick={handleExportCSV}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md font-bold text-sm transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      <div className="flex-1 overflow-x-auto bg-surface border border-border rounded-xl">
        <table className="w-full text-left text-sm text-foreground min-w-[800px]">
          <thead className="bg-surface-hover text-muted text-xs uppercase font-bold sticky top-0 z-10 border-b border-border">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Colaborador</th>
              <th className="px-4 py-3">EPI (CA)</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Comprovante Legal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {loading ? (
              <>
                <TableRowSkeleton columns={5} />
                <TableRowSkeleton columns={5} />
                <TableRowSkeleton columns={5} />
              </>
            ) : assignments.map((a) => {
              const epiInfo = Array.isArray(a.epi) ? a.epi[0] : a.epi;
              const workerInfo = Array.isArray(a.worker) ? a.worker[0] : a.worker;
              return (
                <tr key={a.id} className="hover:bg-surface-hover/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{format(new Date(a.assigned_at), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold">{workerInfo?.full_name}</p>
                    <p className="text-[10px] text-muted font-mono">{workerInfo?.registration_number}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{epiInfo?.category}</p>
                    <p className="text-[10px] text-muted">CA: {epiInfo?.ca_number}</p>
                  </td>
                  <td className="px-4 py-3">
                    {a.returned_at ? (
                      <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-[10px] font-bold">Devolvido</span>
                    ) : (
                      <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold">Em Uso</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {a.generated_pdf_url ? (
                      <a href={a.generated_pdf_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:text-primary-dark transition-colors font-medium text-xs">
                        <FileText className="w-4 h-4" /> Ver PDF
                      </a>
                    ) : (
                      <span className="text-muted text-xs flex items-center gap-1">Pendente</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
