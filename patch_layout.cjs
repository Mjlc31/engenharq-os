const fs = require('fs');
let code = fs.readFileSync('src/components/Layout.tsx', 'utf-8');

// Add icons to import if missing
if (!code.includes('ClipboardList')) {
  code = code.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { $1, ClipboardList, Activity } from 'lucide-react';");
}

code = code.replace(
  `{ name: 'Colaboradores', href: '/workers', icon: Users, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },`,
  `{ name: 'Colaboradores', href: '/workers', icon: Users, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },\n    { name: 'Operações', href: '/operations', icon: Activity, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },\n    { name: 'Relatórios', href: '/reports', icon: ClipboardList, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },`
);

fs.writeFileSync('src/components/Layout.tsx', code);
