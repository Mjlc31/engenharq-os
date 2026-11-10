# Conexão do Claude Code com o banco via MCP do Supabase

Guia para o Claude Code aplicar migrations no Supabase do **EngenharQ OS** (`ozsmevkqcytrtpnpoekp`) pelo MCP, mantendo uma aprovação humana antes de cada gravação.

> Diagnóstico completo do problema: https://claude.ai/artifact/7ibwi8jMY9ZhnZcGYi4Uh1

---

## 1. Por que as gravações eram recusadas

Antes de executar SQL **destrutivo** (`REVOKE`, `DROP`, `UPDATE`, `DELETE`), o MCP do Supabase manda ao cliente um pedido de confirmação (no protocolo MCP isso se chama *elicitation*). Algumas sessões do Claude Code recusam esse pedido sozinhas, sem mostrar nada na tela, e o Supabase responde:

```json
{"status":"declined","message":"Migration was declined."}
```

Isso aconteceu em sessões abertas antes da atualização para o Claude Code v2.1.318. Sessões abertas depois, como o Claude no terminal, conseguiram aplicar.

O Supabase oferece um parâmetro oficial para não pedir essa confirmação: `skip_elicitations`. Ele **não** ignora autenticação nem permissões; só remove a pergunta extra do servidor.
Fonte: https://supabase.com/docs/guides/mcp

---

## 2. Estado atual (conferido em 06/11/2026)

| Item | Onde fica | Situação |
|---|---|---|
| MCP `supabase_engenharq` | `~/.claude.json` (nível do usuário) | URL já tem `skip_elicitations=execute_sql,apply_migration` |
| MCP `supabase_quark` | `~/.claude.json` | Projeto Quark, não mexer |
| MCP genérico `supabase` (sem `project_ref`) | `.mcp.json` do repositório | Desligado em `.claude/settings.local.json` |
| Permissões do Claude Code | `.claude/settings.local.json` | `apply_migration` e `execute_sql` liberados sem perguntar |
| Token do MCP | Cabeçalho `Authorization` em `~/.claude.json` | Não é o token que foi colado no chat |

> ⚠️ **Do jeito que está, não existe nenhuma aprovação humana.** O Supabase não pergunta (por causa do `skip_elicitations`) e o Claude Code também não (por causa do `allow`). Uma migration destrutiva iria direto para produção. Os passos abaixo corrigem isso.

---

## 3. Passo a passo

### Passo 1. Revogar o token vazado

O token `sbp_fc6d…` foi colado no chat e dá acesso a **todos os projetos da conta**, inclusive o Quark.

1. Abra https://supabase.com/dashboard/account/tokens
2. Clique em **Revoke** no token que começa com `sbp_fc6d`.

Os MCPs usam outro token, então nada deixa de funcionar.

### Passo 2. Ajustar a URL do MCP do EngenharQ

Edite `~/.claude.json`, na entrada `mcpServers.supabase_engenharq`, campo `url`:

```json
"supabase_engenharq": {
  "type": "http",
  "url": "https://mcp.supabase.com/mcp?project_ref=ozsmevkqcytrtpnpoekp&skip_elicitations=apply_migration",
  "headers": {
    "Authorization": "Bearer <TOKEN_ATUAL>"
  }
}
```

Mudança: tirar `execute_sql` do `skip_elicitations`.

- `apply_migration` fica sem a pergunta do Supabase. Ela é o caminho oficial de mudança: fica registrada em `list_migrations` e passa pela aprovação do passo 3.
- `execute_sql` volta a ter a confirmação do Supabase para SQL destrutivo avulso. Consultas de leitura continuam passando direto.

Opcional, para reduzir o que o MCP consegue fazer: acrescente `&features=database,debugging,development,docs` na URL.

### Passo 3. Fazer o Claude Code pedir aprovação antes de cada migration

Edite `.claude/settings.local.json` no projeto:

