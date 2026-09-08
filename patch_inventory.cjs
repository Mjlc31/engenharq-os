const fs = require('fs');

let code = fs.readFileSync('src/components/features/assets/InventoryTab.tsx', 'utf8');

const tableCode = `
            <div className="min-w-[800px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface/50 text-xs uppercase tracking-wider text-muted font-semibold">
                    <th className="p-3">CÓDIGO (TRACKING)</th>
                    <th className="p-3">CATEGORIA</th>
                    <th className="p-3">CA</th>
                    <th className="p-3">STATUS</th>
                    <th className="p-3 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredEpis.map((epi) => (
                    <tr key={epi.id} className="border-b border-border hover:bg-surface-hover/30 transition-colors">
                      <td className="p-3 font-mono text-primary font-bold">{epi.tracking_code}</td>
                      <td className="p-3 font-medium text-foreground">{epi.category}</td>
                      <td className="p-3 font-mono text-muted">{epi.ca_number || '-'}</td>
                      <td className="p-3">
                        {epi.status === 'AVAILABLE' && <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 text-xs font-bold">ESTOQUE</span>}
                        {epi.status === 'IN_USE' && <span className="px-2 py-1 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 text-xs font-bold">EM USO</span>}
                        {epi.status === 'MAINTENANCE' && <span className="px-2 py-1 rounded bg-amber-900/30 text-amber-400 border border-amber-800/50 text-xs font-bold">REVISÃO</span>}
                        {epi.status === 'DISCARDED' && <span className="px-2 py-1 rounded bg-red-900/30 text-red-400 border border-red-800/50 text-xs font-bold">DESCARTE</span>}
                      </td>
                      <td className="p-3 flex justify-end gap-2">
                        {epi.status === 'AVAILABLE' && (
                          <button 
                            onClick={() => setAssigningEpiId(epi.id)}
                            className="px-4 py-1.5 text-xs font-bold tracking-wider text-primary uppercase bg-primary/10 rounded-md cursor-pointer hover:bg-primary hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            Designar
                          </button>
                        )}
                        {epi.status === 'IN_USE' && (
                          <button 
                            onClick={() => handleReturnEpi(epi.id)}
                            className="px-4 py-1.5 text-xs font-bold tracking-wider text-muted uppercase bg-surface-hover rounded-md cursor-pointer hover:bg-surface-hover/80 hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            Devolver
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
`;

code = code.replace(
  /<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/>\s*\);\s*}\s*$/,
  tableCode + '\n          )}\n        </div>\n      </div>\n    </>\n  );\n}\n'
);

fs.writeFileSync('src/components/features/assets/InventoryTab.tsx', code);
console.log('Patched InventoryTab.tsx to use Table layout');
