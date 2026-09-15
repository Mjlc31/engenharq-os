const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "const Reports = React.lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));",
  "const Reports = React.lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));\nconst Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));"
);

fs.writeFileSync('src/App.tsx', code);
