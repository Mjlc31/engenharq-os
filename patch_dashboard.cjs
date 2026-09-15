const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

code = code.replace(
  'className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"',
  'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"'
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
