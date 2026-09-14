const fs = require('fs');
let code = fs.readFileSync('src/pages/Sites.tsx', 'utf-8');

code = code.replace(
  /toast\(\{ type: 'success', title: 'Sucesso', message: 'Obra registrada.' \}\);\n      \}\n      resetSiteForm\(\);\n      fetchSites\(\);/g,
  "await fetchSites();\n        toast({ type: 'success', title: 'Sucesso', message: 'Obra registrada.' });\n      }\n      resetSiteForm();"
);

code = code.replace(
  /toast\(\{ type: 'success', title: 'Sucesso', message: 'Obra atualizada.' \}\);\n      \} else \{/g,
  "await fetchSites();\n        toast({ type: 'success', title: 'Sucesso', message: 'Obra atualizada.' });\n      } else {"
);

fs.writeFileSync('src/pages/Sites.tsx', code);
