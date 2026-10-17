import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Shield, Upload, Image as ImageIcon, Box, AlertTriangle, FileSpreadsheet, Download, History, ArrowDownCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { EpiCatalog, EpiPurchase } from '../../../types';
import { useAuth } from '../../../components/AuthProvider';
import { uploadImage } from '../../../lib/storage';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../components/ui/Toast';
import { ValidityBadge } from '../../../components/ui/ValidityBadge';
import { inventoryService } from '../../../services/inventoryService';

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
  
  // Stock adding state
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [stockItem, setStockItem] = useState<EpiCatalog | null>(null);
  const [stockAmount, setStockAmount] = useState<number | ''>('');
  const [stockUnitPrice, setStockUnitPrice] = useState<number | ''>('');
  const [stockSupplier, setStockSupplier] = useState('');
  const [stockInvoice, setStockInvoice] = useState('');
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  
  // Discard state
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [discardItem, setDiscardItem] = useState<EpiCatalog | null>(null);
  const [discardQty, setDiscardQty] = useState<number | ''>(1);
  const [discardReason, setDiscardReason] = useState<'PAGO' | 'NAO_DEVOLVIDO' | 'PAGO_E_NAO_DEVOLVIDO' | 'DESGASTE_NATURAL' | 'DANIFICADO'>('DESGASTE_NATURAL');
  const [discardNotes, setDiscardNotes] = useState('');
  const [isSubmittingDiscard, setIsSubmittingDiscard] = useState(false);

  // Purchases History Drawer state
  const [isPurchasesDrawerOpen, setIsPurchasesDrawerOpen] = useState(false);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  
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
  const [catUnitPrice, setCatUnitPrice] = useState<number | ''>('');
  const [catImageUrl, setCatImageUrl] = useState('');
  const [catObservations, setCatObservations] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const catalogCategories = useMemo(() => {
    return ['Todas as categorias', ...Array.from(new Set(catalogs.map(c => c.category)))];
  }, [catalogs]);

  const loadPurchases = async () => {
    setLoadingPurchases(true);
    try {
      const data = await inventoryService.fetchPurchases();
      setPurchases(data);
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: 'Falha ao carregar histórico de compras.' });
    } finally {
      setLoadingPurchases(false);
    }
  };

  const handleOpenPurchases = () => {
    setIsPurchasesDrawerOpen(true);
    loadPurchases();
  };

  const handleDownloadTemplateXlsx = () => {
    const headers = [
      ['Nome', 'Categoria', 'Modelo', 'Marca', 'CA', 'Validade_CA', 'Vida_Util_Dias', 'Estoque_Inicial', 'Estoque_Minimo', 'Valor_Unitario'],
      ['Capacete com Carneira', 'Proteção da Cabeça', 'Classe B', 'Delta Plus', '8304', '2027-12-31', 180, 50, 10, 28.50],
      ['Óculos de Proteção Incolor', 'Proteção dos Olhos e Face', 'Spectra', '3M', '15640', '2028-05-15', 90, 100, 20, 12.00],
      ['Luva de Vaqueta Mista', 'Proteção dos Membros Superiores', 'Cano Curto', 'Volk', '32456', '2026-11-20', 60, 80, 15, 18.90]
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(headers);
    XLSX.utils.book_append_sheet(wb, ws, 'Modelos_EPI');
    XLSX.writeFile(wb, 'modelo_importacao_epis.xlsx');
    toast({ type: 'success', title: 'Sucesso', message: 'Planilha modelo gerada e baixada!' });
  };

  const filteredCatalogs = useMemo(() => {
    return catalogs.filter(c => {
      const searchL = search.toLowerCase();
      const matchesSearch = c.name.toLowerCase().includes(searchL) || 
                            c.category.toLowerCase().includes(searchL) ||
                            (c.code && c.code.toLowerCase().includes(searchL)) ||
                            (c.ca_number && c.ca_number.toLowerCase().includes(searchL));
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
    setCatUnitPrice('');
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
    setCatUnitPrice(cat.unit_price || '');
    setCatImageUrl(cat.image_url || '');
    setCatObservations(cat.observations || '');
    setIsAddingCatalog(true);
  };
  
  const handleAddStock = async () => {
    if (!stockItem || !stockAmount || stockAmount <= 0) return;
    setIsUpdatingStock(true);
    try {
      await inventoryService.registerPurchase({
        catalog_id: stockItem.id,
        quantity: Number(stockAmount),
        unit_price: stockUnitPrice ? Number(stockUnitPrice) : (stockItem.unit_price || 0),
        supplier: stockSupplier || 'Compra Avulsa',
        invoice_number: stockInvoice || 'S/N'
      });

      toast({ type: 'success', title: 'Sucesso', message: 'Entrada registrada com sucesso no estoque e compras.' });
      setIsAddingStock(false);
      setStockAmount('');
      setStockUnitPrice('');
      setStockSupplier('');
      setStockInvoice('');
      if (onRefresh) onRefresh();
    } catch(err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message || 'Falha ao registrar entrada.' });
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const handleConfirmDiscard = async () => {
    if (!discardItem || !discardQty || discardQty <= 0) return;
    setIsSubmittingDiscard(true);
    try {
      await inventoryService.discardStock({
        catalogId: discardItem.id,
        quantity: Number(discardQty),
        reason: discardReason,
        notes: discardNotes
      });
      toast({ type: 'success', title: 'Sucesso', message: `${discardQty} unidade(s) descartadas e baixadas do estoque.` });
      setIsDiscardModalOpen(false);
      setDiscardItem(null);
      setDiscardQty(1);
      setDiscardNotes('');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro no Descarte', message: err.message || 'Falha ao processar descarte.' });
    } finally {
      setIsSubmittingDiscard(false);
    }
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
      unit_price: catUnitPrice ? Number(catUnitPrice) : 0,
      image_url: catImageUrl || null,
      observations: catObservations || null
    };

    try {
      await saveCatalog(payload, editingCatalog?.id, catInitialStock ? Number(catInitialStock) : undefined);
      toast({ type: 'success', title: 'Sucesso', message: 'EPI registrado com sucesso!' });
      resetForm();
    } catch(err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message || 'Falha ao salvar catálogo.' });
    }
  };

  // Cálculo reativo do valor total do lote no modal
  const reactiveBatchTotal = useMemo(() => {
    const qty = Number(catInitialStock) || 0;
    const price = Number(catUnitPrice) || 0;
    return qty * price;
  }, [catInitialStock, catUnitPrice]);

  return (
    <div>
      {/* Barra de Ações Superior */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-stretch sm:items-center">
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input 
              type="text" 
              placeholder="Buscar por nome, CA ou código..." 
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

        <div className="flex flex-wrap gap-2 justify-end">
          <button
            onClick={handleDownloadTemplateXlsx}
            className="bg-surface border border-border hover:bg-surface-hover text-foreground font-medium py-2 px-3 rounded-md flex items-center gap-2 text-sm transition-colors"
            title="Baixar planilha padrão (.xlsx) para importação em lote"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Baixar Modelo (.xlsx)</span>
          </button>

          <button
            onClick={handleOpenPurchases}
            className="bg-surface border border-border hover:bg-surface-hover text-foreground font-medium py-2 px-3 rounded-md flex items-center gap-2 text-sm transition-colors"
          >
            <History className="w-4 h-4 text-primary" />
            <span>Histórico de Compras</span>
          </button>

          <button 
            onClick={() => setIsAddingCatalog(true)}
            className="bg-primary text-primary-foreground font-semibold py-2 px-4 rounded-md flex items-center gap-2 text-sm shadow-md hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> + Novo EPI
          </button>
        </div>
      </div>

      {/* Tabela de Estoque e Catálogo */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/50 text-[11px] uppercase tracking-wider text-muted">
                <th className="p-4 font-semibold">EPI / Modelo</th>
                <th className="p-4 font-semibold">Categoria</th>
                <th className="p-4 font-semibold">CA / Semáforo</th>
                <th className="p-4 font-semibold text-right">Valor Unitário</th>
                <th className="p-4 font-semibold text-center">Estoque Atual</th>
                <th className="p-4 font-semibold text-right">Valor em Estoque</th>
                <th className="p-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {paginatedCatalogs.map(cat => {
                const unitPrice = cat.unit_price || 0;
                const currentStock = cat.current_stock || 0;
                const totalStockValue = unitPrice * currentStock;

                return (
                  <tr key={cat.id} className="border-b border-border hover:bg-surface-hover/30 transition-colors">
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
                          <div className="text-xs text-muted">
                            {cat.brand || 'Sem marca'} {cat.model ? `• ${cat.model}` : ''}
                            {cat.code && <span className="ml-2 font-mono text-[10px] bg-surface px-1 py-0.5 rounded border border-border">{cat.code}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-foreground text-xs">{cat.category}</td>
                    <td className="p-4">
                      <div className="font-medium text-foreground">CA: {cat.ca_number || 'S/N'}</div>
                      <div className="mt-1">
                        <ValidityBadge date={cat.ca_validity} />
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono font-medium text-foreground">
                      R$ {unitPrice.toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`font-bold text-base ${currentStock <= (cat.minimum_stock || 0) ? 'text-red-500' : 'text-emerald-500'}`}>
                          {currentStock}
                        </span>
                        {cat.minimum_stock !== null && cat.minimum_stock !== undefined && (
                          <span className="text-[10px] text-muted font-mono">Mín: {cat.minimum_stock}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-primary">
                      R$ {totalStockValue.toFixed(2)}
                    </td>
                    <td className="p-4 flex justify-end gap-1.5">
                      <button 
                        onClick={() => { setStockItem(cat); setStockUnitPrice(cat.unit_price || ''); setIsAddingStock(true); }} 
                        className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-md transition-colors" 
                        title="Adicionar Entrada / Compra"
                      >
                        <ArrowDownCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => { setDiscardItem(cat); setDiscardQty(1); setIsDiscardModalOpen(true); }}
                        className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-md transition-colors"
                        title="Registrar Descarte"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEdit(cat)} 
                        className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors" 
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {role && ['ADMIN', 'SAFETY_ENGINEER'].includes(role) && (
                        <button 
                          onClick={async () => {
                            if (!window.confirm(`Deseja excluir o EPI "${cat.name}" do catálogo?`)) return;
                            try {
                              await deleteCatalog(cat.id);
                              toast({ type: 'success', title: 'Sucesso', message: 'EPI excluído do catálogo.' });
                            } catch (e: any) {
                              toast({ type: 'error', title: 'Erro', message: e.message || 'Falha ao excluir.' });
                            }
                          }} 
                          className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors" 
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {paginatedCatalogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">Nenhum EPI encontrado no catálogo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {catalogTotalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border p-4">
            <span className="text-xs text-muted">
              Página {catalogCurrentPage} de {catalogTotalPages} ({filteredCatalogs.length} itens)
            </span>
            <div className="flex gap-2">
              <button
                disabled={catalogCurrentPage === 1}
                onClick={() => setCatalogCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 bg-surface border border-border text-xs rounded-md disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                disabled={catalogCurrentPage === catalogTotalPages}
                onClick={() => setCatalogCurrentPage(p => Math.min(catalogTotalPages, p + 1))}
                className="px-3 py-1 bg-surface border border-border text-xs rounded-md disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: + Novo EPI / Editar EPI com Cálculo Reativo de Lote */}
      {isAddingCatalog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-foreground">{editingCatalog ? 'Editar EPI' : 'Cadastrar Novo EPI'}</h2>
                <p className="text-xs text-muted mt-0.5">Preencha os dados técnicos, CA e valores de inventário.</p>
              </div>
              <button onClick={resetForm} className="text-muted hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Nome / Descrição Curta *</label>
                  <input required type="text" placeholder="Ex: Capacete de Segurança" value={catName} onChange={e => setCatName(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Categoria (NR-6) *</label>
                  <select value={catCategory} onChange={e => setCatCategory(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary">
                    {NR6_CATEGORIES.map(nr => <option key={nr} value={nr}>{nr}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Marca / Fabricante</label>
                  <input type="text" placeholder="Ex: 3M, Volk, Delta Plus" value={catBrand} onChange={e => setCatBrand(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Modelo</label>
                  <input type="text" placeholder="Ex: H-700, Cano Longo" value={catModel} onChange={e => setCatModel(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Número do CA</label>
                  <input type="text" placeholder="Ex: 12345" value={catCaNumber} onChange={e => setCatCaNumber(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Validade do CA</label>
                  <input type="date" value={catCaValidity} onChange={e => setCatCaValidity(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary" />
                </div>
              </div>

              {/* Seção Financeira e Quantidades com Cálculo Reativo */}
              <div className="p-4 bg-surface-hover/40 border border-border rounded-lg space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Controle Financeiro e Estoque</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">Valor Unitário (R$)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      placeholder="0.00" 
                      value={catUnitPrice} 
                      onChange={e => setCatUnitPrice(e.target.value ? Number(e.target.value) : '')} 
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary font-mono" 
                    />
                  </div>
                  {!editingCatalog && (
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1">Estoque Inicial (Qtd)</label>
                      <input 
                        type="number" 
                        min="0"
                        placeholder="0" 
                        value={catInitialStock} 
                        onChange={e => setCatInitialStock(e.target.value ? Number(e.target.value) : '')} 
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary font-mono" 
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">Estoque Mínimo (Alerta)</label>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="0" 
                      value={catMinStock} 
                      onChange={e => setCatMinStock(e.target.value ? Number(e.target.value) : '')} 
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary font-mono" 
                    />
                  </div>
                </div>

                {!editingCatalog && (
                  <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-md">
                    <span className="text-xs font-semibold text-foreground">Valor Total do Lote Inicial:</span>
                    <span className="font-mono font-bold text-primary text-base">
                      R$ {reactiveBatchTotal.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Vida Útil Estimada (Dias)</label>
                  <input type="number" placeholder="180" value={catLifespanDays} onChange={e => setCatLifespanDays(e.target.value ? Number(e.target.value) : '')} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Status</label>
                  <select value={catStatus} onChange={e => setCatStatus(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary">
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted mb-1">Imagem / Foto do EPI</label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="cursor-pointer bg-surface border border-border px-4 py-2 rounded-md hover:bg-surface-hover flex items-center gap-2 text-sm text-foreground transition-colors">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    {uploadingImage ? 'Enviando...' : 'Fazer Upload'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                  </label>
                  {catImageUrl && <img src={catImageUrl} alt="Preview" className="h-10 w-10 object-cover rounded border border-border" />}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Descrição / Instruções de Uso</label>
                <textarea rows={2} value={catDescription} onChange={e => setCatDescription(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary text-sm"></textarea>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-surface hover:bg-surface-hover border border-border text-foreground rounded-md text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={!catName || !catCategory} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold disabled:opacity-50">Salvar EPI</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal: Adicionar Entrada / Compra Avulsa */}
      {isAddingStock && stockItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-1">Registrar Chegada / Compra</h3>
            <p className="text-xs text-muted mb-4">{stockItem.name} • Estoque Atual: <strong className="text-foreground">{stockItem.current_stock || 0}</strong></p>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Quantidade *</label>
                  <input type="number" min="1" required value={stockAmount} onChange={e => setStockAmount(Number(e.target.value))} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground font-mono text-sm" placeholder="Ex: 50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Valor Unitário (R$)</label>
                  <input type="number" step="0.01" min="0" value={stockUnitPrice} onChange={e => setStockUnitPrice(e.target.value ? Number(e.target.value) : '')} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground font-mono text-sm" placeholder="R$ 0.00" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Fornecedor</label>
                <input type="text" value={stockSupplier} onChange={e => setStockSupplier(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground text-sm" placeholder="Nome da empresa fornecedora" />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Número da Nota Fiscal (NF)</label>
                <input type="text" value={stockInvoice} onChange={e => setStockInvoice(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground text-sm font-mono" placeholder="Ex: NF-e 12345" />
              </div>

              {stockAmount && stockUnitPrice ? (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs text-emerald-400 flex justify-between font-medium">
                  <span>Total desta Entrada:</span>
                  <span className="font-mono font-bold">R$ {(Number(stockAmount) * Number(stockUnitPrice)).toFixed(2)}</span>
                </div>
              ) : null}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => { setIsAddingStock(false); setStockAmount(''); }} className="px-4 py-2 text-sm text-muted hover:text-foreground">Cancelar</button>
              <button onClick={handleAddStock} disabled={!stockAmount || stockAmount <= 0 || isUpdatingStock} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-md text-sm disabled:opacity-50 transition-colors">
                {isUpdatingStock ? 'Salvando...' : 'Confirmar Entrada'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Descarte de EPI */}
      {isDiscardModalOpen && discardItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-lg font-bold text-foreground">Registrar Descarte de EPI</h3>
            </div>
            <p className="text-xs text-muted mb-4">{discardItem.name} • Saldo em Estoque: <strong className="text-foreground">{discardItem.current_stock || 0}</strong></p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Quantidade a Descartar *</label>
                <input 
                  type="number" 
                  min="1" 
                  max={discardItem.current_stock || 1}
                  required 
                  value={discardQty} 
                  onChange={e => setDiscardQty(Number(e.target.value))} 
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground font-mono text-sm" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Motivo do Descarte *</label>
                <select 
                  value={discardReason} 
                  onChange={e => setDiscardReason(e.target.value as any)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground text-sm"
                >
                  <option value="DESGASTE_NATURAL">Desgaste Natural por Uso</option>
                  <option value="DANIFICADO">Danificado / Avariado</option>
                  <option value="PAGO">Pago pelo Colaborador</option>
                  <option value="NAO_DEVOLVIDO">Não Devolvido (Extravio)</option>
                  <option value="PAGO_E_NAO_DEVOLVIDO">Pago e Não Devolvido</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Observações do Descarte</label>
                <textarea 
                  rows={2} 
                  value={discardNotes} 
                  onChange={e => setDiscardNotes(e.target.value)} 
                  placeholder="Justificativa ou detalhes do descarte..."
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => { setIsDiscardModalOpen(false); setDiscardItem(null); }} className="px-4 py-2 text-sm text-muted hover:text-foreground">Cancelar</button>
              <button 
                onClick={handleConfirmDiscard} 
                disabled={!discardQty || discardQty <= 0 || isSubmittingDiscard} 
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-md text-sm disabled:opacity-50 transition-colors"
              >
                {isSubmittingDiscard ? 'Processando...' : 'Confirmar Descarte'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Histórico de Compras e Entradas */}
      {isPurchasesDrawerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-surface border-l border-border w-full max-w-xl h-full flex flex-col shadow-2xl p-6">
            <div className="flex justify-between items-center pb-4 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" /> Histórico de Compras e Chegadas
                </h3>
                <p className="text-xs text-muted">Registro auditável de lotes e notas fiscais adquiridas.</p>
              </div>
              <button onClick={() => setIsPurchasesDrawerOpen(false)} className="text-muted hover:text-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {loadingPurchases ? (
                <div className="p-8 text-center text-sm text-muted">Carregando histórico...</div>
              ) : purchases.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted">Nenhum registro de compra encontrado.</div>
              ) : (
                purchases.map(p => (
                  <div key={p.id} className="p-4 bg-background border border-border rounded-lg space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-foreground text-sm">{p.catalog?.name || 'EPI'}</div>
                        <div className="text-xs text-muted font-mono">{p.supplier || 'Fornecedor não informado'} • NF: {p.invoice_number || 'S/N'}</div>
                      </div>
                      <span className="font-mono text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                        +{p.quantity} un
                      </span>
                    </div>

                    <div className="flex justify-between text-xs text-muted pt-1 border-t border-border/50">
                      <span>Unit: <strong className="text-foreground">R$ {(p.unit_price || 0).toFixed(2)}</strong></span>
                      <span>Total: <strong className="text-foreground">R$ {(p.total_price || (p.quantity * p.unit_price) || 0).toFixed(2)}</strong></span>
                      <span>{new Date(p.arrival_date || p.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button onClick={() => setIsPurchasesDrawerOpen(false)} className="px-4 py-2 bg-surface hover:bg-surface-hover border border-border text-foreground rounded-md text-sm font-medium">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
