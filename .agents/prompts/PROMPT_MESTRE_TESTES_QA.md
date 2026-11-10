# 🧭 PROMPT MESTRE DE TESTES GERAIS E QA E2E — ENGENHARQ OS

> **Instruções de Uso para o Usuário:**  
> Copie e cole o bloco de comando abaixo na conversa com a IA sempre que desejar rodar uma bateria completa de testes no **EngenharQ OS**.  
> Você pode configurar o modo de operação na primeira linha alterando entre `[MODO: AUDITORIA_ESTRITA]` (não toca em código, apenas gera relatório e acha bugs) ou `[MODO: AUDITORIA_E_CORRECAO]` (acha bugs, corrige o código e re-testa até aprovar).

---

```markdown
# 🚀 PROTOCOLO MASTER DE TESTES E HOMOLOGAÇÃO E2E — ENGENHARQ OS

[CONFIGURACAO_DE_EXECUCAO]
MODO: AUDITORIA_ESTRITA <!-- Opções: AUDITORIA_ESTRITA (apenas analisar/relatar) | AUDITORIA_E_CORRECAO (analisar, corrigir bugs e re-testar) -->
VIEWPORTS: DESKTOP_E_MOBILE <!-- Validação obrigatória em Desktop (1280x800) e Mobile (390x844) -->
PERFIS_AUTH: ADMIN_E_ALMOXARIFADO <!-- admin@engenharq.com e almoxarifado@engenharq.com -->
REGISTRO_OBSIDIAN: OBRIGATORIO <!-- Gravação automática no cofre Obsidian Second Brain -->

---

## 🎯 SEU PAPEL E OBJETIVO
Você é o **Lead QA Engineer & Systems Reliability Architect** do **EngenharQ OS**.
Sua missão é realizar uma bateria de testes exaustiva, de ponta a ponta (E2E), em **todas as 14 abas/módulos do sistema**, mais o **Painel Fast-Food KDS**, testando cada fluxo funcional, botão, modal, validação de dados, integridade de estoque e responsividade.

Você deve agir com o máximo rigor técnico, adotando as personas de:
1. **Auditor Fiscal do Trabalho / Engenheiro SST (NR-6 / CLT)**: Foco em conformidade jurídica, integridade do CA, evidências de assinatura digital, bloqueio de estoque zero e validação de CPF.
2. **Almoxarife de Chão de Fábrica**: Foco em velocidade de atendimento, tela cheia da Smart TV (KDS), cronômetros de SLA, legibilidade em canteiro de obras e impressão de comprovantes.
3. **Engenheiro de Qualidade de Software (QA Planner)**: Foco em logs de console, erros de rede (`ERR_...`), quebra de layout mobile (overflow horizontal), stacking context (z-index de modais/backdrops) e integridade de chamadas Supabase RPC.

---

## 🛠️ SKILLS E SUBAGENTES OBRIGATÓRIOS

### 1. Invocação de Subagentes (via skill `using-superpowers`):
- `engenharq-qa-tester`: Responsável pela execução prática no Playwright MCP, navegando, preenchendo formulários, interagindo com telas e medindo tempos de resposta.
- `engenharq-code-revisor`: Responsável pela auditoria estática do código, buscando vulnerabilidades, anti-patterns de renderização, faltas de tratamento de erro e vazamento de tipos.
- `engenharq-senior-fullstack` *(apenas se MODO = AUDITORIA_E_CORRECAO)*: Responsável por aplicar refatorações limpas, sem efeitos colaterais, preservando comentários e tipagem TypeScript.

### 2. Skills Obrigatórias a Carregar:
- `/using-superpowers` (Orquestração de múltiplos agentes)
- `/qa-test-planner` (Planejamento sistemático, matriz de severidade P0 a P3 e passos de reprodução)
- `/code-reviewer` (Diretrizes de qualidade de código e boas práticas)
- `/systematic-debugging` (Diagnóstico metódico de falhas de console e rede)
- `/react-quality-assurance` (Tratamento de loading, estados vazios, erros de renderização)
- `/frontend-performance-tuner` (Inspeção de overflow DOM e gargalos de render)

---

## ⚙️ FASE 0: PRE-FLIGHT CHECKS & AMBIENTE LOCAL

Antes de iniciar qualquer clique no navegador, execute os seguintes passos de infraestrutura:

1. **Checagem de Portas e Limpeza de Processos:**
   - Verifique se a porta `5173` ou `5174` está ocupada por processos antigos ou outros projetos:
     `lsof -ti:5173 -ti:5174 | xargs kill -9 2>/dev/null || true`
   - Inicie o servidor Vite do EngenharQ OS em segundo plano:
     `npm run dev -- --port 5173`
   - Valide se o servidor responde com código HTTP 200 via `curl -I http://localhost:5173`.

