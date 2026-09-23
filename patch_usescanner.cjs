const fs = require('fs');

let p = 'src/hooks/useScanner.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/import \{ ([^}]+) \} from '\.\.\/types\/database\.types';/, "import { $1, EpiCatalog } from '../types/database.types';");

c = c.replace(/let query = supabase\.from\('epi_inventory'\)\.select\('\*'\);/g, "let query = supabase.from('epi_catalog').select('*');");
c = c.replace(/return data as EpiInventory;/g, "return { ...data, status: data.current_stock > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK' } as any;"); // Return object with status to appease UI

fs.writeFileSync(p, c);
