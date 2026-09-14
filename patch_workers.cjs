const fs = require('fs');
let code = fs.readFileSync('src/pages/Workers.tsx', 'utf-8');

// Replace the date formatting line
code = code.replace(
  "worker.admission_date ? format(new Date(worker.admission_date), 'dd/MM/yyyy') : '-'",
  "(worker.admission_date && !isNaN(new Date(worker.admission_date).getTime())) ? format(new Date(worker.admission_date), 'dd/MM/yyyy') : '-'"
);

fs.writeFileSync('src/pages/Workers.tsx', code);
