import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useEpiAssets } from '../hooks/useEpiAssets';
import { CatalogTab } from '../components/features/assets/CatalogTab';

export function Assets() {
  
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
        

      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg">
          <AlertCircle className="shrink-0 w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}



      <CatalogTab 
        catalogs={catalogs}
        loading={loading}
        saveCatalog={saveCatalog}
        deleteCatalog={deleteCatalog}
      />
    </div>
  );
}
