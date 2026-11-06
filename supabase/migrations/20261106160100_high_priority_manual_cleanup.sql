-- =====================================================================================
-- Limpeza destrutiva dos itens ALTOS (complementa 20261106160000_high_priority_stock_kardex_rls).
-- RODAR MANUALMENTE NO SQL EDITOR: o MCP do Supabase recusa DROP/REVOKE/UPDATE.
-- As proteções já valem sem este arquivo (triggers + policies restritivas); aqui só se
-- remove o que ficou obsoleto e se fecha o resto.
-- Inclui a parte 2 pendente de 20261106120000_epi_profile_user_management.
-- Depois de rodar, conferir com supabase/tests/20261106_direct_write_attacks.sql.
-- =====================================================================================

-- Parte 2 de 20261106120000: anon sem EXECUTE, policy antiga de users e perfil do Thiago
REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_role(user_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_user(text, text, text, user_role, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_deactivate_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_almoxarifado_order(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_or_delete_almoxarifado_order(uuid, text, text) FROM PUBLIC, anon;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
UPDATE public.users SET role = 'SAFETY_ENGINEER', updated_at = NOW()
WHERE email = 'thiagolima@engenharq.com.br' AND role = 'ADMIN';

-- Triggers antigos de Kardex (já inertes)
DROP TRIGGER IF EXISTS trg_log_epi_assignment ON public.epi_assignments;
DROP TRIGGER IF EXISTS trg_log_epi_return ON public.epi_assignments;
DROP TRIGGER IF EXISTS trg_log_epi_purchase ON public.epi_purchases;
DROP FUNCTION IF EXISTS public.log_epi_assignment_transaction();
DROP FUNCTION IF EXISTS public.log_epi_return_transaction();
DROP FUNCTION IF EXISTS public.log_epi_purchase_transaction();

-- Policies permissivas que liberavam escrita direta (as restritivas já bloqueiam)
DROP POLICY IF EXISTS "Admins and Engineers can update/delete inventory transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Admins and Engineers can insert inventory transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Admin/Eng can insert inventory tx" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Admin/Eng can update inventory tx" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Admin/Eng can delete inventory tx" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Auth full access site_inventory" ON public.site_inventory;
DROP POLICY IF EXISTS "Auth full access site_transfers" ON public.site_transfers;
DROP POLICY IF EXISTS "Auth full access epi_purchases" ON public.epi_purchases;

-- Exclusão física de registros de compliance (os triggers trg_no_hard_delete já bloqueiam)
DROP POLICY IF EXISTS "Admins and Engineers can delete workers" ON public.workers;
DROP POLICY IF EXISTS "Admins and Engineers can delete assignments" ON public.epi_assignments;
DROP POLICY IF EXISTS "Admins and Engineers can delete sites" ON public.construction_sites;

-- RPCs novas: só usuário logado (o corpo já recusa quem não está ativo)
REVOKE ALL ON FUNCTION public.register_stock_entry(uuid, uuid, integer, numeric, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_site_stock(uuid, uuid, integer, text) FROM PUBLIC, anon;

-- Usuários já desativados antes do trigger trg_sync_user_ban: banir e derrubar sessões
UPDATE auth.users SET banned_until = '2999-12-31 00:00:00+00'
WHERE id IN (SELECT id FROM public.users WHERE deleted_at IS NOT NULL);
DELETE FROM auth.sessions
WHERE user_id IN (SELECT id FROM public.users WHERE deleted_at IS NOT NULL);
