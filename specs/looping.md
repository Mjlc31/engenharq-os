# Especificação Técnica: Painel Fast-Food (KDS) & Perfil Restrito do Almoxarifado

## 1. Visão Geral e Contexto de Negócio
No canteiro de obras, a agilidade na entrega de Equipamentos de Proteção Individual (EPIs) é crucial para evitar filas de trabalhadores parados no início do turno ou após intervalos. Para modernizar e organizar esse fluxo, o EngenharQ OS introduz o **Painel Fast-Food de Almoxarifado (Kitchen Display System - KDS)** para espelhamento em Smart TVs no canteiro, aliado a um **Perfil de Acesso Restrito (RBAC)** focado unicamente no cotidiano do operador de almoxarifado (estoque, entrada/saída e entregas).

---

## 2. Histórias de Usuário (User Stories) & Critérios de Aceite

### US-01: Controle de Acesso Restrito (Perfil Almoxarifado)
- **Como** Operador de Almoxarifado / Estoquista,
- **Quero** acessar um painel dedicado e sem distrações ou dados confidenciais de outras áreas,
- **Para que** eu possa focar 100% no controle de estoque, recepção de materiais e entrega de EPIs.
- **Critérios de Aceite:**
  1. Usuário com cargo/role `ALMOXARIFADO` ou função "Almoxarife" visualiza **apenas** os itens de menu permitidos:
     - 📺 **Painel TV Fast Food** (`/almoxarifado-kds`)
     - ⚡ **Balcão Express** (`/scanner`)
     - 📦 **Estoque & Catálogo** (`/assets`)
     - 📋 **Operações & Entregas** (`/operations`)
  2. Menus confidenciais/gerenciais (`Dashboard Geral`, `ASO / Exames`, `Treinamentos NR`, `Usuários`, `Auditoria`) ficam ocultos no menu e com redirecionamento de segurança em rotas diretas.
  3. Usuários administradores (`ADMIN`) e engenheiros continuam tendo acesso completo ao sistema, incluindo o novo Painel TV.

### US-02: Painel TV Fast-Food (KDS Almoxarifado)
- **Como** Trabalhador do canteiro e Almoxarife,
- **Quero** visualizar uma tela dividida estilo restaurante fast food exibindo pedidos em separação e pedidos entregues,
- **Para que** todos saibam exatamente a ordem de atendimento, o tempo de espera e a confirmação de recebimento.
- **Critérios de Aceite:**
  1. **Coluna Esquerda (Em Separação / Fila):**
     - Horário exato da solicitação (ex: `07:14`).
     - Nome completo do colaborador, função/cargo, foto/avatar e matrícula.
     - Lista dos EPIs solicitados com quantidades, tamanhos e CA.
     - Contador de tempo corrido (SLA visual: verde < 3m, amarelo 3-5m, vermelho > 5m).
     - Botão de ação rápida para o operador: "Entregar / Finalizar".
  2. **Coluna Direita (Entregues Recentemente / Prontos):**
     - Horário exato da entrega (ex: `07:18`).
     - Nome do colaborador que retirou.
     - Itens entregues e confirmação do recebimento (badge com assinatura digital coletada ou foto).
     - Cards mais recentes no topo, mantendo histórico recente do turno.
  3. **Visual TV / Canteiro:**
     - Layout dark de alto contraste, tipografia grande e legível a mais de 4 metros de distância.
     - Modo Tela Cheia (Fullscreen toggle) no topo para exibição em Smart TV sem barras de navegador.
     - Alerta Sonoro opcional (beep/chime via Web Audio API) com botão de Mute/Ativar Som.

### US-03: Lançamento Rápido no Balcão Presencial
- **Como** Almoxarife operando o balcão,
- **Quero** lançar uma solicitação ou entrega em segundos na mão,
- **Para que** a fila física no canteiro ande rápido.
- **Critérios de Aceite:**
  1. Botão destacado "+ Nova Solicitação" diretamente na barra de controle do KDS (abre modal de lançamento rápido sem precisar sair da TV) ou fluxo direto no Balcão Express.
  2. Busca instantânea por nome ou matrícula do colaborador.
  3. Seleção dos EPIs disponíveis em estoque na obra ativa.
  4. Ao clicar em "Entregar", exibe coleta rápida de assinatura digital (touch/mouse) ou confirmação de entrega com comprovante.
  5. Atualização imediata do estoque (subtração das unidades da obra) e migração em tempo real do card para a coluna de "Entregues".

---

## 3. Mockup e Arquitetura Visual (Wireframe)

