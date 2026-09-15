const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

const earlyReturn = `  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted">
        <AlertTriangle className="w-12 h-12 text-red-500 opacity-80" />
        <div className="text-center">
          <h2 className="text-lg font-bold text-foreground">Erro ao carregar o painel</h2>
          <p className="text-sm">Não foi possível buscar as estatísticas do sistema.</p>
        </div>
        <button 
          onClick={() => refetch()}
          className="mt-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-md transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }`;

// Remove the early return
code = code.replace(earlyReturn, '');

// Insert it back just before `return (`
code = code.replace(
  '  return (',
  earlyReturn + '\n\n  return ('
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
