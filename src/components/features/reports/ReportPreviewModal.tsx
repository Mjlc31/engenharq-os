import React, { useState } from 'react';
import { X, Download, Printer, Search, FileText } from 'lucide-react';
import Papa from 'papaparse';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  columns: { key: string; label: string; align?: 'left' | 'center' | 'right' }[];
  data: any[];
  onDownloadPdf?: () => void;
  loading?: boolean;
}

export function ReportPreviewModal({
  isOpen,
  onClose,
  title,
  subtitle,
  columns,
  data,
  onDownloadPdf,
  loading = false
}: ReportPreviewModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredData = data.filter(row => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(row).some(val => 
      String(val || '').toLowerCase().includes(term)
    );
  });

  const handleExportCsv = () => {
    if (data.length === 0) return;
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl max-h-[90vh] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-background/50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground">{title}</h3>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {filteredData.length} registros
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">{subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-xs font-medium text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>

            {onDownloadPdf && (
              <button
                onClick={onDownloadPdf}
                className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Gerar PDF
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="p-4 border-b border-border bg-surface flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar nesta pré-visualização..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Modal Table Body */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-medium">Carregando dados do relatório...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted">
              <FileText className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm font-medium text-foreground">Nenhum registro encontrado</p>
              <p className="text-xs text-muted">Ajuste os filtros ou verifique o período selecionado.</p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-background border-b border-border font-semibold text-muted uppercase text-[10px] tracking-wider">
                    {columns.map(col => (
                      <th 
                        key={col.key} 
                        className={`p-3 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface-hover transition-colors">
                      {columns.map(col => (
                        <td 
                          key={col.key} 
                          className={`p-3 text-foreground ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right font-mono' : 'text-left'}`}
                        >
                          {row[col.key] !== null && row[col.key] !== undefined ? String(row[col.key]) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-border bg-background/50 flex items-center justify-between text-xs text-muted px-5">
          <span>EngenharQ OS • Relatórios Gerenciais de Segurança</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground font-medium text-xs cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
