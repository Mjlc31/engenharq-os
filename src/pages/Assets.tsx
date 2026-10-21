import React, { useState } from 'react';
import { AlertCircle, Layers, Boxes } from 'lucide-react';
import { useEpiAssets } from '../hooks/useEpiAssets';
import { CatalogTab } from '../components/features/assets/CatalogTab';
import { InventoryTab } from '../components/features/assets/InventoryTab';

export function Assets() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'inventory'>('catalog');
  
  const {
    epis,
    workers,
    catalogs,
    sites,
    siteInventories,
    loading,
    error,
    addEpi,
    assignEpi,
    returnEpi,
    saveCatalog,
    deleteCatalog,
    updateSiteStock,
    importInventoryCSV,
    exportInventoryCSV
  } = useEpiAssets();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestão de EPIs</h1>
          <p className="text-muted mt-1">Gerencie os modelos do catálogo NR-6 e o inventário de segurança por obra.</p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center p-1 bg-surface border border-border rounded-lg shadow-sm">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
              activeTab === 'catalog'
                ? 'bg-primary text-white shadow-sm font-semibold'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <Layers className="w-4 h-4" />
            Catálogo & Estoque por Obra
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
              activeTab === 'inventory'
                ? 'bg-primary text-white shadow-sm font-semibold'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <Boxes className="w-4 h-4" />
            Inventário Individual & Rastreamento
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg">
          <AlertCircle className="shrink-0 w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {activeTab === 'catalog' ? (
        <CatalogTab 
          catalogs={catalogs}
          loading={loading}
          saveCatalog={saveCatalog}
          deleteCatalog={deleteCatalog}
          sites={sites}
          siteInventories={siteInventories}
          updateSiteStock={updateSiteStock}
        />
      ) : (
        <InventoryTab
          epis={epis}
          workers={workers}
          loading={loading}
          addEpi={addEpi}
          assignEpi={assignEpi}
          returnEpi={returnEpi}
          importInventoryCSV={importInventoryCSV}
          exportInventoryCSV={exportInventoryCSV}
        />
      )}
    </div>
  );
}
