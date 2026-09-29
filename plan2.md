# Plano de Correção e Refatoração 2

## 1. Tratamento de Constraints no Importador (useWorkers.ts)
- O erro da imagem indica que houve uma violação de chave única (`duplicate key value violates unique constraint`) ao importar a planilha. 
- A ação corretiva é alterar o método `.insert()` no `importCSV` para lidar com esse cenário graciosamente. Iremos buscar os CPFs/Matrículas previamente e pular/avisar as duplicatas (ou usar `upsert`).

## 2. Refatoração UX no WorkerProfile.tsx
- No `WorkerProfile.tsx`, quando há um sucesso ou falha no update do perfil, a interface renderiza um bloco vermelho local. Iremos unificar isso substituindo o estado local de sucesso/erro pelo uso do `useToast`, mantendo a consistência visual em toda a plataforma.

## 3. Implementação
- Os agentes atuarão simultaneamente nestas melhorias via `/dispatching-parallel-agents`.
