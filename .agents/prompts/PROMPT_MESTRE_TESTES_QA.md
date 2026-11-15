# 🧭 PROMPT MESTRE DE TESTES GERAIS E QA E2E — ENGENHARQ OS (v2 · 15/11/2026)

> **Instruções de Uso para o Usuário:**
> Copie e cole o bloco abaixo na conversa com a IA sempre que quiser rodar uma bateria de testes no **EngenharQ OS**.
> Ajuste as 6 linhas de `[CONFIGURACAO_DE_EXECUCAO]` antes de colar. O resto não precisa mexer.
>
> **O que mudou da v1 para a v2:** regra de não gravar em produção, medição de overflow corrigida, roteiro alinhado às telas atuais (4 abas no KDS, 6 em Operações, materiais e ferramentas no estoque), fase nova de conferência tela × banco, fase nova de processos ponta a ponta, lista de regressão, nota calculada por fórmula e comparação com o relatório anterior.

---

````markdown
# 🚀 PROTOCOLO MASTER DE TESTES E HOMOLOGAÇÃO E2E — ENGENHARQ OS (v2)

[CONFIGURACAO_DE_EXECUCAO]
MODO: AUDITORIA_ESTRITA <!-- AUDITORIA_ESTRITA (só analisar e relatar) | AUDITORIA_E_CORRECAO (corrigir P0/P1, re-testar e commitar) -->
ESCOPO: COMPLETO <!-- COMPLETO | REGRESSAO (só a lista da Fase 6 + o que mudou desde o último relatório) | lista de rotas, ex.: /scanner,/almoxarifado-kds -->
VIEWPORTS: DESKTOP_E_MOBILE <!-- Desktop 1280x800 e Mobile 390x844 -->
PERFIS_AUTH: ADMIN_E_ALMOXARIFADO <!-- admin@engenharq.com e almoxarifado@engenharq.com -->
BANCO: PRODUCAO_SOMENTE_LEITURA <!-- PRODUCAO_SOMENTE_LEITURA | ESCRITA_AUTORIZADA (só se eu escrever isso aqui; mesmo assim, apenas dados marcados "QA-TESTE" e estornados no fim) -->
REGISTRO_OBSIDIAN: OBRIGATORIO

## 🎯 PAPEL E OBJETIVO
Você é o Lead QA do EngenharQ OS. Rode uma bateria de ponta a ponta em todas as rotas do sistema e entregue um relatório que responda a três perguntas, nesta ordem:
1. **O que o sistema mostra bate com o que está no banco?** (integridade)
2. **O processo da obra funciona do começo ao fim e segura os erros de operação?** (processo e conformidade NR-6 / CLT 462)
3. **A tela funciona em desktop e celular, sem erro de console ou de rede?** (interface)

Teste com três olhares: o **Auditor Fiscal / Engenheiro SST** (CA, assinatura, ficha, rastro de quem fez o quê), o **Almoxarife** (rapidez no balcão, telão, cupom) e o **QA** (console, rede, layout, permissões).

## ⛔ REGRAS DE OURO (valem mais que qualquer passo abaixo)
1. **O ambiente local aponta para o banco de PRODUÇÃO.** Com `BANCO: PRODUCAO_SOMENTE_LEITURA`, não confirme nenhuma ação que grave: valide cada formulário até o bloqueio no cliente ou até o último clique antes de salvar, e pare. Regras do banco (triggers, RPCs, RLS) são testadas por SQL dentro de um bloco `DO $$ ... RAISE EXCEPTION 'ROLLBACK_TESTE ...' $$`, que desfaz tudo.
2. **Só o MCP `supabase_engenharq`** (ref `ozsmevkqcytrtpnpoekp`). Nunca o MCP do Quark nem conector genérico. Nunca `DELETE` físico.
3. **Login é do Arthur.** Não digite senha: confira se há sessão ativa; se não houver, peça que ele faça login na aba e continue. Para o segundo perfil, abra uma aba com contexto isolado (`isolatedContext`) e peça o login nela.
4. **Não mate processos nas portas 5173/5174** (o Quark divide a 5173). Use a config `vite-qa` de `.claude/launch.json` (porta **5180**) e confira o servidor de novo a cada rodada, porque ele cai entre turnos.
5. **Nunca `waitUntil: 'networkidle'`** (o Realtime do Supabase mantém o socket aberto). Use `domcontentloaded` + `waitForSelector` de um elemento da tela.
6. **Sem evidência, não é achado.** Todo bug leva: rota, viewport, perfil, passos, esperado × obtido, e a prova (valor medido, mensagem de console, resposta de rede, resultado do SQL ou `arquivo:linha`). Hipótese não confirmada entra em "A investigar", separada dos bugs.
7. **O que não foi testado aparece como `NÃO TESTADO` com o motivo.** Nunca marque PASS por dedução.
8. **Confirme a causa antes de afirmar o impacto.** Ex.: antes de dizer que uma ação "duplica estoque", leia o trigger ou a RPC envolvida.

