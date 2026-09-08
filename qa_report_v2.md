# QA Report - EngenharQ OS v2.4.0

**Objetivo:** Validar fluxos de navegação básicos e regras de RBAC com a conta `admin@engenharq.com`.

### 1. Problemas e Bugs Encontrados (Críticos & Funcionais)

- **Crash nas Páginas de Colaboradores e Estoque (NR-6)**
  - **Onde**: `/workers` e `/assets`
  - **Problema**: Ao acessar essas telas, a aplicação sofre um *crash* com a mensagem de erro "Ops! Algo deu errado." vinda do `ErrorBoundary`.
  - **Causa**: O console acusa o erro `Error: useToast must be used within a ToastProvider`. O *hook* `useToast` está sendo chamado fora do contexto de um `ToastProvider`.
  - **Ação Recomendada**: Envolver as rotas ou o `<App>` principal em um `<ToastProvider>`.

- **Falha na Regra de RBAC (Exclusão de Obras Invisível)**
  - **Onde**: `/sites`
  - **Problema**: Apesar do usuário logado ser um Admin (`admin@engenharq.com`), os botões de "Excluir" obra não estão sendo renderizados. Apenas o botão "Editar" está visível para cada obra.
  - **Ação Recomendada**: Revisar a lógica de condicional (RBAC) do componente de listagem de obras para garantir que `role === 'admin'` exiba o botão corretamente.

- **Componente Falso (Problema Semântico)**
  - **Onde**: `/sites`
  - **Problema**: O elemento "Importar CSV" consta na árvore como apenas um texto estático, ao passo que "Exportar CSV" e "Nova Obra" são botões.
  - **Ação Recomendada**: Transformar o "Importar CSV" em um `<button>`.

### 2. Melhorias de UI/UX Sugeridas

- **Ausência de Controle do Menu Lateral (Expandir/Contrair)**
  - **Problema**: Não há botão ou ícone visível para expandir ou contrair a *sidebar* de navegação, dificultando a adaptação do layout.
  - **Ação Recomendada**: Adicionar um botão de *toggle* na barra superior.

- **Avisos de Memory Leak**
  - **Problema**: Warnings persistentes no console ("MaxListenersExceededWarning").
  - **Ação Recomendada**: Revisar os *listeners* (ex: Leaflet ou HMR) para evitar degradação de performance.

### Conclusão
É imprescindível adicionar o `ToastProvider` para restaurar o acesso às telas principais de efetivo e inventário, e corrigir os nós do RBAC para permitir a exclusão de Obras por administradores.