```json
{
  "disabledMcpjsonServers": [
    "supabase"
  ],
  "permissions": {
    "allow": [
      "mcp__supabase_engenharq__execute_sql"
    ]
  }
}
```

Mudança: tirar `mcp__supabase_engenharq__apply_migration` do `allow`. Assim, a cada migration o Claude Code mostra o SQL completo e espera você clicar em aprovar. Essa é a aprovação humana que sobra, e esse pedido aparece normalmente no app desktop e no terminal.

> O Claude Code não deixa o próprio Claude editar esses arquivos de permissão. Edite você, ou peça explicitamente no chat.

### Passo 4. Remover o MCP genérico do repositório

O `.mcp.json` versionado aponta para `https://mcp.supabase.com/mcp` **sem** `project_ref`. Isso dá acesso à conta inteira (EngenharQ e Quark). Hoje ele está desligado só na sua máquina.

```bash
git rm .mcp.json
```
```bash
git commit -m "chore: remover MCP Supabase generico sem project_ref"
```

### Passo 5. Reiniciar

1. Feche **todas** as sessões do Claude Code: app desktop e abas do terminal.
2. Abra uma sessão nova na pasta do projeto.
3. No terminal, rode `/mcp` e confira que `supabase_engenharq` aparece como conectado.

---

## 4. Teste de validação (não altera nada no banco)

Peça ao Claude na sessão nova:

> Aplique via `apply_migration` do `supabase_engenharq` a migration `zz_mcp_healthcheck` com este SQL e depois confirme em `list_migrations`.

```sql
CREATE OR REPLACE FUNCTION public.zz_mcp_healthcheck() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;
DROP FUNCTION public.zz_mcp_healthcheck();
```

O `DROP` é destrutivo, então testa justamente o caminho que falhava. O resultado final é nenhuma mudança no banco.

| Resultado | O que significa |
|---|---|
| O Claude Code pede aprovação, você aprova e volta `success` | ✅ Tudo configurado |
| Volta `declined` sem você ver nenhuma pergunta | O `skip_elicitations` não foi carregado: confira a URL e reinicie |
| Aplica sem pedir aprovação | O `apply_migration` ainda está no `allow` (passo 3) |
| Bloqueio com o motivo "Production Deploy" | Modo automático do Claude Code: aprove o pedido, ou troque o modo com Shift+Tab |
| `401` ou `Unauthorized` | Token inválido ou revogado: gere outro e atualize o cabeçalho |

---

## 5. Fluxo de trabalho para mudanças no banco

1. **Escrever** a migration em `supabase/migrations/AAAAMMDDHHMMSS_nome.sql`, versionada no Git.
2. **Testar sem gravar:** blocos `DO` que simulam usuários diferentes (`SET LOCAL ROLE anon` ou `authenticated` com `request.jwt.claims`) e terminam com `RAISE`, o que desfaz tudo.
3. **Revisar:** o Claude mostra o resumo e o SQL completo.
4. **Aplicar** por **um único canal**: o Claude Code com aprovação (passo 3) ou o Antigravity executando exatamente o arquivo do repositório, sem editar.
5. **Conferir:** checar o estado real (`pg_policy`, `has_function_privilege`, `pg_proc`) e rodar `get_advisors` de segurança.

> **Uma só sessão grava no banco por vez.** Em 06/11 havia três sessões do Claude alterando o mesmo banco e o mesmo repositório ao mesmo tempo.

---

## 6. Regras de segurança

- O Supabase recomenda não ligar o MCP a um banco de produção, ou usar `read_only=true`. Se quiser uma camada a mais, crie dois MCPs: um só leitura para o dia a dia e outro com escrita, usado só para aplicar migrations.
- Nunca cole tokens, senhas ou strings de conexão no chat nem no repositório (o `CLAUDE.md` já vazou senhas uma vez).
- Para o projeto Quark, usar apenas o `supabase_quark`. Nunca usar o MCP genérico sem `project_ref`.
