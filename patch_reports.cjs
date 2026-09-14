const fs = require('fs');
let code = fs.readFileSync('src/pages/Reports.tsx', 'utf-8');

// Replace mock function with real export
const newExportLogic = `
  const generateReport = async (type: string) => {
    try {
      let dataToExport = [];
      
      if (type === 'funcionarios') {
        const { data } = await supabase.from('workers').select('full_name, registration_number, cpf, department, current_role, admission_date, site_id, status');
        dataToExport = (data || []).map(w => ({
          Nome: w.full_name,
          Matricula: w.registration_number,
          CPF: w.cpf,
          Setor: w.department,
          Funcao: w.current_role,
          Admissao: new Date(w.admission_date).toLocaleDateString(),
          Status: w.status
        }));
      } else if (type === 'epis' || type === 'estoque') {
        const { data } = await supabase.from('epi_catalog').select('code, name, category, brand, model, ca_number, current_stock, minimum_stock');
        dataToExport = (data || []).map(c => ({
          Codigo: c.code,
          Nome: c.name,
          Categoria: c.category,
          Marca: c.brand,
          Modelo: c.model,
          CA: c.ca_number,
          Estoque_Atual: c.current_stock,
          Estoque_Minimo: c.minimum_stock,
          Status_Estoque: c.current_stock <= c.minimum_stock ? 'BAIXO' : 'OK'
        }));
      } else if (type === 'entregas') {
        let query = supabase.from('epi_assignments').select(\`
          assigned_at, returned_at, condition_on_return,
          worker:workers(full_name, department),
          epi:epi_inventory(tracking_code, catalog:epi_catalog(name))
        \`);
        const { data } = await query;
        dataToExport = (data || []).map(a => ({
          Trabalhador: (a.worker as any)?.full_name,
          Setor: (a.worker as any)?.department,
          EPI: (a.epi as any)?.catalog?.name,
          Codigo_Rastreio: (a.epi as any)?.tracking_code,
          Data_Entrega: new Date(a.assigned_at).toLocaleDateString(),
          Data_Devolucao: a.returned_at ? new Date(a.returned_at).toLocaleDateString() : 'Em Uso',
          Condicao_Retorno: a.condition_on_return || '-'
        }));
      } else if (type === 'vencimentos' || type === 'trocas') {
        const { data } = await supabase.from('epi_inventory').select('tracking_code, ca_expiration_date, status, catalog:epi_catalog(name, recommended_lifespan_days)').eq('status', 'IN_USE');
        dataToExport = (data || []).map(e => {
          const expDate = e.ca_expiration_date ? new Date(e.ca_expiration_date).toLocaleDateString() : 'N/A';
          return {
            Codigo_Rastreio: e.tracking_code,
            Nome_EPI: (e.catalog as any)?.name,
            Validade_CA: expDate,
            Vida_Util_Dias: (e.catalog as any)?.recommended_lifespan_days || 'N/A'
          };
        });
      }

      if (dataToExport.length === 0) {
        toast({ type: 'error', title: 'Sem Dados', message: 'Não há dados para exportar.' });
        return;
      }

      // Import papaparse dynamically or assume it's imported
      const Papa = require('papaparse');
      const csv = Papa.unparse(dataToExport);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", \`relatorio_\${type}_\${new Date().toISOString().slice(0,10)}.csv\`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ type: 'success', title: 'Relatório Gerado', message: 'O download foi iniciado com sucesso.' });
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message });
    }
  };
`;

code = code.replace(
  /const generateReport = \(type: string\) => \{[\s\S]*?toast\(\{ type: 'success', title: 'Relatório Gerado', message: 'O download foi iniciado com sucesso.' \}\);\n  \};/,
  newExportLogic
);

// We need to make sure Papa is imported, it's used as `require('papaparse')` but it's Vite, so we should import it properly.
if (!code.includes("import Papa")) {
  code = code.replace(
    "import { supabase } from '../lib/supabase';",
    "import { supabase } from '../lib/supabase';\nimport Papa from 'papaparse';"
  );
}
// Remove the require() line that I just put in the string replacement
code = code.replace("const Papa = require('papaparse');", "");

fs.writeFileSync('src/pages/Reports.tsx', code);
