import React, { useState, useEffect } from 'react';
import { TrainingCatalog, Worker, WorkerTraining } from '../types';
import { sstService } from '../services/sstService';
import { useWorkers } from '../hooks/useWorkers';
import { useToast } from '../components/ui/Toast';
import { uploadImage } from '../lib/storage';
import { Award, Plus, Calendar, Clock, User, CheckCircle2, Image as ImageIcon, X, ChevronRight, Search, Loader2 } from 'lucide-react';
import { ValidityBadge } from '../components/ui/ValidityBadge';

export function Trainings() {
  const { workers } = useWorkers();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'history' | 'catalog'>('history');
  const [catalog, setCatalog] = useState<TrainingCatalog[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [searchWorker, setSearchWorker] = useState('');

  // Modal: Registrar Treinamento
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [selectedTrainingId, setSelectedTrainingId] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [completedAt, setCompletedAt] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState('');
  const [photosUrls, setPhotosUrls] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal: Novo Item no Catálogo
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [nrCode, setNrCode] = useState('');
  const [title, setTitle] = useState('');
  const [workloadHours, setWorkloadHours] = useState<number | ''>(8);
  const [defaultValidityMonths, setDefaultValidityMonths] = useState<number | ''>(12);
  const [isSavingCatalog, setIsSavingCatalog] = useState(false);

  // Lightbox Image Preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catData, trainData] = await Promise.all([
        sstService.fetchTrainingCatalog(),
        sstService.fetchWorkerTrainings()
      ]);
      setCatalog(catData);
      setTrainings(trainData);
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: 'Falha ao carregar treinamentos.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Ao selecionar um treinamento no formulário, calcular validade padrão automaticamente
  useEffect(() => {
    if (selectedTrainingId && completedAt) {
      const selectedT = catalog.find(c => c.id === selectedTrainingId);
      if (selectedT) {
        const compDate = new Date(completedAt);
        compDate.setMonth(compDate.getMonth() + (selectedT.default_validity_months || 12));
        setValidUntil(compDate.toISOString().slice(0, 10));
      }
    }
  }, [selectedTrainingId, completedAt, catalog]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingPhoto(true);
    try {
      const files = Array.from(e.target.files);
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const url = await uploadImage(file, 'sst-evidence');
        if (url) uploadedUrls.push(url);
      }
      setPhotosUrls(prev => [...prev, ...uploadedUrls]);
      toast({ type: 'success', title: 'Upload Concluído', message: `${uploadedUrls.length} foto(s) anexadas.` });
    } catch (err) {
      toast({ type: 'error', title: 'Erro', message: 'Falha no upload das fotos do treinamento.' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId || !selectedTrainingId || !instructorName || !completedAt || !validUntil) return;

    setSaving(true);
    try {
      await sstService.recordWorkerTraining({
        worker_id: selectedWorkerId,
        training_id: selectedTrainingId,
        instructor_name: instructorName,
        completed_at: completedAt,
        valid_until: validUntil,
        photos_urls: photosUrls,
        notes: notes || undefined
      });

      toast({ type: 'success', title: 'Sucesso', message: 'Treinamento registrado com comprovação fotográfica!' });
      setIsRecordModalOpen(false);
      setSelectedWorkerId('');
      setSelectedTrainingId('');
      setInstructorName('');
      setPhotosUrls([]);
      setNotes('');
      await loadData();
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message || 'Falha ao salvar registro.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nrCode || !title || !workloadHours || !defaultValidityMonths || isSavingCatalog) return;

    setIsSavingCatalog(true);
    try {
      await sstService.createTrainingCatalogItem({
        nr_code: nrCode,
        title,
        workload_hours: Number(workloadHours),
        default_validity_months: Number(defaultValidityMonths)
      });
      toast({ type: 'success', title: 'Sucesso', message: 'Treinamento adicionado ao catálogo!' });
      setIsCatalogModalOpen(false);
      setNrCode('');
      setTitle('');
      await loadData();
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message || 'Falha ao criar item no catálogo.' });
    } finally {
      setIsSavingCatalog(false);
    }
  };

  const filteredTrainings = trainings.filter(t => {
    const q = searchWorker.toLowerCase();
    const workerName = t.worker?.full_name?.toLowerCase() || '';
    const regNum = t.worker?.registration_number?.toLowerCase() || '';
    const trainingTitle = t.training?.title?.toLowerCase() || '';
    const nr = t.training?.nr_code?.toLowerCase() || '';
    return workerName.includes(q) || regNum.includes(q) || trainingTitle.includes(q) || nr.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Award className="w-8 h-8 text-primary" /> Treinamentos & NRs
          </h1>
          <p className="text-muted mt-1">Gestão de capacitações obrigatórias, turmas e registro fotográfico.</p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'catalog' ? (
            <button
              onClick={() => setIsCatalogModalOpen(true)}
              className="bg-primary text-primary-foreground font-semibold py-2 px-4 rounded-md flex items-center gap-2 text-sm shadow hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" /> + Nova NR / Curso
            </button>
          ) : (
            <button
              onClick={() => setIsRecordModalOpen(true)}
              className="bg-primary text-primary-foreground font-semibold py-2 px-4 rounded-md flex items-center gap-2 text-sm shadow hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" /> + Registrar Treinamento
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 font-semibold text-sm transition-colors relative ${activeTab === 'history' ? 'text-primary' : 'text-muted hover:text-foreground'}`}
        >
          Histórico por Colaborador ({trainings.length})
          {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`pb-3 font-semibold text-sm transition-colors relative ${activeTab === 'catalog' ? 'text-primary' : 'text-muted hover:text-foreground'}`}
        >
          Catálogo de Cursos & NRs ({catalog.length})
          {activeTab === 'catalog' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
      </div>

      {/* Tab: Histórico por Colaborador */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar por colaborador, matrícula ou NR..."
              value={searchWorker}
              onChange={e => setSearchWorker(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-hover/50 text-[11px] uppercase tracking-wider text-muted">
                    <th className="p-4 font-semibold">Colaborador</th>
                    <th className="p-4 font-semibold">Treinamento (NR)</th>
                    <th className="p-4 font-semibold">Instrutor</th>
                    <th className="p-4 font-semibold">Data Conclusão</th>
                    <th className="p-4 font-semibold">Validade / Status</th>
                    <th className="p-4 font-semibold text-center">Registro Fotográfico</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredTrainings.map(t => {
                    const photos = Array.isArray(t.photos_urls) ? t.photos_urls : [];

                    return (
                      <tr key={t.id} className="border-b border-border hover:bg-surface-hover/30 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-foreground">{t.worker?.full_name}</div>
                          <div className="text-xs text-muted font-mono">Mat: {t.worker?.registration_number} • {t.worker?.current_role || 'Função N/A'}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-primary">{t.training?.nr_code}</div>
                          <div className="text-xs text-muted">{t.training?.title} ({t.training?.workload_hours}h)</div>
                        </td>
                        <td className="p-4 text-xs font-medium text-foreground">
                          {t.instructor_name}
                        </td>
                        <td className="p-4 text-xs text-muted">
                          {new Date(t.completed_at).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="text-xs font-mono text-muted mb-1">{new Date(t.valid_until).toLocaleDateString()}</div>
                          <ValidityBadge date={t.valid_until} />
                        </td>
                        <td className="p-4 text-center">
                          {photos.length > 0 ? (
                            <div className="flex items-center justify-center gap-1.5">
                              {photos.slice(0, 3).map((url: string, idx: number) => (
                                <img
                                  key={idx}
                                  src={url}
                                  alt="Evidência"
                                  onClick={() => setPreviewImage(url)}
                                  className="w-8 h-8 rounded object-cover border border-border cursor-pointer hover:scale-110 transition-transform"
                                />
                              ))}
                              {photos.length > 3 && (
                                <span className="text-xs font-bold text-muted bg-surface-hover px-1.5 py-0.5 rounded">
                                  +{photos.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted">Sem fotos</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredTrainings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted">
                        {loading ? 'Carregando treinamentos...' : 'Nenhum treinamento registrado.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Catálogo de NRs */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalog.map(c => (
            <div key={c.id} className="p-5 bg-surface border border-border rounded-xl space-y-3 shadow-sm hover:border-primary/50 transition-colors">
              <div className="flex justify-between items-start">
                <span className="font-mono text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded">
                  {c.nr_code}
                </span>
                <span className="text-xs text-muted flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {c.workload_hours}h
                </span>
              </div>
              <h3 className="font-bold text-foreground text-base">{c.title}</h3>
              <p className="text-xs text-muted">Validade padrão recomendada: <strong>{c.default_validity_months} meses</strong></p>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Registrar Treinamento de Colaborador */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-foreground">Registrar Treinamento Realizado</h2>
                <p className="text-xs text-muted mt-0.5">Vincule o trabalhador à capacitação com comprovação fotográfica.</p>
              </div>
              <button onClick={() => setIsRecordModalOpen(false)} className="text-muted hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveRecord} className="p-6 overflow-y-auto flex-1 space-y-4">
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
                      {w.full_name} • Matrícula: {w.registration_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Treinamento / Norma *</label>
                  <select
                    required
                    value={selectedTrainingId}
                    onChange={e => setSelectedTrainingId(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Selecione o Curso</option>
                    {catalog.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nr_code} - {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Instrutor / Responsável *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome do Instrutor"
                    value={instructorName}
                    onChange={e => setInstructorName(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Data de Realização *</label>
                  <input
                    type="date"
                    required
                    value={completedAt}
                    onChange={e => setCompletedAt(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Validade do Treinamento *</label>
                  <input
                    type="date"
                    required
                    value={validUntil}
                    onChange={e => setValidUntil(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              {/* Upload Múltiplo de Fotos (Registro Fotográfico) */}
              <div className="p-4 bg-surface-hover/30 border border-border rounded-lg space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-primary">
                  Registro Fotográfico da Turma / Prática
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer bg-surface border border-border px-3.5 py-2 rounded-md hover:bg-surface-hover flex items-center gap-2 text-xs text-foreground font-medium transition-colors shadow-sm">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    {uploadingPhoto ? 'Enviando fotos...' : 'Anexar Fotos'}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                    />
                  </label>
                  <span className="text-[11px] text-muted">Selecione uma ou mais fotos da aplicação do treinamento.</span>
                </div>

                {photosUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {photosUrls.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img src={url} alt="Evidência" className="w-16 h-16 rounded object-cover border border-border" />
                        <button
                          type="button"
                          onClick={() => setPhotosUrls(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Observações Adicionais</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Conteúdo programático abordado, local da aula prática, etc..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 bg-surface hover:bg-surface-hover border border-border text-foreground rounded-md text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedWorkerId || !selectedTrainingId}
                  className="px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-md text-sm shadow disabled:opacity-50"
                >
                  {saving ? 'Registrando...' : 'Salvar Treinamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Curso no Catálogo */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">Cadastrar Norma / Curso</h3>
              <button onClick={() => setIsCatalogModalOpen(false)} className="text-muted hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateCatalogItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Código da Norma / Sigla *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: NR-10, NR-35, NR-12"
                  value={nrCode}
                  onChange={e => setNrCode(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm font-mono focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Título do Treinamento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Segurança em Instalações e Serviços em Eletricidade"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Carga Horária (h) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={workloadHours}
                    onChange={e => setWorkloadHours(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm font-mono focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Validade Padrão (Meses) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={defaultValidityMonths}
                    onChange={e => setDefaultValidityMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm font-mono focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button type="button" disabled={isSavingCatalog} onClick={() => setIsCatalogModalOpen(false)} className="px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={isSavingCatalog}
                  className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-md shadow disabled:opacity-50"
                >
                  {isSavingCatalog && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSavingCatalog ? 'Salvando...' : 'Salvar no Catálogo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Preview */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-3xl max-h-[90vh]">
            <img src={previewImage} alt="Evidência Fotográfica" className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain border border-border" />
            <button onClick={() => setPreviewImage(null)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-2 hover:bg-black">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
