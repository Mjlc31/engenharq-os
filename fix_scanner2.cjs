const fs = require('fs');

let p = 'src/pages/Scanner.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/useEffect\(\(\) => \{\n    const groupedEpis = epis\.reduce\(\(acc, current\) => \{\n    const existing = acc\.find\(item => item\.id === current\.id\);\n    if \(existing\) \{\n      existing\.quantity \+= 1;\n    \} else \{\n      acc\.push\(\{ \.\.\.current, quantity: 1 \}\);\n    \}\n    return acc;\n  \}, \[\] as \(EpiCatalog & \{ quantity: number \}\)\[\]\);\n\n  return \(\) => \{/g, `const groupedEpis = epis.reduce((acc, current) => {
    const existing = acc.find(item => item.id === current.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      acc.push({ ...current, quantity: 1 });
    }
    return acc;
  }, [] as (EpiCatalog & { quantity: number })[]);

  useEffect(() => {
  return () => {`);

c = c.replace(/const \[epis, setEpis\] = useState<EpiCatalog\[\]>\(\[\]\);/g, 'const [epis, setEpis] = useState<any[]>([]);');

fs.writeFileSync(p, c);
