import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { EpiCatalog } from '../../../types';

interface CatalogTabProps {
  catalogs: EpiCatalog[];
  loading: boolean;
  saveCatalog: (payload: Partial<EpiCatalog>, id?: string) => Promise<void>;
  deleteCatalog: (id: string) => Promise<void>;
}

export function CatalogTab({
  catalogs,
  loading,
  saveCatalog,
  deleteCatalog
}: CatalogTabProps) {
  const [search, setSearch] = useState('');
  const [isAddingCatalog, setIsAddingCatalog] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<EpiCatalog | null>(null);
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('Todas as categorias');
  const [catalogCurrentPage, setCatalogCurrentPage] = useState(1);
  const catalogItemsPerPage = 10;

  // Form State
  const [catName, setCatName] = useState('');
  const [catCategory, setCatCategory] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catBrand, setCatBrand] = useState('');
  const [catCaNumber, setCatCaNumber] = useState('');
  const [catCaValidity, setCatCaValidity] = useState('');
  const [catLifespanDays, setCatLifespanDays] = useState<number | ''>('');
  const [catMinStock, setCatMinStock] = useState<number | ''>('');
  const [catImageUrl, setCatImageUrl] = useState('');
  const [catObservations, setCatObservations] = useState('');

  const catalogCategories = useMemo(() => {
    return ['Todas as categorias', ...Array.from(new Set(catalogs.map(c => c.category)))];
  }, [catalogs]);

  const filteredCatalogs = useMemo(() => {
    return catalogs.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = catalogCategoryFilter === 'Todas as categorias' || c.category === catalogCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [catalogs, search, catalogCategoryFilter]);

  const catalogTotalItems = filteredCatalogs.length;
  const catalogTotalPages = Math.ceil(catalogTotalItems / catalogItemsPerPage);
  const catalogStartIndex = (catalogCurrentPage - 1) * catalogItemsPerPage;
  const paginatedCatalogs = useMemo(() => {
    return filteredCatalogs.slice(catalogStartIndex, catalogStartIndex + catalogItemsPerPage);
  }, [filteredCatalogs, catalogStartIndex, catalogItemsPerPage]);

  const resetCatalogForm = () => {
    setCatName('');
    setCatCategory('');
    setCatDescription('');
    setCatBrand('');
    setCatCaNumber('');
    setCatCaValidity('');
    setCatLifespanDays('');
    setCatMinStock('');
    setCatImageUrl('');
    setCatObservations('');
    setEditingCatalog(null);
    setIsAddingCatalog(false);
  };

  const openEditCatalog = (catalog: EpiCatalog) => {
    setEditingCatalog(catalog);
    setCatName(catalog.name);
    setCatCategory(catalog.category);
    setCatDescription(catalog.description || '');
    setCatBrand(catalog.brand || '');
    setCatCaNumber(catalog.ca_number || '');
    setCatCaValidity(catalog.ca_validity || '');
    setCatLifespanDays(catalog.lifespan_days || '');
    setCatMinStock(catalog.minimum_stock || '');
    setCatImageUrl(catalog.image_url || '');
    setCatObservations(catalog.observations || '');
    setIsAddingCatalog(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: catName,
      category: catCategory,
      description: catDescription || null,
      brand: catBrand || null,
      ca_number: catCaNumber || null,
      ca_validity: catCaValidity || null,
      lifespan_days: catLifespanDays ? Number(catLifespanDays) : null,
      minimum_stock: catMinStock ? Number(catMinStock) : null,
      image_url: catImageUrl || null,
      observations: catObservations || null,
    };

    await saveCatalog(payload, editingCatalog?.id);
    resetCatalogForm();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este modelo do catálogo?')) return;
    await deleteCatalog(id);
  };

  return (
    <>
      <div className="flex justify-end gap-2">
        <button 
          onClick={() => {
            if (isAddingCatalog) {
              resetCatalogForm();
            } else {
              setIsAddingCatalog(true);
            }
          }}
          className="flex items-center gap-2 py-2 px-4 text-sm font-medium bg-primary text-background rounded-md hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        >
          {isAddingCatalog ? 'Cancelar' : <><Plus className="w-4 h-4" /> Novo Modelo</>}
        </button>
      </div>

      {isAddingCatalog && (
        <div className="p-6 bg-surface border border-border rounded-xl">
          <h3 className="mb-4 text-lg font-medium">{editingCatalog ? 'Editar Modelo de EPI' : 'Adicionar Modelo de EPI'}</h3>
          <form onSubmit={handleSaveCatalog} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">Nome do Modelo *</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={e => setCatName(e.target.value)}
                  className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Capacete de Segurança Classe B"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">Categoria *</label>
                <input
                  type="text"
                  required
                  value={catCategory}
                  onChange={e => setCatCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Capacete"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">Marca</label>
                <input
                  type="text"
                  value={catBrand}
                  onChange={e => setCatBrand(e.target.value)}
                  className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="MSA"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">Número CA</label>
                <input
                  type="text"
                  value={catCaNumber}
                  onChange={e => setCatCaNumber(e.target.value)}
                  className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="318"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">Validade CA (Data)</label>
                <input
                  type="date"
                  value={catCaValidity}
                  onChange={e => setCatCaValidity(e.target.value)}
                  className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary [color-scheme:dark]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">Vida Útil (dias)</label>
                <input
                  type="number"
                  value={catLifespanDays}
                  onChange={e => setCatLifespanDays(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="180"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">Estoque Mínimo</label>
                <input
                  type="number"
                  value={catMinStock}
                  onChange={e => setCatMinStock(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">URL da Imagem</label>
                <input
                  type="url"
                  value={catImageUrl}
                  onChange={e => setCatImageUrl(e.target.value)}
                  className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="https://..."
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted">Descrição</label>
              <textarea
                value={catDescription}
                onChange={e => setCatDescription(e.target.value)}
                className="w-full px-4 py-2 min-h-[80px] bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Detalhes do equipamento..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted">Observações</label>
              <textarea
                value={catObservations}
                onChange={e => setCatObservations(e.target.value)}
                className="w-full px-4 py-2 min-h-[80px] bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Notas internas..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetCatalogForm}
                className="py-2 px-6 font-medium bg-surface-hover text-foreground rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="py-2 px-6 font-medium bg-primary text-background rounded-md hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              >
                {editingCatalog ? 'Atualizar Modelo' : 'Salvar Modelo'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex-1 bg-surface border border-border rounded flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border flex flex-col sm:flex-row gap-4 items-center bg-surface-hover/30">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar no catálogo..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCatalogCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-1.5 text-[11px] font-mono bg-background text-foreground border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="w-full sm:w-auto">
            <select
              value={catalogCategoryFilter}
              onChange={e => { setCatalogCategoryFilter(e.target.value); setCatalogCurrentPage(1); }}
              className="w-full sm:w-auto px-3 py-1.5 text-sm bg-background text-foreground border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {catalogCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-muted flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              <span>Carregando catálogo...</span>
            </div>
          ) : filteredCatalogs.length === 0 ? (
            <div className="p-8 text-center text-muted">Nenhum modelo no catálogo.</div>
          ) : (
            <div className="min-w-[800px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface/50 text-xs uppercase tracking-wider text-muted font-semibold">
                    <th className="p-3">CÓDIGO</th>
                    <th className="p-3">TIPO/DESCRIÇÃO</th>
                    <th className="p-3">MARCA/MODELO</th>
                    <th className="p-3">CA</th>
                    <th className="p-3">VALIDADE CA</th>
                    <th className="p-3">ESTOQUE</th>
                    <th className="p-3">STATUS</th>
                    <th className="p-3 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {paginatedCatalogs.map(catalog => (
                    <tr key={catalog.id} className="border-b border-border hover:bg-surface-hover/30 transition-colors">
                      <td className="p-3 font-mono text-primary">{catalog.id.substring(0, 8).toUpperCase()}</td>
                      <td className="p-3">
                        <div className="font-medium text-foreground">{catalog.category}</div>
                        <div className="text-muted text-xs truncate max-w-[200px]" title={catalog.name}>{catalog.name}</div>
                      </td>
                      <td className="p-3 text-muted">{catalog.brand || '-'}</td>
                      <td className="p-3 font-mono">{catalog.ca_number || '-'}</td>
                      <td className="p-3">{catalog.ca_validity ? catalog.ca_validity.split('-').reverse().join('/') : '-'}</td>
                      <td className="p-3">
                        <span className="font-mono">{catalog.current_stock ?? 0}</span>
                        <span className="ml-1 text-xs text-muted">/ {catalog.minimum_stock ?? 0} mín</span>
                      </td>
                      <td className="p-3">
                        {catalog.current_stock !== null && catalog.minimum_stock !== null && catalog.current_stock <= catalog.minimum_stock ? (
                          <span className="px-2 py-1 text-xs font-bold text-red-400 bg-red-900/30 rounded border border-red-800/50">BAIXO</span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-bold text-emerald-400 bg-emerald-900/30 rounded border border-emerald-800/50">OK</span>
                        )}
                      </td>
                      <td className="flex justify-end gap-2 p-3">
                        <button 
                          onClick={() => openEditCatalog(catalog)}
                          className="p-1.5 text-muted rounded hover:bg-surface-hover hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                          title="Editar"
                          aria-label="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(catalog.id)}
                          className="p-1.5 text-muted rounded hover:bg-surface-hover hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                          title="Excluir"
                          aria-label="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {!loading && filteredCatalogs.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 text-sm text-muted bg-surface/30 border-t border-border">
            <div>
              Mostrando {catalogTotalItems === 0 ? 0 : catalogStartIndex + 1} a {Math.min(catalogStartIndex + catalogItemsPerPage, catalogTotalItems)} de {catalogTotalItems} registros
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCatalogCurrentPage(p => Math.max(1, p - 1))}
                disabled={catalogCurrentPage === 1}
                className="px-3 py-1 text-foreground bg-surface rounded border border-border disabled:opacity-50 hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Anterior
              </button>
              <button
                onClick={() => setCatalogCurrentPage(p => Math.min(catalogTotalPages, p + 1))}
                disabled={catalogCurrentPage === catalogTotalPages || catalogTotalPages === 0}
                className="px-3 py-1 text-foreground bg-surface rounded border border-border disabled:opacity-50 hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