## 🛠️ SKILLS E SUBAGENTES
- Carregue, se existirem no ambiente: `/qa-test-planner`, `/systematic-debugging`, `/product-process-navigator`, `/code-reviewer`. As skills do projeto ficam em `.agents/skills/` (`react-quality-assurance`, `frontend-performance-tuner`).
- Subagentes (`engenharq-qa-tester`, `engenharq-code-revisor`, `engenharq-senior-fullstack`) são opcionais: use se estiverem disponíveis; se não, faça você mesmo e siga. A falta deles não bloqueia a bateria.

## ⚙️ FASE 0 — PREPARAÇÃO
1. **Linha de base do código:** `git status`, `git log --oneline -10`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Anote erros e a contagem de warnings (para comparar com a rodada anterior).
2. **Memória da última rodada:** leia o relatório mais recente em `09 - 🧪 Testes e Qualidade/` e o backlog de `Auditoria Aba por Aba e Processos - 10 Nov 2026`. Monte a lista: bugs abertos, bugs marcados como corrigidos (entram na Fase 6) e arquivos alterados desde então (`git diff --stat <commit do último relatório>..HEAD`), que recebem teste mais fundo.
3. **Mapa real das rotas:** leia `src/App.tsx` e `src/components/Layout.tsx` e teste **o que existe lá**, não só a lista deste prompt. Rota ou aba nova entra no roteiro; item deste prompt que não existe mais é registrado como "removido".
4. **Servidor:** suba `vite-qa` (5180) e confirme HTTP 200.
5. **Sessão:** confirme admin logado; prepare a aba isolada do almoxarife.
6. **Escutas ligadas antes do primeiro clique:** `console` (error e warning), `pageerror` e `response` (4xx, 5xx, `net::ERR_*`). Registre a rota em que cada erro apareceu.

## 📱💻 FASE 1 — CHECAGEM AUTOMÁTICA EM CADA ROTA (2 viewports)
Rode em cada rota, em 1280x800 e 390x844, e também **com cada modal ou drawer aberto**:

```javascript
// html e body têm overflow-x hidden: medir no <main> e achar o elemento culpado
const main = document.querySelector('main') ?? document.body;
const delta = main.scrollWidth - main.clientWidth;
const vw = window.innerWidth;
const culpados = [...main.querySelectorAll('*')]
  .filter(el => el.getBoundingClientRect().right > vw + 1)
  .slice(0, 5)
  .map(el => `${el.tagName}.${String(el.className).slice(0, 60)}`);
const alvosPequenos = [...document.querySelectorAll('button, a, [role=button], input, select')]
  .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.width < 32 || r.height < 32); }).length;
({ deltaPx: delta, culpados, alvosPequenos });
```

- `deltaPx > 0` é bug de layout: informe o valor e o elemento culpado.
- **Modais e drawer:** abre, fecha no X, fecha no Esc, fecha no clique fora, não deixa backdrop preso, o foco volta, o conteúdo rola dentro do modal no celular e o botão de confirmar fica alcançável.
- **Estados de tela:** carregando (skeleton), vazio (mensagem útil, não tabela em branco) e erro (mensagem legível, não tela branca).
- **Proibidos:** `window.alert` / `window.confirm` (deve ser modal + toast) e data exibida um dia a menos (`new Date('AAAA-MM-DD')` lido como UTC).

## 🧪 FASE 2 — ROTEIRO POR MÓDULO
Em cada módulo: faça o inventário dos controles (botões, filtros, abas, ações por linha), clique em **todos** e anote o que cada um dispara. Além disso, confira os pontos abaixo.

