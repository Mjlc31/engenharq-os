import React, { useState, useEffect } from 'react';
import { Worker, WorkerAso, AsoType } from '../types';
import { sstService } from '../services/sstService';
import { useWorkers } from '../hooks/useWorkers';
import { useToast } from '../components/ui/Toast';
import { HeartPulse, Plus, Search, Calendar, UserCheck, CheckCircle2, XCircle, FileText, X } from 'lucide-react';
import { ValidityBadge } from '../components/ui/ValidityBadge';

export function Aso() {
  const { workers, sites } = useWorkers();
  const { toast } = useToast();

  const [asos, setAsos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [type, setType] = useState<AsoType>('PERIODICO');
  const [issuedAt, setIssuedAt] = useState(new Date().toISOString().slice(0, 10));
  const [validityYears, setValidityYears] = useState<1 | 2>(1);
  const [fitForHeight, setFitForHeight] = useState(false);
  const [fitForConfinedSpace, setFitForConfinedSpace] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await sstService.fetchWorkerAsos();
      setAsos(data);
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: 'Falha ao carregar registros de ASO.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Cálculo reativo da data de vencimento
  const computedValidUntil = React.useMemo(() => {
    if (!issuedAt) return '';
    const d = new Date(issuedAt);
    d.setFullYear(d.getFullYear() + validityYears);
    return d.toISOString().slice(0, 10);
  }, [issuedAt, validityYears]);

  const selectedWorker = workers.find(w => w.id === selectedWorkerId);

  const handleSaveAso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId || !issuedAt) return;

    setSaving(true);
    try {
      await sstService.recordWorkerAso({
        worker_id: selectedWorkerId,
        type,
        issued_at: issuedAt,
        validity_years: validityYears,
        fit_for_height: fitForHeight,
        fit_for_confined_space: fitForConfinedSpace,
        doctor_name: doctorName || undefined
      });

      toast({ 
        type: 'success', 
        title: 'ASO Registrado!', 
        message: 'Atestado gravado e perfil do colaborador sincronizado com as aptidões.' 
      });

      setIsModalOpen(false);
      setSelectedWorkerId('');
      setDoctorName('');
      setFitForHeight(false);
      setFitForConfinedSpace(false);
      await loadData();
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message || 'Falha ao cadastrar ASO.' });
    } finally {
      setSaving(false);
    }
  };

  const filteredAsos = asos.filter(a => {
    const q = search.toLowerCase();
    const workerName = a.worker?.full_name?.toLowerCase() || '';
    const regNum = a.worker?.registration_number?.toLowerCase() || '';
    const asoType = a.type?.toLowerCase() || '';
    return workerName.includes(q) || regNum.includes(q) || asoType.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HeartPulse className="w-8 h-8 text-primary" /> ASO - Atestado de Saúde Ocupacional
          </h1>
          <p className="text-muted mt-1">Controle de exames médicos ocupacionais, prazos e aptidões para trabalho em altura e espaço confinado.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground font-semibold py-2 px-4 rounded-md flex items-center gap-2 text-sm shadow hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> + Novo ASO
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Buscar por colaborador, matrícula ou tipo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
        />
      </div>

      {/* Tabela de ASOs */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/50 text-[11px] uppercase tracking-wider text-muted">
                <th className="p-4 font-semibold">Colaborador</th>
                <th className="p-4 font-semibold">Tipo de ASO</th>
                <th className="p-4 font-semibold">Data de Emissão</th>
                <th className="p-4 font-semibold">Vencimento / Semáforo</th>
                <th className="p-4 font-semibold text-center">Aptidão NR-35 (Altura)</th>
                <th className="p-4 font-semibold text-center">Aptidão NR-33 (Espaço Confinado)</th>
                <th className="p-4 font-semibold">Médico Coordenador</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredAsos.map(a => (
                <tr key={a.id} className="border-b border-border hover:bg-surface-hover/30 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-foreground">{a.worker?.full_name}</div>
                    <div className="text-xs text-muted font-mono">
                      Mat: {a.worker?.registration_number} • CPF: {a.worker?.cpf || 'S/N'}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded">
                      {a.type}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-muted font-mono">
                    {new Date(a.issued_at).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="font-mono text-xs text-foreground mb-1">
                      {new Date(a.valid_until).toLocaleDateString()} ({a.validity_years} ano{a.validity_years > 1 ? 's' : ''})
                    </div>
                    <ValidityBadge date={a.valid_until} />
                  </td>
                  <td className="p-4 text-center">
                    {a.fit_for_height ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Apto
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                        <XCircle className="w-3.5 h-3.5" /> Inapto
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {a.fit_for_confined_space ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Apto
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                        <XCircle className="w-3.5 h-3.5" /> Inapto
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-xs text-muted">
                    {a.doctor_name || 'Não informado'}
                  </td>
                </tr>
              ))}

              {filteredAsos.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    {loading ? 'Carregando atestados...' : 'Nenhum ASO registrado.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Novo ASO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-foreground">Cadastrar ASO do Colaborador</h2>
                <p className="text-xs text-muted mt-0.5">Define a vigência e as aptidões físicas do trabalhador.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveAso} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Colaborador *</label>
                <select
                  required
                  value={selectedWorkerId}
                  onChange={e => setSelectedWorkerId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">Selecione o Colaborador</option>
                  {workers.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.full_name} • Mat: {w.registration_number} • CPF: {w.cpf}
                    </option>
                  ))}
                </select>
              </div>

              {selectedWorker && (
                <div className="p-3 bg-surface-hover/30 border border-border rounded-md text-xs space-y-1 text-muted">
                  <div><strong>Função Atual:</strong> {selectedWorker.current_role || 'Não cadastrada'}</div>
                  <div><strong>Setor:</strong> {selectedWorker.work_sector || 'Geral'}</div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Tipo de ASO *</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as AsoType)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="ADMISSIONAL">Admissional</option>
                    <option value="PERIODICO">Periódico</option>
                    <option value="RETORNO_TRABALHO">Retorno ao Trabalho</option>
                    <option value="MUDANCA_FUNCAO">Mudança de Função</option>
                    <option value="DEMISSIONAL">Demissional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Médico Coordenador / CRM</label>
                  <input
                    type="text"
                    placeholder="Ex: Dr. Roberto Silva - CRM/AL 1234"
                    value={doctorName}
                    onChange={e => setDoctorName(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Data de Realização do Exame *</label>
                  <input
                    type="date"
                    required
                    value={issuedAt}
                    onChange={e => setIssuedAt(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Prazo de Validade *</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
                      <input
                        type="radio"
                        name="validityYears"
                        checked={validityYears === 1}
                        onChange={() => setValidityYears(1)}
                        className="text-primary focus:ring-primary"
                      />
                      1 Ano
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
                      <input
                        type="radio"
                        name="validityYears"
                        checked={validityYears === 2}
                        onChange={() => setValidityYears(2)}
                        className="text-primary focus:ring-primary"
                      />
                      2 Anos
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-primary/10 border border-primary/20 rounded-md flex justify-between items-center text-xs">
                <span className="font-semibold text-foreground">Data de Vencimento Calculada:</span>
                <span className="font-mono font-bold text-primary text-sm">
                  {computedValidUntil ? new Date(computedValidUntil).toLocaleDateString() : '-'}
                </span>
              </div>

              {/* Toggles de Aptidão */}
              <div className="p-4 bg-surface-hover/30 border border-border rounded-lg space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Aptidões Ocupacionais Especiais</h4>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-2.5 bg-background border border-border rounded-md cursor-pointer hover:border-primary/50 transition-colors">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Apto para Trabalho em Altura (NR-35)</div>
                      <div className="text-[11px] text-muted">Exames clínicos e psicossociais sem contraindicação.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={fitForHeight}
                      onChange={e => setFitForHeight(e.target.checked)}
                      className="w-5 h-5 text-primary rounded border-border focus:ring-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-background border border-border rounded-md cursor-pointer hover:border-primary/50 transition-colors">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Apto para Espaço Confinado (NR-33)</div>
                      <div className="text-[11px] text-muted">Aptidão cardiorrespiratória atestada para atmosfera confinada.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={fitForConfinedSpace}
                      onChange={e => setFitForConfinedSpace(e.target.checked)}
                      className="w-5 h-5 text-primary rounded border-border focus:ring-primary"
                    />
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-surface hover:bg-surface-hover border border-border text-foreground rounded-md text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedWorkerId}
                  className="px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-md text-sm shadow disabled:opacity-50"
                >
                  {saving ? 'Gravando...' : 'Salvar ASO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
