const fs = require('fs');
let code = fs.readFileSync('src/pages/Scanner.tsx', 'utf8');

const oldSelect = `className="flex-1 bg-surface border border-border rounded-md px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"`;
const newSelect = `className="flex-1 bg-surface border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground transition-all cursor-pointer"`;

code = code.replace(oldSelect, newSelect);
fs.writeFileSync('src/pages/Scanner.tsx', code);
