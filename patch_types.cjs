const fs = require('fs');
let content = fs.readFileSync('src/types/index.ts', 'utf-8');

// Patch ConstructionSite
content = content.replace(
  '  name: string;',
  '  code?: string | null;\n  name: string;\n  city?: string | null;\n  manager_name?: string | null;'
);
content = content.replace('  latitude: number;', '  latitude?: number | null;');
content = content.replace('  longitude: number;', '  longitude?: number | null;');

// Patch EpiCatalog
content = content.replace(
  '  name: string;',
  '  code?: string | null;\n  name: string;\n  model?: string | null;\n  status?: string | null;'
);

fs.writeFileSync('src/types/index.ts', content);