1. **Dashboard (`/`)** — cards "Exige ação" levam à tela certa já filtrada; KPIs, gráficos, alertas preditivos, últimas entregas e o **widget do Almoxarifado**; cada número confere com o banco (Fase 3).
2. **Estoque & Materiais (`/assets`)** — abas de catálogo, estoque por obra e EPIs em uso; busca e filtros (situação, categoria, obra, **tipo: EPI / MATERIAL / FERRAMENTA**); cadastro: EPI exige CA e validade, material e ferramenta não exigem CA e usam **unidade** própria; semáforo do CA; ações por linha (Entrada, Ajustar saldo, Descarte, Editar, Excluir); excluir item com saldo ou em uso mostra o motivo do bloqueio.
3. **Colaboradores (`/workers`, `/workers/:id`)** — busca, filtros, paginação; CPF inválido (`111.111.111-11`, dígito errado) é barrado no cadastro e na importação CSV; CPF e matrícula duplicados entre ativos dão aviso legível; prontuário com todas as abas; UUID inexistente na URL mostra "não encontrado", não tela quebrada; excluir ou desligar quem tem EPI mostra a mensagem do banco.
4. **Empresa / Obras (`/sites`)** — dados da empresa; nova obra; código da obra sanitizado; **editar uma obra não apaga latitude/longitude**; sem imagem quebrada.
5. **Almoxarifado Scan (`/scanner`)** — busca por CPF com e sem pontuação e por matrícula; item sem saldo fica desabilitado; item excluído ou inativo não aparece; pedido exige obra; entrega sem assinatura é barrada; erro de câmera ou de rede aparece legível.
6. **Mapa (`/map`)** — mapa carrega, clusters, filtro de categoria, painel da obra; "Alocar EPI" leva ao `/scanner` (não há mais modal de entrega direta); obra sem coordenada é listada como dado faltante.
7. **Operações (`/operations`)** — as **6 abas**: Entregas, Transferências por Obra, Devoluções, Substituições, Extravios, Estoque. Cautela estornada não aparece em nenhuma; devolução, substituição e extravio pedem assinatura; data de entrega futura ou muito antiga é sinalizada; transferência não deixa enviar mais que o saldo da obra de origem.
8. **Treinamentos (`/trainings`)** — histórico e catálogo de cursos; status Válido / A vencer / Vencido confere com as datas; registro com certificado.
9. **ASO (`/aso`)** — tipos de exame, alerta de vencimento (< 30 dias), novo ASO com médico e aptidão.
10. **Relatórios (`/reports`)** — abra **cada** card, confira a contagem de linhas com o banco, aplique filtros de obra, setor e período, e gere PDF e XLSX (conteúdo não vazio, sem excluídos nem estornados; o de Extravios lê `condition_on_return = 'LOST'`).
11. **Ficha de EPI (`/ficha-epi`)** — escolha um colaborador com histórico: só cautelas válidas, CA e data de cada item, assinatura; PDF gerado; layout de impressão sem corte.
12. **Etiquetas (`/tags`)** — crachás e etiquetas; QR em SVG; só cadastros ativos; seleção em lote e impressão.
13. **Configurações (`/settings`)** — usuários e papéis, regras gerais, validações dos formulários.
14. **Auditoria (`/audit`)** — toda ação sensível aparece com data, operador e entidade; filtros, paginação e detalhe do registro; estornos aparecem aqui (e só aqui).
15. **Painel KDS (`/almoxarifado-kds`)** — as **4 abas**: Telão ao vivo (fila × entregues, cores do SLA: verde < 3 min, amarelo 3-5, vermelho > 5; tela cheia; nova solicitação sem item zerado; entrega exige assinatura), Histórico (tempo, assinatura, cupom 80 mm, estorno com justificativa), Kardex (filtros de tipo e obra, exportar Excel, Subir Estoque) e **Indicadores**.
16. **Telão TV (`/kds/tv`)** — abre em tela cheia, legível a distância, atualiza sozinho quando um pedido muda.
17. **Rotas de borda** — `/login` (já logado redireciona), rota inexistente (página 404 do sistema), `/print-tags`.

## 🗄️ FASE 3 — TELA × BANCO (somente leitura)
Confira antes os nomes reais com `list_tables` (o banco diverge dos arquivos de migration). Para cada número exibido em Dashboard, Estoque, Relatórios, Etiquetas e Ficha, rode a contagem equivalente e compare. Divergência é no mínimo P1.

