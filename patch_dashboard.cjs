const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

code = code.replace(
  "stats.workers, subtitle: 'No canteiro atual', subtitleColor: 'text-muted', valueColor: 'text-foreground'",
  "stats.avgRetentionDays, subtitle: 'Dias médios com EPI', subtitleColor: 'text-muted', valueColor: 'text-blue-500'"
);

code = code.replace(
  "title: 'Colaboradores Ativos'",
  "title: 'Retenção Média'"
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
