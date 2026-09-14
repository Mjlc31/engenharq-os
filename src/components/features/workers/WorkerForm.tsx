import React, { useState } from 'react';
import { ConstructionSite } from '../../../types';
import { X, Upload, UserCircle2 } from 'lucide-react';
import { uploadImage } from '../../../lib/storage';

interface WorkerFormProps {
  sites: ConstructionSite[];
  onClose: () => void;
  onSave: (workerData: any) => Promise<void>;
}

export function WorkerForm({ sites, onClose, onSave }: WorkerFormProps) {
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [registration, setRegistration] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [siteId, setSiteId] = useState('');
  const [initialRole, setInitialRole] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [workSector, setWorkSector] = useState('');
  const [uniformSize, setUniformSize] = useState('');
  const [bootSize, setBootSize] = useState('');
  const [aptForHeight, setAptForHeight] = useState(false);
  const [phoneContact, setPhoneContact] = useState('');
  const [referencePhotoUrl, setReferencePhotoUrl] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const url = await uploadImage(e.target.files[0], 'worker-photos');
    if (url) setReferencePhotoUrl(url);
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSave({
      full_name: fullName,
      cpf,
      registration_number: registration,
      email: email || null,
      status: status,
      current_site_id: siteId || null,
      initial_role: initialRole || null,
      current_role: initialRole || null,
      admission_date: admissionDate || null,
      birth_date: birthDate || null,
      work_sector: workSector || null,
      uniform_size: uniformSize || null,
      boot_size: bootSize || null,
      apt_for_height_and_confined_space: aptForHeight,
      phone_contact: phoneContact || null,
      reference_photo_url: referencePhotoUrl || null
    });
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-border flex justify-between items-center bg-surface-hover/20">
          <h2 className="text-xl font-bold text-foreground">Novo Funcionário</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-surface-hover border border-border flex items-center justify-center overflow-hidden relative group shrink-0">
              {referencePhotoUrl ? (
                <img src={referencePhotoUrl} alt="Foto" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 className="w-10 h-10 text-muted" />
              )}
              <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-white text-xs">
                <Upload className="w-4 h-4 mb-1" />
                {uploading ? 'Enviando...' : 'Alterar'}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Nome Completo *</label>
                <input required type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">CPF *</label>
              <input required type="text" value={cpf} onChange={e => setCpf(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" placeholder="000.000.000-00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Matrícula *</label>
              <input required type="text" value={registration} onChange={e => setRegistration(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Data de Admissão</label>
              <input type="date" value={admissionDate} onChange={e => setAdmissionDate(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Data de Nascimento</label>
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Obra Vinculada</label>
              <select value={siteId} onChange={e => setSiteId(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground">
                <option value="">Selecione uma obra</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Setor</label>
              <input type="text" value={workSector} onChange={e => setWorkSector(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Função Inicial</label>
              <input type="text" value={initialRole} onChange={e => setInitialRole(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" placeholder="Ex: Eletricista" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Contato (Telefone)</label>
              <input type="text" value={phoneContact} onChange={e => setPhoneContact(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Tamanho Fardamento</label>
              <select value={uniformSize} onChange={e => setUniformSize(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground">
                <option value="">Selecione</option>
                <option value="PP">PP</option><option value="P">P</option>
                <option value="M">M</option><option value="G">G</option>
                <option value="GG">GG</option><option value="XG">XG</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Número Bota</label>
              <select value={bootSize} onChange={e => setBootSize(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground">
                <option value="">Selecione</option>
                {[35,36,37,38,39,40,41,42,43,44,45].map(n => <option key={n} value={n.toString()}>{n}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">Apto p/ Altura e Confinado?</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={aptForHeight} onChange={() => setAptForHeight(true)} className="accent-primary" />
                <span className="text-sm text-foreground">Sim</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!aptForHeight} onChange={() => setAptForHeight(false)} className="accent-primary" />
                <span className="text-sm text-foreground">Não</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-surface hover:bg-surface-hover text-foreground rounded-md border border-border transition-colors">Cancelar</button>
            <button type="submit" disabled={isSubmitting || !fullName || !cpf || !registration} className="px-6 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50 hover:opacity-90 font-medium transition-opacity">
              {isSubmitting ? 'Salvando...' : 'Salvar Funcionário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