Checagens fixas de saúde dos dados (o esperado é zero linhas em todas):
```sql
-- 1. Kardex não fecha com o saldo da obra
select s.site_id, s.catalog_id, s.quantity, coalesce(sum(t.quantity_change),0) kardex
from site_inventory s left join inventory_transactions t using (site_id, catalog_id)
group by 1,2,3 having s.quantity <> coalesce(sum(t.quantity_change),0);
-- 2. Saldo negativo
select * from site_inventory where quantity < 0;
-- 3. Cautela ativa de colaborador ou item excluído
select a.id from epi_assignments a join workers w on w.id=a.worker_id join epi_catalog c on c.id=a.catalog_id
where a.lifecycle_status='ATIVA' and (w.deleted_at is not null or c.deleted_at is not null);
-- 4. Saldo parado em item excluído
select c.name, sum(s.quantity) from site_inventory s join epi_catalog c on c.id=s.catalog_id
where c.deleted_at is not null group by 1 having sum(s.quantity) > 0;
-- 5. Cautela ativa sem evidência de entrega (NR-6): nem assinatura nem selfie
select id from epi_assignments where lifecycle_status='ATIVA' and digital_signature_url is null and audit_selfie_url is null;
-- 6. EPI ativo sem CA ou com CA vencido
select name, ca_number, ca_validity from epi_catalog
where deleted_at is null and item_type='EPI' and (ca_number is null or ca_validity < current_date);
-- 7. Pedido entregue sem assinatura ou sem quem entregou
select order_number from almoxarifado_orders where status='DELIVERED' and (signature_url is null or delivered_by is null);
-- 8. Travas do banco continuam instaladas (esperado: 2 linhas)
select tgname from pg_trigger where tgname in ('trg_guard_catalog_delete','trg_guard_worker_exit');
```
Rode também `get_advisors` (segurança e performance) e liste o que for novo em relação à rodada anterior.

## 🔗 FASE 4 — PROCESSOS PONTA A PONTA
Siga cada cadeia como o usuário faria. Em somente leitura: escolha um registro real que já passou pela cadeia e confira o rastro dele em todas as telas e tabelas; as regras de bloqueio são testadas por SQL com rollback.

| Cadeia | O que tem de ser verdade no fim |
| :--- | :--- |
| **Entrada de estoque → saldo → Kardex** | o saldo da obra sobe e existe um lançamento de entrada com o mesmo valor |
| **Pedido no balcão → fila do telão → entrega assinada** | saldo desce, nasce a cautela com assinatura, Kardex ganha a saída, o pedido vai para "Entregues", a ficha do colaborador mostra o item |
| **Estorno de entrega** | saldo volta, a cautela vira ESTORNADA e some das telas operacionais, o Kardex ganha o estorno, a Auditoria registra quem e por quê |
| **Devolução / Substituição / Extravio** | devolução em bom estado credita estoque; avariada e extraviada não creditam; extravio aparece no relatório de Extravios |
| **Transferência entre obras** | sai de uma obra e entra na outra pelo mesmo valor, com dois lançamentos no Kardex |
| **Desligamento de colaborador** | bloqueado enquanto houver EPI em posse; liberado depois de devolução ou extravio |
| **Exclusão de item do catálogo** | bloqueada com saldo ou em uso; depois de excluído, some de Scanner, Operações, Relatórios e Etiquetas |

Testes de regra no banco (sempre com rollback): entrega acima do saldo, entrega do mesmo pedido duas vezes, estorno de pedido já estornado, e as duas travas de exclusão.

## 🔒 FASE 5 — PERFIS E SEGURANÇA
1. **Almoxarife:** entra em `/almoxarifado-kds`, `/scanner`, `/assets`, `/operations`. Digite **direto na barra de endereço** cada rota de gestão (`/`, `/workers`, `/workers/<id>`, `/sites`, `/map`, `/trainings`, `/aso`, `/reports`, `/ficha-epi`, `/tags`, `/audit`, `/settings`): todas redirecionam, sem piscar o conteúdo protegido. O menu só mostra o grupo "Módulo Almoxarifado".
2. **Admin:** todas as rotas abrem.
3. **Papel nulo ou desconhecido:** o acesso é negado por padrão (ler `RoleRoute` em `App.tsx` e `effectiveRole` em `rbacService.ts`).
4. **No banco, não só na tela:** em bloco com rollback, `SET LOCAL ROLE anon` e depois `authenticated` com o `request.jwt.claims` de um almoxarife; tente ler `workers`, `audit`/logs e `users` e tente gravar em `site_inventory` direto (sem RPC). O que passar e não deveria é **P0**.
5. **Sessão:** sem login, qualquer rota leva a `/login`; sair limpa a sessão.

