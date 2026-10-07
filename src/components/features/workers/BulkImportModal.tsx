import React, { useState, useRef } from 'react';
import { X, Upload, Download, FileSpreadsheet, AlertTriangle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';

interface BulkImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
  siteId?: string;
}

export function BulkImportModal({ onClose, onSuccess, siteId }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDownloadTemplate = () => {
    const ws_data = [
      ['full_name', 'cpf', 'registration_number', 'site_id', 'current_role', 'status', 'aso_date'],
      ['João Silva', '12345678909', 'MAT001', siteId || 'COLAR_ID_DA_OBRA_AQUI', 'Pedreiro', 'ACTIVE', '2023-10-01']
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    // Auto-size columns
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Colaboradores");
    XLSX.writeFile(wb, "Modelo_Importacao_Colaboradores.xlsx");
  };

  const processFile = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setErrors([]);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (rows.length === 0) {
        throw new Error('A planilha está vazia.');
      }

      const workersToInsert = [];
      const validationErrors: string[] = [];

      rows.forEach((row, index) => {
        const rowNum = index + 2; // +1 for 0-index, +1 for header
        
        if (!row.full_name) validationErrors.push(`Linha ${rowNum}: 'full_name' é obrigatório.`);
        if (!row.cpf) validationErrors.push(`Linha ${rowNum}: 'cpf' é obrigatório.`);
        if (!row.site_id) validationErrors.push(`Linha ${rowNum}: 'site_id' é obrigatório.`);
        
        let cpfClean = String(row.cpf || '').replace(/\D/g, '');
        
        if (cpfClean && cpfClean.length !== 11) {
          validationErrors.push(`Linha ${rowNum}: CPF inválido (${row.cpf}).`);
        }

        if (validationErrors.length === 0) {
          workersToInsert.push({
            full_name: String(row.full_name),
            cpf: cpfClean,
            registration_number: String(row.registration_number || `GERADO-${Date.now()}-${index}`),
            current_site_id: String(row.site_id),
            initial_role: row.current_role ? String(row.current_role) : null,
            current_role: row.current_role ? String(row.current_role) : null,
            status: String(row.status || 'ACTIVE').toUpperCase(),
            aso_date: row.aso_date ? new Date(row.aso_date).toISOString().split('T')[0] : null
          });
        }
      });

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        setIsProcessing(false);
        return;
      }

      // Perform bulk insert
      const { error } = await supabase.from('workers').insert(workersToInsert);
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('Erro de duplicidade: Um ou mais CPFs já estão cadastrados.');
        }
        throw error;
      }

      toast({ type: 'success', title: 'Sucesso', message: `${workersToInsert.length} colaboradores importados com sucesso!` });
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setErrors([err.message || 'Falha ao processar a planilha.']);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border flex justify-between items-center bg-surface-hover/20">
          <h2 className="text-xl font-bold text-foreground">Importação em Massa</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-foreground leading-relaxed">
              Adicione múltiplos colaboradores de uma só vez utilizando nossa planilha padrão. 
            </p>
            <div className="flex gap-2">
              <button 
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-md font-medium text-sm transition-colors"
              >
                <Download className="w-4 h-4" /> Baixar Modelo XLSX
              </button>
              <a 
                href="/Spreadsheet_Import_Guide.pdf" 
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-hover border border-border text-foreground rounded-md font-medium text-sm transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" /> Manual de Preenchimento
              </a>
            </div>
          </div>

          <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center bg-background/50 relative">
            <Upload className="w-10 h-10 text-muted mb-4" />
            <p className="text-sm font-medium text-foreground text-center mb-1">
              {file ? file.name : 'Arraste a planilha aqui ou clique para selecionar'}
            </p>
            <p className="text-xs text-muted text-center mb-4">
              Apenas arquivos .xlsx ou .csv
            </p>
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setFile(e.target.files[0]);
                  setErrors([]);
                }
              }}
            />
            {file && (
              <button 
                onClick={() => { setFile(null); setErrors([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="relative z-10 px-3 py-1 bg-surface border border-border rounded text-xs hover:bg-surface-hover"
              >
                Remover Arquivo
              </button>
            )}
          </div>

          {errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex flex-col gap-2 max-h-40 overflow-y-auto">
              <div className="flex items-center gap-2 text-red-500 font-bold text-sm mb-1">
                <AlertTriangle className="w-4 h-4" /> Encontramos erros na planilha
              </div>
              {errors.map((err, i) => (
                <div key={i} className="text-xs text-red-500/80">{err}</div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-3 bg-surface-hover/10">
          <button onClick={onClose} className="px-4 py-2 bg-surface hover:bg-surface-hover text-foreground rounded-md border border-border transition-colors">
            Cancelar
          </button>
          <button 
            onClick={processFile} 
            disabled={!file || isProcessing} 
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50 hover:opacity-90 font-medium transition-opacity"
          >
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
            {isProcessing ? 'Processando...' : 'Importar Dados'}
          </button>
        </div>
      </div>
    </div>
  );
}
