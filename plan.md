# Plano de Ação - Refatoração e Testes (Aba Colaboradores)

## 1. Melhorias de Acessibilidade (A11y) & UX (Workers.tsx)
- Corrigir o atributo `alt` nas tags `img` dos avatares para evitar leitura duplicada por leitores de tela (Screen Readers leriam o nome duas vezes seguidas).
- Melhorar labels de formulários nos modais.

## 2. Testes E2E (Playwright)
- Criar a suíte de testes de integração e frontend com Playwright (`tests/e2e/workers.spec.ts`).
- O teste deve simular o login, navegação para a aba "Colaboradores", teste do filtro por CPF, e teste de navegação na paginação.

## 3. Validação
- Executar os testes automatizados para validar que as melhorias não quebraram a aba e que as funcionalidades vitais operam sem intervenção humana.
