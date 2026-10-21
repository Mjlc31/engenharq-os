import React, { useState, useRef } from 'react';
import { X, Upload, Download, FileSpreadsheet, AlertTriangle, Loader2, HelpCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../ui/Toast';
import { useSites } from '../../../hooks/useSites';
import { isValidCPF } from '../../../lib/validators';

interface BulkImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
  siteId?: string;
}

export function BulkImportModal({ onClose, onSuccess, siteId }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { sites } = useSites();

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/modelo_colaboradores.xlsm';
    link.download = 'Controle_de_ASO_EngenharQ.xlsm';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

      const workersToInsert: any[] = [];
      const validationErrors: string[] = [];
      
      const siteMap = new Map(sites.map(s => [s.name.toLowerCase().trim(), s.id]));

      rows.forEach((row, index) => {
        const rowNum = index + 2; 
        
        if (!row['NOME']) validationErrors.push(`Linha ${rowNum}: 'NOME' é obrigatório.`);
        if (!row['CPF']) validationErrors.push(`Linha ${rowNum}: 'CPF' é obrigatório.`);
        if (!row['OBRA']) validationErrors.push(`Linha ${rowNum}: 'OBRA' é obrigatório.`);
        
        const cpfClean = String(row['CPF'] || '').replace(/\D/g, '');
        
        if (row['CPF'] && !isValidCPF(cpfClean)) {
          validationErrors.push(`Linha ${rowNum}: CPF inválido (${row['CPF']}).`);
        }
        
        const obraName = String(row['OBRA'] || '').toLowerCase().trim();
        const siteId = siteMap.get(obraName);
        if (row['OBRA'] && !siteId) {
          validationErrors.push(`Linha ${rowNum}: Obra '${row['OBRA']}' não encontrada no sistema. Cadastre a obra primeiro com este exato nome.`);
        }

        let apt = null;
        if (row['APTIDÃO ALTURA / ESPAÇO CONFINADO']) {
           const val = String(row['APTIDÃO ALTURA / ESPAÇO CONFINADO']).toUpperCase();
           if (val.includes('APTO') && !val.includes('INAPTO')) apt = true;
           else if (val.includes('INAPTO')) apt = false;
        }
        
        const parseDate = (val: any) => {
          if (!val) return null;
          if (typeof val === 'number') {
            const date = new Date(Math.round((val - 25569)*86400*1000));
            return date.toISOString().split('T')[0];
          }
          if (typeof val === 'string') {
            const parts = val.split('/');
            if (parts.length === 3) {
              return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            try {
              const d = new Date(val);
              if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
            } catch {
              // ignore invalid date parsing
            }
          }
          return null;
        };

        workersToInsert.push({
          full_name: String(row['NOME']).trim(),
          cpf: cpfClean,
          registration_number: String(row['MAT.'] || `GERADO-${Date.now()}-${index}`).trim(),
          current_site_id: siteId || null,
          initial_role: row['FUNÇÃO INICIAL'] ? String(row['FUNÇÃO INICIAL']).trim() : null,
          current_role: row['FUNÇÃO INICIAL'] ? String(row['FUNÇÃO INICIAL']).trim() : null,
          work_sector: row['SETOR'] ? String(row['SETOR']).trim() : null,
          admission_date: parseDate(row['ADMISSÃO']),
          birth_date: parseDate(row['DATA DE NASCIMENTO']),
          aso_date: parseDate(row['DATA DO ASO']),
          phone_contact: row['CONTATO TELEFÔNICO'] ? String(row['CONTATO TELEFÔNICO']).trim() : null,
          uniform_size: row['TAMANHO DE FARDAMENTO'] ? String(row['TAMANHO DE FARDAMENTO']).trim() : null,
          boot_size: row['Nº DE BOTA'] ? String(row['Nº DE BOTA']).trim() : null,
          apt_for_height_and_confined_space: apt,
          status: 'ACTIVE'
        });
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
              <button 
                onClick={() => setShowManual(true)}
                className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-hover border border-border text-foreground rounded-md font-medium text-sm transition-colors"
              >
                <HelpCircle className="w-4 h-4" /> Instruções de Preenchimento
              </button>
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
      {showManual && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface-hover/20">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary"/> Manual de Preenchimento da Planilha</h2>
              <button onClick={() => setShowManual(false)} className="p-2 hover:bg-surface-hover rounded-full transition-colors text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 text-sm text-foreground">
              <p>Siga estas regras estritamente para garantir que o sistema importe centenas de funcionários sem erros. O sistema processa os dados de forma automatizada baseada nestes padrões.</p>
              
              <div className="space-y-4">
                <div className="bg-surface-hover/30 p-4 rounded-lg border border-border/50">
                  <h3 className="font-bold text-base mb-2">1. Dados Obrigatórios</h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li><strong className="text-foreground">NOME:</strong> Nome completo do colaborador.</li>
                    <li><strong className="text-foreground">CPF:</strong> Obrigatório. Pode conter pontos e traços ou apenas números. O sistema limpará os caracteres especiais. (Ex: <span className="font-mono bg-background px-1 rounded">123.456.789-00</span>).</li>
                    <li><strong className="text-foreground">OBRA:</strong> O nome da obra digitado na planilha <strong className="text-red-500">DEVE SER EXATAMENTE IGUAL</strong> ao nome da obra cadastrada no sistema. Se digitar diferente, o sistema bloqueará a importação desta linha.</li>
                  </ul>
                </div>

                <div className="bg-surface-hover/30 p-4 rounded-lg border border-border/50">
                  <h3 className="font-bold text-base mb-2">2. Formato de Datas (MUITO IMPORTANTE)</h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>Colunas: <strong className="text-foreground">ADMISSÃO, DATA DE NASCIMENTO, DATA DO ASO</strong></li>
                    <li>O Excel pode enviar a data como "Texto" ou como "Data". O nosso sistema aceita ambos.</li>
                    <li>Se for digitar manualmente como texto, use ESTRITAMENTE o padrão brasileiro: <span className="font-mono bg-background px-1 text-primary font-bold rounded">DD/MM/AAAA</span> (Ex: 25/01/2024).</li>
                  </ul>
                </div>

                <div className="bg-surface-hover/30 p-4 rounded-lg border border-border/50">
                  <h3 className="font-bold text-base mb-2">3. Mapeamento de Booleans (Sim/Não)</h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>Coluna: <strong className="text-foreground">APTIDÃO ALTURA / ESPAÇO CONFINADO</strong></li>
                    <li>Para indicar que o funcionário está apto, digite a palavra <strong className="text-emerald-500 font-bold">APTO</strong>.</li>
                    <li>Para indicar que não está apto, digite a palavra <strong className="text-red-500 font-bold">INAPTO</strong>.</li>
                    <li>Qualquer outra palavra será ignorada e o campo ficará vazio.</li>
                  </ul>
                </div>

                <div className="bg-surface-hover/30 p-4 rounded-lg border border-border/50">
                  <h3 className="font-bold text-base mb-2">4. Campos Opcionais</h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li><strong className="text-foreground">MAT.:</strong> Matrícula. Se deixar em branco, o sistema vai gerar uma matrícula automática para não quebrar o cadastro.</li>
                    <li><strong className="text-foreground">SETOR, FUNÇÃO, TAMANHO, BOTA, TELEFONE:</strong> Podem ficar em branco.</li>
                  </ul>
                </div>
                
                <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/20 text-amber-600">
                  <strong className="block mb-1">⚠️ Dica de Ouro:</strong>
                  Evite deixar linhas totalmente em branco no meio da planilha. Após preencher, baixe o arquivo em <strong>.xlsm</strong> ou <strong>.xlsx</strong> e suba no sistema.
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end">
              <button onClick={() => setShowManual(false)} className="px-6 py-2 bg-primary text-background font-bold rounded-md hover:bg-primary-dark transition-colors">
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
