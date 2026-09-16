const fs = require('fs');
let code = fs.readFileSync('src/components/Layout.tsx', 'utf-8');

// Add icons to import if missing
if (!code.includes('ClipboardList')) {
  code = code.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { $1, ClipboardList, Activity } from 'lucide-react';");
}

if (!code.includes("name: 'Painel de Operações'")) {
  code = code.replace(
    `{ name: 'Colaboradores', href: '/workers', icon: Users, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },`,
    `{ name: 'Colaboradores', href: '/workers', icon: Users, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },\n    { name: 'Painel de Operações', href: '/operations', icon: Activity, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },\n    { name: 'Painel de Relatórios', href: '/reports', icon: ClipboardList, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },`
  );
}

// Ensure the filters have the new items
code = code.replace(
  `['Almoxarifado (Scan)', 'Mapa de Ativos'].includes(item.name)`,
  `['Almoxarifado (Scan)', 'Mapa de Ativos', 'Painel de Operações'].includes(item.name)`
);

code = code.replace(
  `['Auditoria NR-6', 'Imprimir QR Codes'].includes(item.name)`,
  `['Auditoria NR-6', 'Imprimir QR Codes', 'Painel de Relatórios'].includes(item.name)`
);

fs.writeFileSync('src/components/Layout.tsx', code);
