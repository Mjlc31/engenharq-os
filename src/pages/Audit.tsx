import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Download, FileText, Filter, Search, Fingerprint, ShieldCheck, AlertTriangle } from 'lucide-react';
import { format, isAfter, isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';
import Papa from 'papaparse';
import { motion } from 'motion/react';

interface AuditAssignment {
  id: string;
  assigned_at: string;
  returned_at: string | null;
  condition_on_return: string | null;
  generated_pdf_url: string | null;
  biometric_match_score?: number | null;
  liveness_verified?: boolean | null;
  epi: { tracking_code: string; category: string; ca_number: string } | { tracking_code: string; category: string; ca_number: string }[];
  worker: { full_name: string; cpf: string; registration_number: string } | { full_name: string; cpf: string; registration_number: string }[];
}

export function Audit() {
  const [assignments, setAssignments] = useState<AuditAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    async function loadAudit() {
      setLoading(true);
      const { data } = await supabase.from('epi_assignments')
        .select(`
          id,
          assigned_at,
          returned_at,
          condition_on_return,
          generated_pdf_url,
          biometric_match_score,
          liveness_verified,
          epi:epi_inventory(tracking_code, category, ca_number),
          worker:workers(full_name, cpf, registration_number)
        `)
        .order('assigned_at', { ascending: false });
        
      if (data) setAssignments(data);
      setLoading(false);
    }
    loadAudit();
  }, []);

  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      const epiInfo = Array.isArray(a.epi) ? a.epi[0] : a.epi;
      const workerInfo = Array.isArray(a.worker) ? a.worker[0] : a.worker;
      
      const matchesSearch = searchTerm === '' || 
        workerInfo?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        epiInfo?.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        epiInfo?.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase());
        
      let matchesDate = true;
      const assignmentDate = parseISO(a.assigned_at);
      
      if (startDate) {
        matchesDate = matchesDate && isAfter(assignmentDate, startOfDay(parseISO(startDate)));
      }
      if (endDate) {
        matchesDate = matchesDate && isBefore(assignmentDate, endOfDay(parseISO(endDate)));
      }
      
      return matchesSearch && matchesDate;
    });
  }, [assignments, searchTerm, startDate, endDate]);

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
        'Score Biometria (%)': a.biometric_match_score ? (a.biometric_match_score * 100).toFixed(2) : 'N/A',
        'Liveness (Prova de Vida)': a.liveness_verified ? 'Sim' : 'Não/N/A',
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
    <motion.div 
      className="flex flex-col h-full gap-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-surface p-4 rounded-xl border border-border shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-bold">Auditoria e Compliance</h1>
          <p className="text-muted text-sm">Histórico NR-6 e validações biométricas</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input 
              type="text" 
              placeholder="Buscar colaborador ou EPI..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-md py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <input 
            type="date" 
            aria-label="Data inicial"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-background border border-border rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-primary text-muted-foreground"
          />
          <span className="text-muted text-sm">até</span>
          <input 
            type="date" 
            aria-label="Data final"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-background border border-border rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-primary text-muted-foreground"
          />
          <button 
            onClick={handleExportCSV}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-1.5 rounded-md font-bold text-sm transition-colors flex items-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-surface border border-border rounded-xl shadow-sm">
        <table className="w-full text-left text-sm text-foreground whitespace-nowrap">
          <thead className="bg-surface-hover text-muted text-xs uppercase font-bold sticky top-0 z-10 border-b border-border shadow-sm">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Colaborador</th>
              <th className="px-4 py-3">EPI (CA)</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Validação (Autenticidade)</th>
              <th className="px-4 py-3">Comprovante Legal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted">Carregando registros...</td></tr>
            ) : filteredAssignments.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Search className="w-8 h-8 opacity-20" />
                    <p>Nenhum registro encontrado para estes filtros.</p>
                  </div>
                </td>
              </tr>
            ) : filteredAssignments.map((a, i) => {
              const epiInfo = Array.isArray(a.epi) ? a.epi[0] : a.epi;
              const workerInfo = Array.isArray(a.worker) ? a.worker[0] : a.worker;
              
              const bioScore = a.biometric_match_score !== null && a.biometric_match_score !== undefined 
                ? Math.round(a.biometric_match_score * 100) 
                : null;
                
              return (
                <motion.tr 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.05, 0.5) }}
                  key={a.id} 
                  className="hover:bg-surface-hover/30 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{format(new Date(a.assigned_at), 'dd/MM/yyyy HH:mm')}</td>
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
                    <div className="flex flex-col gap-1">
                      {bioScore !== null ? (
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-500">
                          <Fingerprint className="w-3.5 h-3.5" />
                          <span>Match: {bioScore}%</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted">
                          <Fingerprint className="w-3.5 h-3.5 opacity-50" />
                          <span>Biometria N/A</span>
                        </div>
                      )}
                      
                      {a.liveness_verified ? (
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-500">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Prova de vida OK</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-500">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Liveness pendente</span>
                        </div>
                      )}
                    </div>
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
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
