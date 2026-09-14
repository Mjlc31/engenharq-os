const fs = require('fs');

const content = `
import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Shield, Upload, Image as ImageIcon, Box } from 'lucide-react';
import { EpiCatalog } from '../../../types';
import { useAuth } from '../../../components/AuthProvider';
import { uploadImage } from '../../../lib/storage';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../components/ui/Toast';

interface CatalogTabProps {
  catalogs: EpiCatalog[];
  loading: boolean;
  saveCatalog: (payload: Partial<EpiCatalog>, id?: string, initialStock?: number) => Promise<void>;
  deleteCatalog: (id: string) => Promise<void>;
  onRefresh?: () => void;
}

const NR6_CATEGORIES = [
  'Proteção da Cabeça',
  'Proteção dos Olhos e Face',
  'Proteção Auditiva',
  'Proteção Respiratória',
  'Proteção do Tronco',
  'Proteção dos Membros Superiores',
  'Proteção dos Membros Inferiores',
  'Proteção do Corpo Inteiro',
  'Proteção contra Quedas'
];

export function CatalogTab({
  catalogs,
  loading,
  saveCatalog,
  deleteCatalog,
  onRefresh
}: CatalogTabProps) {
  const { role } = useAuth();
  const { toast } = useToast();
  
  const [search, setSearch] = useState('');
  const [isAddingCatalog, setIsAddingCatalog] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<EpiCatalog | null>(null);
  
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [stockItem, setStockItem] = useState<EpiCatalog | null>(null);
  const [stockAmount, setStockAmount] = useState<number | ''>('');
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('Todas as categorias');
  const [catalogCurrentPage, setCatalogCurrentPage] = useState(1);
  const catalogItemsPerPage = 10;

  // Form State
  const [catName, setCatName] = useState('');
  const [catCategory, setCatCategory] = useState(NR6_CATEGORIES[0]);
  const [catModel, setCatModel] = useState('');
  const [catStatus, setCatStatus] = useState('ACTIVE');
  const [catDescription, setCatDescription] = useState('');
  const [catBrand, setCatBrand] = useState('');
  const [catCaNumber, setCatCaNumber] = useState('');
  const [catCaValidity, setCatCaValidity] = useState('');
  const [catLifespanDays, setCatLifespanDays] = useState<number | ''>('');
  const [catMinStock, setCatMinStock] = useState<number | ''>('');
  const [catInitialStock, setCatInitialStock] = useState<number | ''>('');
  const [catImageUrl, setCatImageUrl] = useState('');
  const [catObservations, setCatObservations] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const catalogCategories = useMemo(() => {
    return ['Todas as categorias', ...Array.from(new Set(catalogs.map(c => c.category)))];
  }, [catalogs]);

  const filteredCatalogs = useMemo(() => {
    return catalogs.filter(c => {
      const searchL = search.toLowerCase();
      const matchesSearch = c.name.toLowerCase().includes(searchL) || 
                            c.category.toLowerCase().includes(searchL) ||
                            (c.code && c.code.toLowerCase().includes(searchL));
      const matchesCategory = catalogCategoryFilter === 'Todas as categorias' || c.category === catalogCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [catalogs, search, catalogCategoryFilter]);

  const catalogTotalPages = Math.ceil(filteredCatalogs.length / catalogItemsPerPage);
  const paginatedCatalogs = filteredCatalogs.slice((catalogCurrentPage - 1) * catalogItemsPerPage, catalogCurrentPage * catalogItemsPerPage);

  const resetForm = () => {
    setIsAddingCatalog(false);
    setEditingCatalog(null);
    setCatName('');
    setCatCategory(NR6_CATEGORIES[0]);
    setCatModel('');
    setCatStatus('ACTIVE');
    setCatDescription('');
    setCatBrand('');
    setCatCaNumber('');
    setCatCaValidity('');
    setCatLifespanDays('');
    setCatMinStock('');
    setCatInitialStock('');
    setCatImageUrl('');
    setCatObservations('');
  };

  const handleEdit = (cat: EpiCatalog) => {
    setEditingCatalog(cat);
    setCatName(cat.name);
    setCatCategory(cat.category);
    setCatModel(cat.model || '');
    setCatStatus(cat.status || 'ACTIVE');
    setCatDescription(cat.description || '');
    setCatBrand(cat.brand || '');
    setCatCaNumber(cat.ca_number || '');
    setCatCaValidity(cat.ca_validity || '');
    setCatLifespanDays(cat.lifespan_days || '');
    setCatMinStock(cat.minimum_stock || '');
    setCatInitialStock('');
    setCatImageUrl(cat.image_url || '');
    setCatObservations(cat.observations || '');
    setIsAddingCatalog(true);
  };
  
  const handleAddStock = async () => {
    if (!stockItem || !stockAmount || stockAmount <= 0) return;
    setIsUpdatingStock(true);
    try {
      const newStock = (stockItem.current_stock || 0) + Number(stockAmount);
      const { error } = await supabase
        .from('epi_catalog')
        .update({ current_stock: newStock })
        .eq('id', stockItem.id);
      
      if (error) throw error;
      toast({ type: 'success', title: 'Sucesso', message: 'Saldo adicionado com sucesso.' });
      setIsAddingStock(false);
      setStockAmount('');
      if (onRefresh) onRefresh();
    } catch(err) {
      toast({ type: 'error', title: 'Erro', message: 'Falha ao adicionar saldo.' });
    }
    setIsUpdatingStock(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingImage(true);
    const url = await uploadImage(e.target.files[0], 'epi-images');
    if (url) setCatImageUrl(url);
    setUploadingImage(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName || !catCategory) return;
    
    const payload: Partial<EpiCatalog> = {
      name: catName,
      category: catCategory,
      model: catModel || null,
      status: catStatus,
      description: catDescription || null,
      brand: catBrand || null,
      ca_number: catCaNumber || null,
      ca_validity: catCaValidity || null,
      lifespan_days: catLifespanDays ? Number(catLifespanDays) : null,
      minimum_stock: catMinStock ? Number(catMinStock) : null,
      image_url: catImageUrl || null,
      observations: catObservations || null
    };

    await saveCatalog(payload, editingCatalog?.id, catInitialStock ? Number(catInitialStock) : undefined);
    resetForm();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between">
        <div className="flex gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input 
              type="text" 
              placeholder="Buscar EPI por nome, CA ou código..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <select 
            value={catalogCategoryFilter}
            onChange={e => setCatalogCategoryFilter(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            {catalogCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button 
          onClick={() => setIsAddingCatalog(true)}
          className="bg-primary text-primary-foreground font-medium py-2 px-4 rounded-md flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Novo Item (Catálogo)
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/50 text-[11px] uppercase tracking-wider text-muted">
                <th className="p-4 font-medium">EPI / Modelo</th>
                <th className="p-4 font-medium">Código</th>
                <th className="p-4 font-medium">Categoria</th>
                <th className="p-4 font-medium">CA / Validade</th>
                <th className="p-4 font-medium text-center">Estoque Atual</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {paginatedCatalogs.map(cat => (
                <tr key={cat.id} className="border-b border-border hover:bg-surface-hover/30">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {cat.image_url ? (
                         <img src={cat.image_url} alt={cat.name} className="w-10 h-10 rounded-md object-cover border border-border" />
                      ) : (
                         <div className="w-10 h-10 rounded-md bg-surface-hover border border-border flex items-center justify-center">
                           <Shield className="w-5 h-5 text-muted" />
                         </div>
                      )}
                      <div>
                        <div className="font-bold text-foreground">{cat.name}</div>
                        {cat.brand && <div className="text-xs text-muted">{cat.brand} {cat.model ? \`- \${cat.model}\` : ''}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono font-medium text-muted">{cat.code || '-'}</td>
                  <td className="p-4 text-foreground">{cat.category}</td>
                  <td className="p-4">
                    <div className="text-foreground">{cat.ca_number || 'S/N'}</div>
                    {cat.ca_validity && <div className="text-xs text-muted">Val: {new Date(cat.ca_validity).toLocaleDateString()}</div>}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={\`font-bold \${(cat.current_stock || 0) <= (cat.minimum_stock || 0) ? 'text-red-500' : 'text-emerald-500'}\`}>
                        {cat.current_stock || 0}
                      </span>
                      {cat.minimum_stock && <span className="text-[10px] text-muted">Min: {cat.minimum_stock}</span>}
                    </div>
                  </td>
                  <td className="p-4 flex justify-end gap-2">
                    <button 
                      onClick={() => { setStockItem(cat); setIsAddingStock(true); }} 
                      className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-md transition-colors" title="Adicionar Saldo"
                    >
                      <Box className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEdit(cat)} className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors" title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {role && ['ADMIN', 'SAFETY_ENGINEER'].includes(role) && (
                      <button onClick={() => deleteCatalog(cat.id)} className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {paginatedCatalogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted">Nenhum EPI encontrado no catálogo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddingCatalog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">{editingCatalog ? 'Editar EPI' : 'Novo EPI no Catálogo'}</h2>
              <button onClick={resetForm} className="text-muted hover:text-foreground">X</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Nome / Descrição Curta *</label>
                  <input required type="text" value={catName} onChange={e => setCatName(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Categoria (NR-6) *</label>
                  <select value={catCategory} onChange={e => setCatCategory(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground">
                    {NR6_CATEGORIES.map(nr => <option key={nr} value={nr}>{nr}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Marca / Fabricante</label>
                  <input type="text" value={catBrand} onChange={e => setCatBrand(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Modelo</label>
                  <input type="text" value={catModel} onChange={e => setCatModel(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Número do CA</label>
                  <input type="text" value={catCaNumber} onChange={e => setCatCaNumber(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Validade do CA</label>
                  <input type="date" value={catCaValidity} onChange={e => setCatCaValidity(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Vida Útil (Dias)</label>
                  <input type="number" value={catLifespanDays} onChange={e => setCatLifespanDays(e.target.value ? Number(e.target.value) : '')} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Estoque Mínimo</label>
                  <input type="number" value={catMinStock} onChange={e => setCatMinStock(e.target.value ? Number(e.target.value) : '')} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
                </div>
              </div>

              {!editingCatalog && (
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Saldo Inicial (Quantidade)</label>
                  <input type="number" value={catInitialStock} onChange={e => setCatInitialStock(e.target.value ? Number(e.target.value) : '')} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Status</label>
                <select value={catStatus} onChange={e => setCatStatus(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground">
                  <option value="ACTIVE">Ativo</option>
                  <option value="INACTIVE">Inativo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted mb-1">Imagem / Foto do EPI</label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="cursor-pointer bg-surface border border-border px-4 py-2 rounded-md hover:bg-surface-hover flex items-center gap-2 text-sm text-foreground">
                    <ImageIcon className="w-4 h-4" />
                    {uploadingImage ? 'Enviando...' : 'Fazer Upload'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                  </label>
                  {catImageUrl && <img src={catImageUrl} alt="Preview" className="h-10 w-10 object-cover rounded border border-border" />}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Descrição Detalhada</label>
                <textarea rows={3} value={catDescription} onChange={e => setCatDescription(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground"></textarea>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-surface hover:bg-surface-hover border border-border text-foreground rounded-md">Cancelar</button>
                <button type="submit" disabled={!catName || !catCategory} className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50">Salvar EPI</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {isAddingStock && stockItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-4">Adicionar Saldo: {stockItem.name}</h3>
            <p className="text-sm text-muted mb-4">Estoque Atual: <span className="font-bold text-foreground">{stockItem.current_stock || 0}</span></p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Quantidade Adquirida</label>
                <input type="number" min="1" value={stockAmount} onChange={e => setStockAmount(Number(e.target.value))} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => { setIsAddingStock(false); setStockAmount(''); }} className="px-4 py-2 text-muted hover:text-foreground">Cancelar</button>
              <button onClick={handleAddStock} disabled={!stockAmount || stockAmount <= 0 || isUpdatingStock} className="px-4 py-2 bg-emerald-600 text-white rounded-md disabled:opacity-50">
                {isUpdatingStock ? 'Adicionando...' : 'Confirmar Saldo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/components/features/assets/CatalogTab.tsx', content);