## ♻️ FASE 6 — REGRESSÃO (bugs já corrigidos que não podem voltar)
Re-teste um por um e marque `OK` ou `VOLTOU`:
- Rotas de gestão fechadas para o almoxarife e papel nulo negado.
- Entrega no KDS e no Scanner exige assinatura.
- Mapa não tem mais entrega direta.
- Importação CSV valida CPF.
- EPI novo exige CA e validade.
- Scanner não oferece item excluído ou inativo; busca de CPF com ou sem pontuação; pedido exige obra.
- Cautela estornada fora de Operações, Ficha, Prontuário, Mapa, Relatórios; cadastro excluído fora de Relatórios e Etiquetas.
- Extravio grava `LOST` e aparece no relatório de Extravios.
- Excluir EPI e colaborador mostra o motivo real do bloqueio.
- Perfil do colaborador salva e mostra o erro real quando falha.
- Overflow do KDS e do Catálogo no celular.

Acrescente a esta lista os bugs corrigidos que constarem no último relatório do Obsidian.

## 📊 FASE 7 — SEVERIDADE E NOTA
- **P0:** perda ou corrupção de dado, estoque errado, furo de permissão, entrega sem evidência legal (assinatura, CA), tela branca ou fluxo principal travado.
- **P1:** número da tela diferente do banco, documento legal errado (ficha, relatório), validação que deixa passar dado inválido, tela inutilizável no celular.
- **P2:** erro de console ou de rede sem efeito visível, falta de carregamento / vazio / toast, overflow pequeno, mensagem de erro genérica.
- **P3:** acabamento visual, texto, atalho, melhoria de fluxo.

**Nota (0 a 100), sempre pela mesma conta, para as rodadas serem comparáveis:**
`100 − 15×P0 − 6×P1 − 2×P2 − 0,5×P3` (mínimo 0). Informe ao lado a **cobertura**: itens testados ÷ itens do roteiro, e quantos ficaram `NÃO TESTADO`.

Se `MODO = AUDITORIA_E_CORRECAO`: corrija P0 e P1 pela causa raiz, um commit por assunto, re-teste o item e a regressão, rode `tsc`, `lint` e `build`, e faça push em `origin/main` (sem force-push). Mudança no banco: declare "Projeto · MCP · ref" antes, e migration destrutiva só com meu ok. P2 e P3 ficam no backlog.

## 📝 FASE 8 — REGISTRO NO OBSIDIAN
1. **Nota:** `/Users/arthurdemoraespd/Documents/obsidian/second brain/EngenharQ OS/09 - 🧪 Testes e Qualidade/Relatório Master QA E2E - [DD Mês AAAA].md` (com o dia, para não sobrescrever a rodada anterior).
2. **Conteúdo:**
   - Frontmatter (aliases, tags `qa`, `e2e`, `playwright`, `nr6`, `testes`, data, autor, commit testado, modo, escopo).
   - Resumo com nota, cobertura e a linha de base (`tsc`, lint, build).
   - **Comparação com a rodada anterior:** bugs novos, corrigidos, que persistem e que voltaram; variação da nota.
   - Matriz dos módulos × Desktop / Mobile × perfil, com PASS / WARN / FAIL / NÃO TESTADO.
   - Resultado das 8 checagens de dados e das cadeias de processo.
   - Inventário de bugs (título, severidade, rota, viewport, perfil, passos, esperado × obtido, evidência, `arquivo:linha`, causa raiz, correção proposta).
   - "A investigar" e "Não testado" com os motivos.
   - Backlog priorizado (o que fazer primeiro e por quê).
3. **MOC:** adicione o wikilink no topo da seção de auditorias de `MOC - Testes e Validações.md`.
4. Se houve correção: changelog em `07 - 📋 Changelog` e linha no `MOC - Changelog.md`.

## 🏁 ENTREGÁVEL NA CONVERSA
Curto, em linguagem simples, focado no que muda na operação:
1. Uma frase com o veredito: nota, cobertura e se dá para usar na obra hoje.
2. Tabela dos módulos (Desktop, Mobile, perfil).
3. Bugs por severidade, com rota e impacto para quem usa.
4. O que mudou desde a última rodada (novos, corrigidos, voltaram).
5. O que não foi testado e por quê.
6. Caminho da nota no Obsidian.
````
