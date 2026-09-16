const fs = require('fs');

let code = fs.readFileSync('src/components/features/assets/CatalogTab.tsx', 'utf8');

// Add state for initial stock
code = code.replace(
  /const \[catMinStock, setCatMinStock\] = useState<number \| ''>\(''\);/,
  "const [catMinStock, setCatMinStock] = useState<number | ''>('');\n  const [catInitialStock, setCatInitialStock] = useState<number | ''>('');"
);

// Reset form
code = code.replace(
  /setCatMinStock\(''\);/,
  "setCatMinStock('');\n    setCatInitialStock('');"
);

// Payload
code = code.replace(
  /minimum_stock: catMinStock \? Number\(catMinStock\) : null,/,
  "minimum_stock: catMinStock ? Number(catMinStock) : null,\n      ...(!editingCatalog && catInitialStock !== '' ? { current_stock: Number(catInitialStock) } : {}),"
);

// Form input
code = code.replace(
  /<div className="space-y-2">\s*<label className="text-sm font-medium text-muted">URL da Imagem<\/label>/,
  `{!editingCatalog && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">Estoque Inicial</label>
                  <input
                    type="number"
                    value={catInitialStock}
                    onChange={e => setCatInitialStock(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Quantidade que entrou"
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">URL da Imagem</label>`
);

fs.writeFileSync('src/components/features/assets/CatalogTab.tsx', code);
console.log('Patched CatalogTab.tsx to support Estoque Inicial');