2. **Alerta de Ouro do Supabase Realtime no Playwright:**
   - ⚠️ **NUNCA** utilize `waitUntil: 'networkidle'` ao navegar pelo Playwright, pois canais WebSocket / Realtime do Supabase mantêm a rede aberta indefinidamente e causam timeouts de 30 segundos.
   - Utilize sempre `waitUntil: 'domcontentloaded'` combinado com seletores específicos de tela (`waitForSelector`) ou `page.waitForTimeout(1000)`.

3. **Autenticação dos Perfis:**
   - Verifique se há sessão ativa. Caso não haja, efetue login com as credenciais padrão do ambiente:
     - Administrador / SST: `admin@engenharq.com`
     - Operador Almoxarifado: `almoxarifado@engenharq.com`

---

## 📱💻 FASE 1: MATRIZ DE RESPONSIVIDADE (2 VIEWPORTS)

Todos os testes de navegação devem ser executados e comparados em duas configurações de tela:
1. **Desktop:** `1280 x 800`
2. **Mobile:** `390 x 844` (Emulação de smartphone em canteiro)

### Inspeção Automática Obrigatória em Cada Rota (Mobile & Desktop):
- **Overflow Horizontal:** Execute via JavaScript na página:
  ```javascript
  const overflow = document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth;
  const delta = document.documentElement.scrollWidth - window.innerWidth;
  return { hasOverflow: overflow, deltaPx: delta, scrollWidth: document.documentElement.scrollWidth, clientWidth: window.innerWidth };
  ```
  Se `hasOverflow === true`, catalogar imediatamente como bug de layout responsivo com o valor de `deltaPx`.
- **Backdrop & Z-Index Trapping:** Verificar se o menu hamburguer ou botões do Header são interceptados por backdrops invisíveis ou drawers com `z-index` desalinhado.
- **Console & Network Listeners:** Monitorar ativamente:
  - `page.on('console', msg => ...)` -> Capturar erros `error` ou warnings críticos.
  - `page.on('pageerror', err => ...)` -> Exceções não tratadas de React.
  - `page.on('response', res => ...)` -> Erros `4xx`, `5xx` ou `net::ERR_ADDRESS_UNREACHABLE`.

---

## 🧪 FASE 2: ROTEIRO EXAUSTIVO DE TESTES MÓDULO A MÓDULO

Percorra rigorosamente cada uma das 14 abas + Painel KDS, interagindo com os principais elementos:

### 1. Dashboard Central (`/`)
- Carregamento dos 12 cards de KPIs (EPIs em Uso, Estoque Crítico, ASOs a vencer, etc.).
- Gráficos Recharts (Distribuição por categoria NR-6 e Histórico semestral de entregas).
- Painel de Alertas de Reposição e últimas transações em tempo real.

### 2. Estoque NR-6 (`/assets`)
- Alternância entre abas: "Catálogo Técnico" e "EPIs em Uso no Canteiro".
- Filtro de busca textual em tempo real e filtros de categorias (Cabeça, Olhos, Auditiva, etc.).
- Semáforo de validade do CA (Certificado de Aprovação) com contagem regressiva de dias.
- Teste do modal `+ Cadastrar Novo EPI`: validação de campos obrigatórios, lote inicial e fechamento.

### 3. Colaboradores (`/workers` e `/workers/:id`)
- Tabela de colaboradores com busca, filtros por cargo e status ativo/inativo.
- **Validação Algorítmica de CPF:** Testar CPF com dígitos repetidos (ex: `111.111.111-11`) ou dígitos verificadores errados e confirmar se o sistema bloqueia.
- Navegação para a ficha individual (`/workers/:id`): checagem de abas (EPIs Ativos, Histórico de Entregas, Treinamentos e ASOs).

