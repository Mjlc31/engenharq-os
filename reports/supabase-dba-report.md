# Relatório de Análise DBA - Supabase (EngenharQ OS)

**Data da Análise:** Agosto 2026
**Agente:** engenharq-supabase-dba
**Foco:** Segurança (RLS), Performance (Postgres Best Practices) e Integridade de Dados.

Após análise detalhada dos arquivos contidos no diretório `supabase/` (`schema.sql`, `seed.sql`, e `functions/check-ca-expiration/index.ts`), identifiquei pontos críticos que devem ser corrigidos imediatamente antes da ida para produção, além de melhorias de performance e segurança.

---

## 1. Vulnerabilidades Críticas de Segurança (RLS & Auth)

### 1.1. Uso Inseguro de `user_metadata` para Autorização (BOLA / IDOR Risk)
**Arquivo:** `schema.sql`
**Problema:** As políticas RLS e a função de trigger utilizam `user_metadata` (ou `raw_user_meta_data`) para definir e verificar o papel do usuário (ex: `ADMIN`, `SAFETY_ENGINEER`). 
**Por que é crítico:** No Supabase, o `user_metadata` é **editável pelo próprio usuário** no frontend. Um atacante pode enviar uma requisição de signup contendo `{"data": {"role": "ADMIN"}}` e ganhar privilégios de administrador em todo o sistema.
**Solução:**
- **RLS:** Modifique todas as políticas para checar o `app_metadata` em vez de `user_metadata`. Exemplo:
  ```sql
  -- Incorreto:
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'ADMIN')
  -- Correto:
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'ADMIN')
  ```
- **Atribuição de Roles:** Crie uma função (API backend ou Edge Function segura) para promover usuários alterando seu `app_metadata` usando a chave service_role. Remova a leitura arbitrária de `role` na trigger `handle_new_user()`.

### 1.2. Uso de Sintaxe RLS Depreciada e Incompleta
**Arquivo:** `schema.sql`
**Problema:** Políticas estão usando `auth.role() = 'authenticated'` e as políticas de `UPDATE` não possuem a cláusula `WITH CHECK`.
**Por que é crítico:** 
- `auth.role()` foi descontinuado pelo Supabase. O método mais seguro é o uso da restrição de papel diretamente na cláusula `TO`.
- Uma política `UPDATE` no Postgres que tem `USING` mas não possui `WITH CHECK` permite que o usuário atualize a linha e altere a propriedade dos dados (ex: mudar o `id` ou `worker_id` para outro).
**Solução:**
- Substitua a verificação global por restrição de papel:
  ```sql
  -- Incorreto
  CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (auth.role() = 'authenticated');
  -- Correto
  CREATE POLICY "Users can view all users" ON public.users FOR SELECT TO authenticated USING (true);
  ```
- Adicione `WITH CHECK` nas políticas `UPDATE`:
  ```sql
  CREATE POLICY "Users can update own profile" ON public.users 
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);
  ```

### 1.3. Função `SECURITY DEFINER` no Schema `public`
**Arquivo:** `schema.sql` (`handle_new_user()`)
**Problema:** A função está no schema `public` e usa `SECURITY DEFINER`.
**Por que é crítico:** Qualquer função no schema `public` ganha permissão automática de `EXECUTE` pelo grupo `PUBLIC`. Em conjunto com `SECURITY DEFINER`, ela executa com permissão de bypass.
**Solução:** Mova funções de manipulação de Auth (como triggers de criação de perfil) para um schema não exposto (como um schema `private`).

### 1.4. Buckets de Storage Públicos com Dados Sensíveis
**Arquivo:** `seed.sql`
**Problema:** O bucket `epi-receipts` está sendo instanciado como público (`public: true`).
**Por que é crítico:** Recibos de EPIs (PDFs) e assinaturas digitais podem conter PII e não devem ser abertos ao público.
**Solução:** Alterar para `public: false` e criar políticas rigorosas de Storage RLS na tabela `storage.objects` (permitindo apenas o próprio worker ou os papéis `ADMIN`/`SAFETY_ENGINEER`).

---

## 2. Performance e Otimização do Banco de Dados

### 2.1. Uso de Índices Parciais (Partial Indexes) para o Histórico de EPIs
**Arquivo:** `schema.sql`
**Problema:** Foi criado um índice completo na coluna `returned_at` (`CREATE INDEX idx_epi_assignments_returned_at`).
**Melhoria:** Consultas operacionais (como a verificada na Edge Function) buscam apenas os EPIs que **ainda não foram devolvidos** (`returned_at IS NULL`). O Postgres se beneficia enormemente de índices parciais para essas lógicas boolianas / condicionais.
**Solução:**
```sql
-- Substitua o índice atual por um índice parcial focado nos "ativos":
CREATE INDEX idx_epi_assignments_active ON public.epi_assignments(epi_id) WHERE returned_at IS NULL;
```

---

## 3. Edge Functions (Deno)

### 3.1. Validação de Autenticação na Função `check-ca-expiration`
**Arquivo:** `functions/check-ca-expiration/index.ts`
**Problema:** A verificação `if (authHeader !== \`Bearer ${supabaseServiceKey}\`)` foi feita de forma imperativa dentro do Edge Function.
**Por que é crítico:** A recomendação oficial é NÃO expor o Service Key no front e evite usá-lo como Bearer token em requisições de clientes externos se a chamada for trafegada em rede aberta (embora internamente pelo pg_net seja "seguro").
**Melhoria:** Para scripts de trigger/cron jobs, o recomendado é que as chamadas partam do próprio banco (`pg_cron` com `pg_net`) passando um `WEBHOOK_SECRET` que será lido em `Deno.env.get('WEBHOOK_SECRET')`, mantendo a arquitetura mais blindada. O Supabase client da função pode usar a `supabaseServiceKey` tranquilamente, mas a checagem de "quem está invocando" não deve usar essa key.

---

## Conclusão
O modelo de dados está muito bem estruturado e as relações adequadas (como o uso inteligente de ENUMs e Triggers para `updated_at`). No entanto, as falhas de **uso do user_metadata nas policies** e a **falta de WITH CHECK nos Updates** devem ser corrigidas de imediato por representarem risco de escalação de privilégio.
