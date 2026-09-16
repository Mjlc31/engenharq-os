import re

with open('src/components/features/assets/CatalogTab.tsx', 'r') as f:
    content = f.read()

# Add Download to imports from lucide-react if not present
if "Download" not in content:
    content = content.replace("import { Plus, Edit2, Trash2, Box, Shield, AlertCircle, Search, Filter, ImageIcon } from 'lucide-react';", "import { Plus, Edit2, Trash2, Box, Shield, AlertCircle, Search, Filter, ImageIcon, Download } from 'lucide-react';")

# Add export function
export_func = """  const handleExport = () => {
    if (catalogs.length === 0) {
      toast({ type: 'error', title: 'Erro', message: 'Não há dados para exportar.' });
      return;
    }
    
    const headers = ['Nome', 'Categoria', 'Modelo', 'Marca', 'CA', 'Validade CA', 'Vida Útil (Dias)', 'Estoque Atual', 'Estoque Mínimo', 'Status'];
    const csvContent = [
      headers.join(','),
      ...catalogs.map(c => [
        `"${c.name || ''}"`,
        `"${c.category || ''}"`,
        `"${c.model || ''}"`,
        `"${c.brand || ''}"`,
        `"${c.ca_number || ''}"`,
        `"${c.ca_validity || ''}"`,
        c.lifespan_days || '',
        c.current_stock || 0,
        c.minimum_stock || 0,
        `"${c.status || ''}"`
      ].join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `catalogo_epis_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
"""

content = content.replace("  const filteredCatalogs =", export_func + "\n  const filteredCatalogs =")

# Add button to UI
button_ui = """      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar EPI por nome, CA ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-9 pr-8 py-2 bg-surface border border-border rounded-md text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todas as categorias</option>
              {NR6_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-surface border border-border hover:bg-surface-hover text-foreground font-medium py-2 px-4 rounded-md transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button
            onClick={() => setIsAddingCatalog(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Item
          </button>
        </div>
      </div>"""

# Replace old header
old_header = """      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar EPI por nome, CA ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-9 pr-8 py-2 bg-surface border border-border rounded-md text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todas as categorias</option>
              {NR6_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => setIsAddingCatalog(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-medium py-2 px-4 rounded-md transition-colors w-full md:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Novo Item (Catálogo)
        </button>
      </div>"""

content = content.replace(old_header, button_ui)

with open('src/components/features/assets/CatalogTab.tsx', 'w') as f:
    f.write(content)