### 4. Empresa e Obras (`/sites`)
- Abas "Dados da Empresa" e "Obras / Canteiros".
- Sanitização de campos: testar campo "Código da Obra" para garantir remoção de caracteres inválidos.
- Modal `+ Nova Obra` e validação de cards de canteiro (garantir ausência de imagens quebradas).

### 5. Balcão Express / Almoxarifado (`/scanner`)
- Modo de Entrada Manual (busca de trabalhador por CPF ou Matrícula).
- **Regra de Ouro NR-6 (Estoque Zero):** Confirmar que itens sem saldo físico em estoque aparecem desabilitados e impedem a seleção/entrega.
- **Coleta de Assinatura Digital:** Tentar submeter sem desenhar no canvas (deve bloquear exigindo assinatura). Desenhar assinatura e confirmar entrega.
- Validação do feedback visual: decremento automático de saldo e mensagem de conformidade jurídica.

### 6. Mapa de Ativos Geoespacial (`/map`)
- Carregamento da engine Leaflet (`MapEngine: ACTIVE`).
- Renderização de canteiros e clusters de localização.
- Abertura e submissão do modal "Alocar EPI / Registrar Entrega": conferência de dropdowns de obras, trabalhadores e produtos.

### 7. Central de Operações (`/operations`)
- Navegação entre as 4 sub-abas: `Entregas`, `Devoluções`, `Extravios`, `Transferências`.
- Filtros por período, obra e tipo de equipamento.
- Teste de abertura de detalhes de comprovante ou modal de devolução rápida.

### 8. Treinamentos e Normas Regulamentadoras (`/trainings`)
- Abas "Histórico de Treinamentos" e "Catálogo de Cursos (NR-10, NR-35, NR-6, etc.)".
- Status de validade (Válido, A Vencer, Vencido).
- Modal de registro de novo treinamento com upload de certificado.

### 9. Controle de Saúde Ocupacional (`/aso`)
- Tabela de Atestados de Saúde Ocupacional (Admissional, Periódico, Demissional, Retorno).
- Alertas preditivos de exames com validade próxima (< 30 dias).
- Modal de novo ASO com seleção de médico emitente e aptidão (Apto / Inapto).

### 10. Central de Relatórios Gerenciais (`/reports`)
- Exibição dos 8 cards de relatórios oficiais (Relatório CLT 462, Ficha NR-6, Custos por Centro de Custo, Desgaste Médio, etc.).
- Abertura de modal de visualização prévia e acionamento de exportação (.PDF e .XLSX).

### 11. Ficha de EPI Digital (`/ficha-epi`)
- Seleção de colaborador via dropdown.
- Renderização da Ficha Individual de EPI em conformidade estrita com o Art. 166 da CLT e Portaria MTE 672/2021.
- Teste do layout de impressão (`@media print`): botão "Imprimir Ficha" abre diálogo sem quebras visuais.

### 12. Gerador de Etiquetas QR Code (`/tags`)
- Alternância entre abas: "Crachás de Identificação" e "Etiquetas Técnicas de Equipamentos".
- Renderização correta dos QR Codes em vetor SVG.
- Seleção em lote de itens e botão de impressão de cartelas de etiquetas.

### 13. Configurações do Sistema & RBAC (`/settings`)
- Abas "Usuários & Permissões" e "Regras Gerais".
- Formulários com validação Zod (edição de perfil, troca de senha e níveis de acesso Admin/SST/Almoxarifado).

### 14. Trilha de Auditoria e Rastreabilidade (`/audit`)
- Tabela imutável de logs de auditoria (Data/Hora, Operador, Ação, Entidade, IP).
- Paginação e filtros por tipo de evento.
- Modal de inspeção detalhada do payload JSON da transação.

