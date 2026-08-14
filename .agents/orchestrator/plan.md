# Execution Plan — EngenharQ OS

## Strategy & Topology
Seguindo a estratégia de orquestração Project Pattern Silicon Valley:
1. **Fase 1: Exploração e Diagnóstico** — Spawna Explorer para inspecionar codebase, schema Supabase (`supabase/schema.sql`), dependências, estrutura dos 8 módulos e testes existentes.
2. **Fase 2: Integração Supabase e Schemas** — Spawna Worker para configurar/verificar cliente Supabase, tabelas, políticas RLS e autenticação.
3. **Fase 3: Implementação dos Módulos Frontend** — Spawna Worker(s) para implementar/completar a UI e funcionalidades CRUD dos 8 módulos (Dashboard, Scanner, Assets, Workers, Sites, Map, Tags, Audit).
4. **Fase 4: Verificação Biométrica Facial Real** — Spawna Worker para integrar biblioteca biométrica (face-api.js / @vladmandic/face-api ou tfjs) no Scanner e fluxo de cadastro dos Workers, com thresholds de correspondência rigorosos.
5. **Fase 5: Testes E2E, Verificação de Build e Auditoria Forense** — Spawna Reviewer, Challenger e Forensic Auditor (`teamwork_preview_auditor`) para garantir compilação sem erros, servidor dev rodando, biometria testada (aprovação/rejeição) e zero violações de integridade.
6. **Fase 6: Relatório Final e Vitória (Claim Victory)** — Apresentar os resultados ao Sentinel e encerrar.

## Work Items
- [x] Item 0: Inicializar workspace do Orchestrator (`.agents/orchestrator/`), BRIEFING.md, PROJECT.md, plan.md, progress.md.
- [ ] Item 1: Explorar a base de código e documentar diagnósticos (`explorer_1`).
- [ ] Item 2: Implementar/Ajustar Supabase, Auth e Schemas de dados (`worker_1`).
- [ ] Item 3: Desenvolver os 8 módulos frontend com conectividade Supabase (`worker_2`).
- [ ] Item 4: Implementar motor de verificação biométrica facial no Scanner (`worker_3`).
- [ ] Item 5: Executar testes de build, verificação de rotas/login/biometria e Auditoria Forense (`reviewer_1`, `challenger_1`, `auditor_1`).
- [ ] Item 6: Relatório de Conclusão e Claim Victory para o Sentinel.
