import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useEpiAssets } from '../hooks/useEpiAssets';
import { InventoryTab } from '../components/features/assets/InventoryTab';
import { CatalogTab } from '../components/features/assets/CatalogTab';

export function Assets() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'catalog'>('inventory');
  
  const {
    epis,
    workers,
    catalogs,
    loading,
    error,
    addEpi,
    assignEpi,
    returnEpi,
    saveCatalog,
    deleteCatalog,
    importInventoryCSV,
    exportInventoryCSV
  } = useEpiAssets();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestão de EPIs</h1>
          <p className="text-muted mt-1">Gerencie os modelos e o inventário de segurança.</p>
        </div>
        
        {/* Tabs */}
        <div className="flex p-1 bg-surface rounded-lg border border-border w-full sm:w-auto mt-2 sm:mt-0">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
              activeTab === 'inventory' 
                ? 'bg-primary/20 text-primary border border-primary/30' 
                : 'text-muted hover:text-foreground'
            }`}
          >
            Inventário
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
              activeTab === 'catalog' 
                ? 'bg-primary/20 text-primary border border-primary/30' 
                : 'text-muted hover:text-foreground'
            }`}
          >
            Catálogo
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg">
          <AlertCircle className="shrink-0 w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {activeTab === 'inventory' && (
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

      {activeTab === 'catalog' && (
        <CatalogTab 
          catalogs={catalogs}
          loading={loading}
          saveCatalog={saveCatalog}
          deleteCatalog={deleteCatalog}
        />
      )}
    </div>
  );
}
