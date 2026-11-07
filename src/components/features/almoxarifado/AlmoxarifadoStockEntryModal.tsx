import React, { useState } from 'react';
import { Modal } from '../../ui/Modal';
import { ConstructionSite, EpiCatalog } from '../../../types';
import { X, PackagePlus, Search, Building2, FileText, Check, RefreshCw } from 'lucide-react';
import { inventoryService } from '../../../services/inventoryService';
import { useToast } from '../../../components/ui/Toast';

interface AlmoxarifadoStockEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sites: ConstructionSite[];
  catalogs: EpiCatalog[];
  defaultSiteId?: string;
  onSuccess: () => void;
}

export function AlmoxarifadoStockEntryModal({
  isOpen,
  onClose,
  sites,
  catalogs,
  defaultSiteId,
  onSuccess
}: AlmoxarifadoStockEntryModalProps) {
  const { toast } = useToast();

  const [selectedSiteId, setSelectedSiteId] = useState<string>(
    defaultSiteId && defaultSiteId !== 'ALL' ? defaultSiteId : (sites[0]?.id || '')
  );
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  if (!isOpen) return null;

  const filteredCatalogs = catalogs.filter(c => {
    if (!catalogSearch.trim()) return true;
    const q = catalogSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.ca_number && c.ca_number.includes(q)) || c.category.toLowerCase().includes(q);
  });

  const selectedCatalog = catalogs.find(c => c.id === selectedCatalogId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatalogId) {
      toast({ type: 'warning', title: 'Atenção', message: 'Selecione o EPI para dar entrada.' });
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      toast({ type: 'warning', title: 'Atenção', message: 'Informe uma quantidade válida.' });
      return;
    }

    setSubmitting(true);
    try {
      const price = unitPrice !== '' ? Number(unitPrice) : (selectedCatalog?.unit_price || 0);
      await inventoryService.registerPurchase({
        catalog_id: selectedCatalogId,
        site_id: selectedSiteId || undefined,
        quantity: Number(quantity),
        unit_price: price,
        invoice_number: invoiceNumber.trim() || undefined,
        supplier: supplier.trim() || undefined,
        notes: notes.trim() || 'Entrada manual registrada no balcão do Almoxarifado'
      });

      toast({
        type: 'success',
        title: 'Estoque Atualizado!',
        message: `${quantity}x ${selectedCatalog?.name} adicionado(s) com sucesso ao estoque.`
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao dar entrada no estoque:', err);
      toast({
        type: 'error',
        title: 'Erro na Entrada',
        message: err.message || 'Falha ao salvar no banco de dados.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const calculatedTotal = (Number(quantity) || 0) * (Number(unitPrice) || Number(selectedCatalog?.unit_price) || 0);

  return (
    <Modal onClose={onClose} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-foreground flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Subir Estoque • Entrada de Materiais</h3>
              <p className="text-xs text-muted">Recebimento de carga, compra ou NF na obra</p>
            </div>
          </div>
          <button aria-label="Fechar"
            onClick={onClose}
            className="text-muted hover:text-foreground p-1 rounded-lg bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
          {/* Obra de Destino */}
          <div className="space-y-1">
            <label className="font-semibold text-muted uppercase tracking-wider block">1. Canteiro de Obra / Destino *</label>
            <select aria-label="Canteiro de Obra / Destino"
              required
              value={selectedSiteId}
              onChange={e => setSelectedSiteId(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground text-xs focus:outline-none focus:border-primary"
            >
              <option value="">🏢 Almoxarifado Central (Sem obra específica)</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>🏗️ {s.name} {s.city ? `(${s.city})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Seleção de EPI */}
          <div className="space-y-1">
            <label className="font-semibold text-muted uppercase tracking-wider block">2. Selecione o Equipamento (EPI) *</label>
            {selectedCatalog ? (
              <div className="p-3 bg-primary/5 rounded-xl border border-primary/30 flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground text-sm">{selectedCatalog.name}</p>
                  <p className="text-[11px] text-muted">
                    CA: {selectedCatalog.ca_number || 'S/N'} • Categoria: {selectedCatalog.category}
                  </p>
                  <p className="text-[11px] text-muted font-mono mt-0.5">
                    Estoque Geral Atual: <strong className="text-foreground">{selectedCatalog.current_stock || 0} un</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCatalogId('')}
                  className="text-xs text-primary hover:underline font-medium cursor-pointer"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <div>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
                  <input aria-label="Filtrar EPI por nome, CA ou categoria"
                    type="text"
                    placeholder="Filtrar EPI por nome, CA ou categoria..."
                    value={catalogSearch}
                    onChange={e => setCatalogSearch(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto border border-border rounded-xl divide-y divide-border bg-background">
                  {filteredCatalogs.slice(0, 15).map(epi => (
                    <div
                      key={epi.id}
                      onClick={() => {
                        setSelectedCatalogId(epi.id);
                        if (!unitPrice && epi.unit_price) {
                          setUnitPrice(epi.unit_price);
                        }
                      }}
                      className="p-2.5 hover:bg-surface-hover cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-semibold text-foreground block truncate">{epi.name}</span>
                        <span className="text-muted text-[11px]">CA: {epi.ca_number || 'S/N'} • {epi.category}</span>
                      </div>
                      <span className="text-primary font-bold text-xs shrink-0">Selecionar →</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quantidade e Valor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-muted uppercase tracking-wider block">Quantidade Recebida *</label>
              <input aria-label="Quantidade Recebida"
                type="number"
                min="1"
                required
                value={quantity}
                onChange={e => setQuantity(e.target.value !== '' ? Number(e.target.value) : '')}
                placeholder="Ex: 50"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 font-mono text-sm font-bold text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted uppercase tracking-wider block">Valor Unitário (R$)</label>
              <input aria-label="Valor Unitário (R$)"
                type="number"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={e => setUnitPrice(e.target.value !== '' ? Number(e.target.value) : '')}
                placeholder={selectedCatalog?.unit_price ? `R$ ${selectedCatalog.unit_price.toFixed(2)}` : 'R$ 0.00'}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Dados Fiscais e Fornecedor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-muted uppercase tracking-wider block">Nº da Nota Fiscal (NF-e)</label>
              <input aria-label="Nº da Nota Fiscal (NF-e)"
                type="text"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                placeholder="Ex: NF 10423"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted uppercase tracking-wider block">Fornecedor / Distribuidor</label>
              <input aria-label="Fornecedor / Distribuidor"
                type="text"
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                placeholder="Ex: Distribuidora Silva"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <label className="font-semibold text-muted uppercase tracking-wider block">Observações do Recebimento</label>
            <textarea aria-label="Observações do Recebimento"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Carga descarregada no canteiro 02, conferida sem avarias..."
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Totalizador */}
          {calculatedTotal > 0 && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs font-medium text-emerald-400">
              <span>Valor Total da Entrada:</span>
              <span className="font-mono font-bold text-sm">R$ {calculatedTotal.toFixed(2)}</span>
            </div>
          )}

          {/* Botões */}
          <div className="flex items-center gap-3 pt-3 border-t border-border shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-surface-hover hover:bg-border text-foreground font-semibold text-xs transition-colors border border-border cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedCatalogId || !quantity}
              className="flex-2 py-2.5 rounded-xl bg-primary-dark hover:bg-primary-darker text-white font-bold text-xs shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Registrando Entrada...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Confirmar & Abastecer Estoque</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </Modal>
  );
}
