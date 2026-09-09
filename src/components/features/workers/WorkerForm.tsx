import React, { useState } from 'react';
import { ConstructionSite } from '../../../types';

interface WorkerFormProps {
  sites: ConstructionSite[];
  onSubmit: (workerData: any) => Promise<void>;
}

export function WorkerForm({ sites, onSubmit }: WorkerFormProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      full_name: fullName,
      cpf,
      registration_number: registration,
      email: email || null,
      status: status,
      current_site_id: siteId || null,
      initial_role: initialRole || null,
      admission_date: admissionDate || null,
      birth_date: birthDate || null,
      work_sector: workSector || null,
      uniform_size: uniformSize || null,
      boot_size: bootSize || null,
      apt_for_height_and_confined_space: aptForHeight,
      phone_contact: phoneContact || null,
      reference_photo_url: referencePhotoUrl || null
    });
    
    setFullName('');
    setCpf('');
    setRegistration('');
    setEmail('');
    setStatus('ACTIVE');
    setSiteId('');
    setInitialRole('');
    setAdmissionDate('');
    setBirthDate('');
    setWorkSector('');
    setUniformSize('');
    setBootSize('');
    setAptForHeight(false);
    setPhoneContact('');
    setReferencePhotoUrl('');
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted">Nome Completo</label>
        <input
          type="text"
          required
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted">CPF</label>
        <input
          type="text"
          required
          value={cpf}
          onChange={e => setCpf(e.target.value)}
          className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          placeholder="000.000.000-00"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted">Matrícula</label>
        <input
          type="text"
          required
          value={registration}
          onChange={e => setRegistration(e.target.value)}
          className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          placeholder="MAT-1234"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          placeholder="email@exemplo.com"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted">Status</label>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="ACTIVE">Ativo</option>
          <option value="INACTIVE">Inativo</option>
          <option value="VACATION">Férias</option>
          <option value="DISMISSED">Desligado</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted">Obra Atual</label>
        <select
          value={siteId}
          onChange={e => setSiteId(e.target.value)}
          className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Não alocado</option>
          {sites.map(site => (
            <option key={site.id} value={site.id}>{site.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted">Cargo Inicial</label>
        <input
          type="text"
          value={initialRole}
          onChange={e => setInitialRole(e.target.value)}
          className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted">Data de Admissão</label>
        <input
          type="date"
          value={admissionDate}
          onChange={e => setAdmissionDate(e.target.value)}
          className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted">Data de Nascimento</label>
        <input
          type="date"
          value={birthDate}
          onChange={e => setBirthDate(e.target.value)}
          className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted">Setor</label>
        <input
          type="text"
          value={workSector}
          onChange={e => setWorkSector(e.target.value)}
          className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted">Contato (Telefone)</label>
        <input
          type="text"
          value={phoneContact}
          onChange={e => setPhoneContact(e.target.value)}
          className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted">Tamanho Uniforme</label>
        <input
          type="text"
          value={uniformSize}
          onChange={e => setUniformSize(e.target.value)}
          className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted">Tamanho Bota</label>
        <input
          type="text"
          value={bootSize}
          onChange={e => setBootSize(e.target.value)}
          className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>
      <div className="space-y-2 sm:col-span-2 lg:col-span-3">
        <label className="text-sm font-medium text-muted">URL da Foto de Referência</label>
        <input
          type="text"
          value={referencePhotoUrl}
          onChange={e => setReferencePhotoUrl(e.target.value)}
          className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          placeholder="https://..."
        />
      </div>
      <div className="space-y-2 pt-8 sm:col-span-2 lg:col-span-4 border-t border-border mt-4">
        <label className="text-sm font-bold text-foreground block mb-2">Aptidão para Trabalho em Altura e Espaço Confinado</label>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground">
            <input
              type="radio"
              name="aptForHeight"
              checked={aptForHeight === true}
              onChange={() => setAptForHeight(true)}
              className="w-4 h-4 text-primary focus:ring-primary"
            />
            Sim
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground">
            <input
              type="radio"
              name="aptForHeight"
              checked={aptForHeight === false}
              onChange={() => setAptForHeight(false)}
              className="w-4 h-4 text-primary focus:ring-primary"
            />
            Não
          </label>
        </div>
      </div>
      <div className="flex justify-end mt-2 sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          className="py-2 px-6 font-medium bg-primary text-background rounded-md hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        >
          Salvar Registro
        </button>
      </div>
    </form>
  );
}
