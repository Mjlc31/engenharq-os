const fs = require('fs');
let p2 = 'src/components/features/assets/CatalogTab.tsx';
let c2 = fs.readFileSync(p2, 'utf8');
c2 = c2.replace(/const \{ error \} = await supabase\n        \.from\('epi_catalog'\)\n        \.update\(\{ current_stock: newStock \}\)\n        \.eq\('id', stockItem\.id\);\n      \n      if \(error\) throw error;/g, 'await saveCatalog({ current_stock: newStock }, stockItem.id);');
fs.writeFileSync(p2, c2);