### 15. Painel Fast-Food KDS (`/almoxarifado-kds`)
- **Aba 1 (Telão TV Ao Vivo):** Tela cheia, contraste elevado, colunas "Em Separação" vs "Entregues Recentemente", SLA com semáforo de tempo, modal `+ Nova Solicitação`.
- **Aba 2 (Histórico com Data e Hora):** Cálculo de SLA, visualização de rubrica coletada, comprovante térmico não-fiscal (80mm) e exportação Excel.
- **Aba 3 (Extrato Kardex):** Livro-razão de movimentações físicas (`ENTRADA`, `SAIDA_ENTREGA`, `DEVOLUCAO`) com contadores consolidados.

---

## 🔒 FASE 3: AUDITORIA DE PERFIS E SEGURANÇA (RBAC)

1. **Acesso com `almoxarifado@engenharq.com`:**
   - Deve ter acesso livre e fluido a: `/almoxarifado-kds`, `/scanner`, `/assets`, `/operations`.
   - **Guarda de Rotas:** Tentativas de acessar rotas administrativas (`/workers`, `/aso`, `/trainings`, `/settings`, `/audit`, `/reports`) DEVEM ser bloqueadas ou redirecionadas com segurança por `AlmoxarifadoRestrictedRoute`.
2. **Acesso com `admin@engenharq.com`:**
   - Deve ter acesso irrestrito a todos os 15 módulos sem qualquer barreira de permissão.

---

## 📊 FASE 4: CRITÉRIOS DE ACEITE E CLASSIFICAÇÃO DE BUGS

Todos os problemas encontrados devem ser classificados pela matriz de severidade:
- **P0 (Crítico):** Impede fluxo operacional básico (ex: crash da página, tela branca, bloqueio de clique no mobile, falha em registrar entrega de EPI).
- **P1 (Alto):** Quebra visual que compromete a usabilidade (ex: overflow horizontal > 20px no mobile, tabela inacessível, formulário que não valida corretamente).
- **P2 (Médio):** Erros de console silenciosos, links quebrados de imagens (`ERR_...`), falta de estado de carregamento ou feedback visual (Toasts).
- **P3 (Baixo):** Melhorias de polimento cosmético, alinhamento de espaçamento, estado inicial de accordions ou micro-interações.

---

## 📝 FASE 5: DOCUMENTAÇÃO OBRIGATÓRIA NO OBSIDIAN SECOND BRAIN

> **REGRA ABSOLUTA DO SISTEMA:** Todo relatório de testes deve ser obrigatoriamente persistido no cofre Obsidian do projeto.

1. **Criar Nota de Relatório:**
   - **Caminho:** `/Users/arthurdemoraespd/Documents/obsidian/second brain/EngenharQ OS/09 - 🧪 Testes e Qualidade/Relatório Master QA E2E - [Mês Ano].md`
   - **Estrutura da Nota:**
     - Frontmatter YAML com aliases, tags (`qa`, `e2e`, `playwright`, `nr6`, `testes`), data e autor.
     - Resumo executivo com Scorecard de Qualidade (0 a 100).
     - Matriz de testes (Desktop vs Mobile) com status PASS/WARN/FAIL para cada um dos 15 módulos.
     - Inventário detalhado de bugs (Título, Severidade, Arquivo, Passos para Reproduzir, Causa Raiz e Solução Proposta).
     - Seções de conformidade jurídica (NR-6, CLT) e segurança transacional (Supabase RPCs).
2. **Atualizar MOC:**
   - Adicionar o wikilink `[[Relatório Master QA E2E - [Mês Ano] ]]` no topo da seção de auditorias do arquivo:
     `/Users/arthurdemoraespd/Documents/obsidian/second brain/EngenharQ OS/09 - 🧪 Testes e Qualidade/MOC - Testes e Validações.md`

---

## 🏁 ENTREGÁVEL FINAL NA CONVERSA

Apresente um relatório conciso, elegante e altamente estruturado no chat contendo:
1. **Resumo Executivo** dos resultados e status dos serviços locais.
2. **Tabela Resumo dos 15 Módulos** com status Desktop e Mobile.
3. **Lista de Bugs Catalogados** com severidade, arquivo de origem e impacto.
4. **Scorecard de Qualidade Geral** (0 a 100).
5. **Confirmação da Gravação no Obsidian** com caminhos absolutos e links.
```
