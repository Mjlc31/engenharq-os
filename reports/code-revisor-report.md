# EngenharQ OS - Relatório de Revisão de Código

## Resumo da Avaliação
A avaliação de código foi conduzida no projeto, focando em segurança, boas práticas, tratamento de erros e tipagem (TypeScript). A estrutura geral do projeto segue bons padrões, com o uso de Supabase, React + Vite e Node.js. No entanto, foram identificadas vulnerabilidades de validação de input no backend, riscos de performance no frontend devido a queries não limitadas e violações do modo estrito do TypeScript.

Abaixo está o checklist de revisão com os apontamentos.

---

**[CRITICAL] `src/pages/Dashboard.tsx:74` — Unbounded query for active assignments**
Risk: A query que busca as atribuições ativas de EPI (`is('returned_at', null)`) não possui `.limit()` ou paginação. Conforme o número de empréstimos cresce, isso trará milhares de registros para a memória do navegador simultaneamente, causando travamentos na UI (Out of Memory) e consumo excessivo de banda/banco de dados.
Fix: Transferir a lógica preditiva de cálculo de vencimento (CA e Lifespan) para uma view ou RPC (Database Function) no Supabase, ou pelo menos implementar paginação no frontend para processar em lotes.

**[HIGH] `server.ts:167` — Falta de validação de tipos no input (req.body)**
Risk: O método `handleBiometricsMatch` extrai `audit_selfie` e `reference_photo_url` diretamente do body da requisição, mas não valida se são strings. Um atacante (ou bug) passando arrays ou objetos fará a aplicação lançar um `TypeError` (ex: `auditSelfie.split is not a function`), resultando num erro 500 não tradado adequadamente para o cliente.
Fix: Utilizar o pacote `zod` (já presente nas dependências) para validar o `req.body` ou adicionar verificações simples com `typeof audit_selfie === 'string'` antes de processá-los.

**[MEDIUM] `server.ts:181` — Ausência de middlewares de segurança básicos**
Risk: O servidor Express não faz uso de `cors` ou `helmet`. Isso pode expor a API standalone a ataques básicos ou problemas de restrição de chamadas entre diferentes origens no ambiente de produção.
Fix: Instalar e configurar os middlewares `cors` e `helmet` (`app.use(helmet()); app.use(cors());`).

**[MEDIUM] `src/types/index.ts:50` — Uso de `any` explícito no Worker**
Risk: A propriedade `facial_descriptor?: any;` anula os benefícios do TypeScript. Erros de acesso a propriedades inexistentes nesse objeto não serão pegos no momento da compilação.
Fix: Substituir por um tipo mais seguro, como `number[]` ou uma interface específica que descreva a estrutura do descritor biométrico.

**[MEDIUM] `src/pages/Scanner.tsx:98` — Type assertion para `any`**
Risk: O uso de `setWorker(data as any);` oculta possíveis problemas de tipo entre o retorno do Supabase e o estado `Worker` no React. Se a query omitir campos obrigatórios, o compilador não avisará.
Fix: Tipar o retorno do Supabase corretamente usando os genéricos providos, ou criar um cast mais seguro explícito (`data as Worker`).

**[LOW / SUGGESTION] `src/pages/Scanner.tsx:14` — Modificação global de protótipo de ícones do Leaflet**
Risk: Modificar protótipos de bibliotecas (`delete (L.Icon.Default.prototype as any)['_getIconUrl']`) é frágil, sujeito a quebras em novas atualizações do `leaflet` e contamina o escopo global do mapa.
Fix: Criar um ícone customizado com `new L.Icon({...})` e passá-lo explicitamente como propriedade `icon` para o componente `Marker` instanciado no mapa.

---

> Review Summary: examined 6 files, found 1 CRITICAL, 1 HIGH, 3 MEDIUM, 1 LOW findings. Top priority: Fetching unbounded EPI assignments in Dashboard which will freeze the frontend. Merge recommendation: **APPROVE WITH SUGGESTIONS**.
