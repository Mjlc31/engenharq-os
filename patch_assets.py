import re

with open('src/pages/Assets.tsx', 'r') as f:
    content = f.read()

# Remove InventoryTab import
content = re.sub(r"import \{ InventoryTab \} from '\.\./components/features/assets/InventoryTab';\n", "", content)

# Remove tabs state
content = re.sub(r"const \[activeTab, setActiveTab\] = useState<'inventory' \| 'catalog'>\('inventory'\);\n  ", "", content)

# Remove activeTab UI
tabs_ui = """        {/* Tabs */}
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
        </div>"""
content = content.replace(tabs_ui, "")

# Remove InventoryTab render
inventory_tab_render = """      {activeTab === 'inventory' && (
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
      )}"""
content = content.replace(inventory_tab_render, "")

# Remove condition for CatalogTab
catalog_tab_render_old = """      {activeTab === 'catalog' && (
        <CatalogTab 
          catalogs={catalogs}
          loading={loading}
          saveCatalog={saveCatalog}
          deleteCatalog={deleteCatalog}
        />
      )}"""
catalog_tab_render_new = """      <CatalogTab 
        catalogs={catalogs}
        loading={loading}
        saveCatalog={saveCatalog}
        deleteCatalog={deleteCatalog}
      />"""
content = content.replace(catalog_tab_render_old, catalog_tab_render_new)

with open('src/pages/Assets.tsx', 'w') as f:
    f.write(content)
