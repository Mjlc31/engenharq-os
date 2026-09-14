import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useSites } from '../hooks/useSites';
import { useCompany, Company } from '../hooks/useCompany';
import { Building2, MapPin, Search, Edit2, Trash2, Calendar, Navigation, Eye, Upload, Download, ChevronLeft, ChevronRight, Save, Image as ImageIcon, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ConstructionSite } from '../types';
import { uploadImage } from '../lib/storage';
import { useToast } from '../components/ui/Toast';

export function Sites() {
  const { role } = useAuth();
  const { sites, loading: sitesLoading, fetchSites } = useSites();
  const { company, loading: companyLoading, fetchCompany, saveCompany } = useCompany();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'COMPANY' | 'SITES'>('COMPANY');

  // Company State
  const [compName, setCompName] = useState('');
  const [compTradeName, setCompTradeName] = useState('');
  const [compCnpj, setCompCnpj] = useState('');
  const [compIE, setCompIE] = useState('');
  const [compAddress, setCompAddress] = useState('');
  const [compPhone, setCompPhone] = useState('');
  const [compEmail, setCompEmail] = useState('');
  const [compWebsite, setCompWebsite] = useState('');
  const [compRep, setCompRep] = useState('');
  const [compLogo, setCompLogo] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Sites State
  const [isAddingSite, setIsAddingSite] = useState(false);
  const [editingSite, setEditingSite] = useState<ConstructionSite | null>(null);
  
  const [siteCode, setSiteCode] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteCnpj, setSiteCnpj] = useState('');
  const [siteCno, setSiteCno] = useState('');
  const [siteCity, setSiteCity] = useState('');
  const [siteManager, setSiteManager] = useState('');
  const [siteStart, setSiteStart] = useState('');
  const [siteEnd, setSiteEnd] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [siteStatus, setSiteStatus] = useState('ACTIVE');
  const [siteImage, setSiteImage] = useState('');
  const [uploadingSiteImg, setUploadingSiteImg] = useState(false);

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchSites();
    fetchCompany();
  }, [fetchSites, fetchCompany]);

  useEffect(() => {
    if (company) {
      setCompName(company.legal_name || '');
      setCompTradeName(company.trade_name || '');
      setCompCnpj(company.cnpj || '');
      setCompIE(company.state_registration || '');
      setCompAddress(company.address || '');
      setCompPhone(company.phone || '');
      setCompEmail(company.email || '');
      setCompWebsite(company.website || '');
      setCompRep(company.legal_representative || '');
      setCompLogo(company.logo_url || '');
    }
  }, [company]);

  const handleSaveCompany = async () => {
    const data: Company = {
      id: company?.id,
      legal_name: compName,
      trade_name: compTradeName,
      cnpj: compCnpj,
      state_registration: compIE,
      address: compAddress,
      phone: compPhone,
      email: compEmail,
      website: compWebsite,
      legal_representative: compRep,
      logo_url: compLogo
    };
    await saveCompany(data);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingLogo(true);
    const url = await uploadImage(e.target.files[0], 'site-images');
    if (url) setCompLogo(url);
    setUploadingLogo(false);
  };

  const handleSiteImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingSiteImg(true);
    const url = await uploadImage(e.target.files[0], 'site-images');
    if (url) setSiteImage(url);
    setUploadingSiteImg(false);
  };

  const resetSiteForm = () => {
    setIsAddingSite(false);
    setEditingSite(null);
    setSiteCode('');
    setSiteName('');
    setSiteCnpj('');
    setSiteCno('');
    setSiteCity('');
    setSiteManager('');
    setSiteStart('');
    setSiteEnd('');
    setSiteAddress('');
    setSiteStatus('ACTIVE');
    setSiteImage('');
  };

  const handleEditSiteClick = (site: ConstructionSite) => {
    setEditingSite(site);
    setSiteCode(site.code || '');
    setSiteName(site.name || '');
    setSiteCnpj(site.cnpj || '');
    setSiteCno(site.cno || '');
    setSiteCity(site.city || '');
    setSiteManager(site.manager_name || '');
    setSiteStart(site.start_date || '');
    setSiteEnd(site.end_date || '');
    setSiteAddress(site.address || '');
    setSiteStatus(site.status || 'ACTIVE');
    setSiteImage(site.image_url || '');
    setIsAddingSite(true);
  };

  const handleSaveSite = async () => {
    if (!siteName) {
      toast({ type: 'error', title: 'Erro', message: 'Nome da obra é obrigatório.' });
      return;
    }
    const payload = {
      code: siteCode,
      name: siteName,
      cnpj: siteCnpj,
      cno: siteCno,
      city: siteCity,
      manager_name: siteManager,
      start_date: siteStart || null,
      end_date: siteEnd || null,
      address: siteAddress,
      status: siteStatus,
      image_url: siteImage,
      latitude: null,
      longitude: null
    };

    try {
      if (editingSite) {
        const { error } = await supabase.from('construction_sites').update(payload).eq('id', editingSite.id);
        if (error) throw error;
        toast({ type: 'success', title: 'Sucesso', message: 'Obra atualizada.' });
      } else {
        const { error } = await supabase.from('construction_sites').insert([payload]);
        if (error) throw error;
        toast({ type: 'success', title: 'Sucesso', message: 'Obra registrada.' });
      }
      resetSiteForm();
      fetchSites();
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message });
    }
  };

  const handleDeleteSite = async (id: string) => {
    try {
      const { error } = await supabase.from('construction_sites').delete().eq('id', id);
      if (error) throw error;
      toast({ type: 'success', title: 'Sucesso', message: 'Obra excluída.' });
      fetchSites();
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: 'Falha ao excluir.' });
    }
  };

  const filteredSites = sites.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.code && s.code.toLowerCase().includes(search.toLowerCase())) ||
    (s.city && s.city.toLowerCase().includes(search.toLowerCase()))
  );
  
  const totalPages = Math.ceil(filteredSites.length / itemsPerPage);
  const paginatedSites = filteredSites.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Empresa / Obras</h1>
          <p className="text-muted mt-2">Gerencie os dados da matriz e as obras/filiais ativas.</p>
        </div>
      </div>

      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('COMPANY')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'COMPANY' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}
        >
          Dados da Empresa
        </button>
        <button
          onClick={() => setActiveTab('SITES')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'SITES' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}
        >
          Obras
        </button>
      </div>

      {activeTab === 'COMPANY' && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-24 h-24 rounded-lg bg-surface-hover border border-border flex items-center justify-center overflow-hidden relative group">
              {compLogo ? (
                <img src={compLogo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Building2 className="w-8 h-8 text-muted" />
              )}
              <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-white text-xs">
                <Upload className="w-4 h-4 mb-1" />
                {uploadingLogo ? 'Enviando...' : 'Alterar'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
              </label>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{compName || 'Nome da Empresa'}</h2>
              <p className="text-muted">{compCnpj || 'CNPJ não informado'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b border-border pb-2">Informações Gerais</h3>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Razão Social *</label>
                <input type="text" value={compName} onChange={e => setCompName(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Nome Fantasia</label>
                <input type="text" value={compTradeName} onChange={e => setCompTradeName(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">CNPJ *</label>
                  <input type="text" value={compCnpj} onChange={e => setCompCnpj(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Insc. Estadual</label>
                  <input type="text" value={compIE} onChange={e => setCompIE(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Representante Legal</label>
                <input type="text" value={compRep} onChange={e => setCompRep(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b border-border pb-2">Contato e Endereço</h3>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Endereço Completo</label>
                <input type="text" value={compAddress} onChange={e => setCompAddress(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Telefone Comercial</label>
                  <input type="text" value={compPhone} onChange={e => setCompPhone(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">E-mail Corporativo</label>
                  <input type="email" value={compEmail} onChange={e => setCompEmail(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Site</label>
                <input type="url" value={compWebsite} onChange={e => setCompWebsite(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end">
            <button onClick={handleSaveCompany} disabled={!compName || !compCnpj} className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50">
              <Save className="w-4 h-4" /> Salvar Dados
            </button>
          </div>
        </div>
      )}

      {activeTab === 'SITES' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input type="text" placeholder="Buscar por código, nome ou cidade..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary text-foreground" />
            </div>
            <button onClick={() => setIsAddingSite(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2">
              + Nova Obra
            </button>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-hover/50 text-xs uppercase tracking-wider text-muted">
                  <th className="p-4 font-medium">Código</th>
                  <th className="p-4 font-medium">Nome</th>
                  <th className="p-4 font-medium">Cidade</th>
                  <th className="p-4 font-medium">Responsável</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {paginatedSites.map(site => (
                  <tr key={site.id} className="border-b border-border hover:bg-surface-hover/30">
                    <td className="p-4 font-mono font-bold text-foreground">{site.code || '-'}</td>
                    <td className="p-4 font-medium">{site.name}</td>
                    <td className="p-4 text-muted">{site.city || '-'}</td>
                    <td className="p-4 text-muted">{site.manager_name || '-'}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 text-[11px] font-bold rounded uppercase ${site.status === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                        {site.status === 'ACTIVE' ? 'Ativa' : 'Finalizada'}
                      </span>
                    </td>
                    <td className="p-4 flex justify-end gap-2">
                      <button onClick={() => handleEditSiteClick(site)} className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {role && ['ADMIN', 'SAFETY_ENGINEER'].includes(role) && (
                        <button onClick={() => setDeleteConfirmId(site.id)} className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {paginatedSites.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted">Nenhuma obra encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isAddingSite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">{editingSite ? 'Editar Obra' : 'Nova Obra'}</h2>
              <button onClick={resetSiteForm} className="text-muted hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Código</label>
                  <input type="text" value={siteCode} onChange={e => setSiteCode(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2" placeholder="Ex: OB01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Status</label>
                  <select value={siteStatus} onChange={e => setSiteStatus(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2">
                    <option value="ACTIVE">Ativa</option>
                    <option value="FINISHED">Finalizada</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Nome da Obra *</label>
                <input type="text" value={siteName} onChange={e => setSiteName(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Responsável (Eng. Residente)</label>
                  <input type="text" value={siteManager} onChange={e => setSiteManager(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Cidade / UF</label>
                  <input type="text" value={siteCity} onChange={e => setSiteCity(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">CNPJ Específico (se houver)</label>
                  <input type="text" value={siteCnpj} onChange={e => setSiteCnpj(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">CNO</label>
                  <input type="text" value={siteCno} onChange={e => setSiteCno(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Data de Início</label>
                  <input type="date" value={siteStart} onChange={e => setSiteStart(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Previsão de Término</label>
                  <input type="date" value={siteEnd} onChange={e => setSiteEnd(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Endereço</label>
                <input type="text" value={siteAddress} onChange={e => setSiteAddress(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Fotografia / Anexo</label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="cursor-pointer bg-surface border border-border px-4 py-2 rounded-md hover:bg-surface-hover flex items-center gap-2 text-sm">
                    <ImageIcon className="w-4 h-4" />
                    {uploadingSiteImg ? 'Enviando...' : 'Fazer Upload'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleSiteImgUpload} disabled={uploadingSiteImg} />
                  </label>
                  {siteImage && <span className="text-emerald-500 text-sm font-medium flex items-center gap-1"><Eye className="w-4 h-4" /> Imagem Anexada</span>}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={resetSiteForm} className="px-4 py-2 bg-surface hover:bg-surface-hover text-foreground rounded-md border border-border">Cancelar</button>
              <button onClick={handleSaveSite} disabled={!siteName} className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50 hover:opacity-90">
                Salvar Obra
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-2">Confirmar Exclusão</h3>
            <p className="text-sm text-muted mb-6">Tem certeza que deseja excluir esta obra? Essa ação não pode ser desfeita.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-muted hover:text-foreground">Cancelar</button>
              <button onClick={() => { handleDeleteSite(deleteConfirmId); setDeleteConfirmId(null); }} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Excluir Obra</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
