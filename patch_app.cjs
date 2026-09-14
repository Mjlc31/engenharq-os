const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "import { Audit } from './pages/Audit';",
  "import { Audit } from './pages/Audit';\nimport { Settings } from './pages/Settings';"
);

code = code.replace(
  "<Route path=\"audit\" element={<Audit />} />",
  "<Route path=\"audit\" element={<Audit />} />\n              <Route path=\"settings\" element={<Settings />} />"
);

fs.writeFileSync('src/App.tsx', code);
