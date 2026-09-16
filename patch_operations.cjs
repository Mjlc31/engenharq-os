const fs = require('fs');
let code = fs.readFileSync('src/pages/Operations.tsx', 'utf-8');

code = code.replace(
  `{['entregas', 'devolucoes', 'substituicoes', 'extravios'].map((tab) => (`,
  `{['entregas', 'devolucoes', 'substituicoes', 'extravios', 'estoque'].map((tab) => (`
);

if (!code.includes("activeTab === 'estoque'")) {
  const stockTabContent = `
        {activeTab === 'estoque' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-4">Posição de Estoque (Disponíveis vs Em Uso)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogs.map(cat => {
                const available = epis.filter(e => e.epi_catalog_id === cat.id && e.status === 'AVAILABLE').length;
                const inUse = epis.filter(e => e.epi_catalog_id === cat.id && e.status === 'IN_USE').length;
                return (
                  <div key={cat.id} className="p-4 border border-border rounded-lg bg-background">
                    <h3 className="font-bold text-foreground truncate">{cat.name}</h3>
                    <p className="text-sm text-muted mb-2">CA: {cat.ca_number || 'N/A'}</p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-emerald-500 font-medium">{available} Disponíveis</span>
                      <span className="text-blue-500 font-medium">{inUse} Em Uso</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
`;

  code = code.replace(
    `{activeTab === 'extravios' && <LossForm workers={workers} />}`,
    `{activeTab === 'extravios' && <LossForm workers={workers} />}\n${stockTabContent}`
  );
}

fs.writeFileSync('src/pages/Operations.tsx', code);