```
+-------------------------------------------------------------------------------------------------------------+
|  [Logo EngenharQ]  PAINEL DE ATENDIMENTO - ALMOXARIFADO | Obra: Residencial Parque Sul | 14:32:05 | [🔊 Bip] [⛶ TV] |
+----------------------------------------------------------------------+--------------------------------------+
|  🕒 EM SEPARAÇÃO / AGUARDANDO (3)                                    |  ✅ ENTREGUES RECENTEMENTE (Últimos)  |
+----------------------------------------------------------------------+--------------------------------------+
|  +----------------------------------------------------------------+  | +----------------------------------+ |
|  | PEDIDO #1042 • Solicitado às 14:28 (⏱️ 04:12 - Amarelo)         |  | | PEDIDO #1041 • Entregue às 14:26 | |
|  | 👤 Carlos Silva - Pedreiro (Matrícula: 10482)                  |  | | 👤 Marcos Pereira - Armador      | |
|  | 📦 1x Capacete de Segurança c/ Jugular (Branco)                 |  | | 📦 1x Luva de Vaqueta (Tam: G)   | |
|  | 📦 1x Luva de Vaqueta Mista (Tam: M)                            |  | | 📦 1x Óculos de Proteção Cinza   | |
|  | -------------------------------------------------------------  |  | | ✍️ Assinatura Confirmada [Ver]   | |
|  | [📦 Em Separação]              [🚀 ENTREGAR AGORA (Assinar)]    |  | +----------------------------------+ |
|  +----------------------------------------------------------------+  | +----------------------------------+ |
|  | PEDIDO #1043 • Solicitado às 14:30 (⏱️ 02:05 - Verde)           |  | | PEDIDO #1040 • Entregue às 14:15 | |
|  | 👤 João Batista - Carpinteiro (Matrícula: 10499)               |  | | 👤 José Roberto - Eletricista    | |
|  | 📦 1x Protetor Auricular Tipo Concha                            |  | | 📦 1x Bota Nobuck Eletricista 42 | |
|  | -------------------------------------------------------------  |  | | 📸 Biometria Facial [Validada]   | |
|  | [📦 Em Separação]              [🚀 ENTREGAR AGORA (Assinar)]    |  | +----------------------------------+ |
+----------------------------------------------------------------------+--------------------------------------+
|  [⚡ Balcão Rápido: + Nova Retirada]   [Filtro: Todos | Urgentes]             Status: Online (Sincronizado) |
+-------------------------------------------------------------------------------------------------------------+
```

---

## 4. Divisão de Escopo (Prioridades)

### P0 (Must Have - Essencial para Entrega)
- [x] Rota e Componente do Painel TV KDS Fast Food (`/almoxarifado-kds`).
- [x] Visual em 2 Colunas: **Em Separação / Fila** (Esquerda) e **Entregues / Retiradas** (Direita).
- [x] Cards com horário do pedido, dados do trabalhador, itens/EPIs, e tempo decorrido com código de cores (SLA).
- [x] Cards de entregues com horário de despacho, recebedor e indicador de comprovação (assinatura/biometria).
- [x] Botão e controle de Modo Tela Cheia (Fullscreen TV mode) de alto contraste.
- [x] Modal de Ação Rápida de Atendimento/Entrega com coleta de assinatura digital ou confirmação direta.
- [x] Perfil RBAC de Almoxarifado:
  - Restrição de navegação na Sidebar (`Layout.tsx`).
  - Proteção de rotas no `App.tsx` para garantir que usuários restritos não acessem telas administrativas.
  - Seleção do papel "Almoxarifado" no cadastro/gestão de usuários.

### P1 (Should Have - Alta Relevância Operacional)
- [x] Alerta sonoro sutil (Chime Web Audio API) configurável (com botão Mute na barra superior).
- [x] Botão de atalho rápido "+ Novo Pedido Balcão" no topo do KDS com seleção rápida de colaborador e EPIs.
- [x] Sincronização automática com a tabela de movimentações e estoque por obra.

### P2 (Nice to Have)
- [ ] Filtro por obra diretamente no KDS caso o usuário tenha acesso a múltiplos canteiros.
- [ ] Animações suaves de transição (Framer Motion / CSS transition) na movimentação dos cards.

---

## 5. Critérios de Pronto (Definition of Done - DoD)
1. **Funcionalidade:**
   - O operador consegue cadastrar/lançar um pedido de EPI no balcão e ele aparece imediatamente na coluna da esquerda com horário e cronômetro.
   - O operador clica para entregar, colhe a assinatura e o pedido passa para a coluna da direita com o carimbo do horário de entrega e status do comprovante.
   - O estoque da respectiva obra é baixado corretamente.
2. **Segurança & RBAC:**
   - Ao logar com perfil `ALMOXARIFADO`, a barra de navegação exibe apenas TV Almoxarifado, Balcão Express, Estoque e Operações. Tentativas de acessar `/settings`, `/aso`, `/trainings` são bloqueadas.
3. **Qualidade de Código & Testes:**
   - `npm run build` e `npx tsc --noEmit` executam com 0 erros.
   - Validação E2E com Playwright MCP no navegador navegando pelo KDS, simulando tela de TV e troca de estados.
4. **Documentação:**
   - Registro arquitetural e de changelog no Obsidian Second Brain em `/Users/arthurdemoraespd/Documents/obsidian/second brain/EngenharQ OS`.
   - Sincronização dos arquivos entre os diretórios `Documents` e `Downloads`.

---

## 6. Considerações Técnicas
- **Frontend Framework:** React 19 + TypeScript + Tailwind CSS + Lucide Icons.
- **Audio:** Web Audio API sintético (não depende de arquivos externos de áudio `.mp3`, evitando erros de rede ou CORS).
- **Fullscreen:** `document.documentElement.requestFullscreen()` com tratamento seguro para navegadores de Smart TV.
- **Armazenamento:** Supabase (tabelas `epi_movements`, `workers`, `epis`, `construction_sites`, `users`).
