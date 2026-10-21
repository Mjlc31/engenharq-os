import React, { useState } from 'react';
import { AlertCircle, Layers, ShieldCheck } from 'lucide-react';
import { useEpiAssets } from '../hooks/useEpiAssets';
import { CatalogTab } from '../components/features/assets/CatalogTab';
import { EpiTrackingTab } from '../components/features/assets/EpiTrackingTab';

export function Assets() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'tracking'>('catalog');
  
  const {
    catalogs,
    sites,
    siteInventories,
    loading,
    error,
    saveCatalog,
    deleteCatalog,
    updateSiteStock
  } = useEpiAssets();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestão de EPIs</h1>
          <p className="text-muted mt-1">Controle de estoque por canteiro de obras e rastreamento de EPIs em uso.</p>
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
            onClick={() => setActiveTab('tracking')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
              activeTab === 'tracking'
                ? 'bg-primary text-white shadow-sm font-semibold'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            EPIs em Uso & Rastreamento
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
        <EpiTrackingTab sites={sites} />
      )}
    </div>
  );
}
