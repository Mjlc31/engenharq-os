-- =====================================================================================
-- Itens ALTOS da revisão do banco de 2026-11-06 (5 a 13).
-- Só comandos não destrutivos. A limpeza destrutiva (DROP/REVOKE/UPDATE) está em
-- 20261106160100_high_priority_manual_cleanup.sql, para rodar no SQL Editor.
--
-- Regra nova de estoque (fonte única = site_inventory):
--  * toda movimentação passa por private.move_stock(): trava a linha, impede saldo negativo
--    e grava o Kardex com obra, colaborador e autor na mesma transação;
--  * a cautela (epi_assignments) dirige o estoque por trigger: entrega debita; devolução em
--    bom estado e estorno (soft delete) creditam. Vale para RPCs e para inserts do frontend;
--  * epi_catalog.current_stock é só a soma das obras (sync_catalog_current_stock).
-- =====================================================================================

CREATE SCHEMA IF NOT EXISTS private;

-- 1. Cautela sabe de qual obra saiu e de qual comanda veio (estorno exato)
ALTER TABLE public.epi_assignments
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.construction_sites(id),
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.almoxarifado_orders(id);
CREATE INDEX IF NOT EXISTS idx_epi_assignments_site_id ON public.epi_assignments(site_id);
CREATE INDEX IF NOT EXISTS idx_epi_assignments_order_id ON public.epi_assignments(order_id);

-- 2. Movimentação única de estoque + Kardex
CREATE OR REPLACE FUNCTION private.move_stock(p_site uuid, p_catalog uuid, p_delta integer, p_type text, p_worker uuid, p_notes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
DECLARE
  v_qty integer;
BEGIN
  IF p_site IS NULL THEN
    RAISE EXCEPTION 'Obra não definida para a movimentação de estoque.';
  END IF;
  IF p_delta IS NULL OR p_delta = 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.site_inventory (site_id, catalog_id, quantity)
  VALUES (p_site, p_catalog, 0)
  ON CONFLICT (site_id, catalog_id) DO NOTHING;

  SELECT quantity INTO v_qty
  FROM public.site_inventory
  WHERE site_id = p_site AND catalog_id = p_catalog
  FOR UPDATE;

  IF v_qty + p_delta < 0 THEN
    RAISE EXCEPTION 'Saldo insuficiente na obra (disponível: %, necessário: %).', v_qty, -p_delta;
  END IF;

  UPDATE public.site_inventory
  SET quantity = v_qty + p_delta, updated_at = now()
  WHERE site_id = p_site AND catalog_id = p_catalog;

  INSERT INTO public.inventory_transactions (catalog_id, site_id, worker_id, transaction_type, quantity_change, notes, created_by)
  VALUES (p_catalog, p_site, p_worker, p_type, p_delta, p_notes, auth.uid());
END;
$$;

-- 3. A cautela dirige o estoque
CREATE OR REPLACE FUNCTION private.epi_assignment_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
DECLARE
  v_site uuid;
  v_qty integer;
  v_order_number integer;
  v_reason text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.quantity := COALESCE(NEW.quantity, 1);
    IF NEW.quantity <= 0 THEN
      RAISE EXCEPTION 'A quantidade entregue deve ser maior que zero.';
    END IF;
    IF NEW.site_id IS NULL THEN
      SELECT current_site_id INTO NEW.site_id FROM public.workers WHERE id = NEW.worker_id;
    END IF;
    IF NEW.site_id IS NULL THEN
      RAISE EXCEPTION 'Colaborador sem obra definida: aloque-o em uma obra antes de entregar EPI.';
    END IF;
    SELECT order_number INTO v_order_number FROM public.almoxarifado_orders WHERE id = NEW.order_id;
    PERFORM private.move_stock(NEW.site_id, NEW.catalog_id, -NEW.quantity, 'SAIDA_ENTREGA', NEW.worker_id,
      COALESCE('Entrega via KDS - Pedido #' || v_order_number, 'Entrega de EPI'));
    RETURN NEW;
  END IF;

  IF NEW.catalog_id IS DISTINCT FROM OLD.catalog_id
     OR NEW.quantity IS DISTINCT FROM OLD.quantity
     OR NEW.worker_id IS DISTINCT FROM OLD.worker_id
     OR NEW.site_id IS DISTINCT FROM OLD.site_id
     OR NEW.order_id IS DISTINCT FROM OLD.order_id THEN
    RAISE EXCEPTION 'Não é permitido alterar EPI, quantidade, colaborador, obra ou comanda de uma entrega. Estorne e registre de novo.';
  END IF;

  IF (OLD.returned_at IS NOT NULL AND NEW.returned_at IS NULL)
     OR (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Devolução ou estorno não podem ser desfeitos. Registre uma nova entrega.';
  END IF;

  -- Cautelas anteriores a 06/11/2026 não têm site_id: usa a obra atual do colaborador; sem obra, não move estoque.
  v_site := COALESCE(OLD.site_id, (SELECT current_site_id FROM public.workers WHERE id = OLD.worker_id));
  v_qty := COALESCE(OLD.quantity, 1);

  -- Devolução: só volta ao estoque o que está em bom estado
  IF OLD.returned_at IS NULL AND NEW.returned_at IS NOT NULL AND OLD.deleted_at IS NULL
     AND NEW.condition_on_return = 'GOOD' AND v_site IS NOT NULL THEN
    PERFORM private.move_stock(v_site, OLD.catalog_id, v_qty, 'DEVOLUCAO', OLD.worker_id, 'Devolução de EPI em bom estado');
  END IF;

  -- Estorno (soft delete) de entrega que ainda está com o colaborador
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
     AND OLD.returned_at IS NULL AND NEW.returned_at IS NULL AND v_site IS NOT NULL THEN
    SELECT order_number, cancellation_reason INTO v_order_number, v_reason
    FROM public.almoxarifado_orders WHERE id = OLD.order_id;
    PERFORM private.move_stock(v_site, OLD.catalog_id, v_qty, 'ESTORNO_ENTREGA', OLD.worker_id,
      COALESCE('Estorno comanda #' || v_order_number || ' - ' || COALESCE(v_reason, 'sem motivo'), 'Estorno de entrega'));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_epi_assignment_stock
  BEFORE INSERT OR UPDATE ON public.epi_assignments
  FOR EACH ROW EXECUTE FUNCTION private.epi_assignment_stock();

-- 4. Triggers antigos de Kardex duplicavam lançamentos (OUT + SAIDA_ENTREGA) e gravavam sem obra.
--    Ficam inertes aqui; o DROP está na limpeza manual.
CREATE OR REPLACE FUNCTION public.log_epi_assignment_transaction()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$ BEGIN RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.log_epi_return_transaction()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$ BEGIN RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.log_epi_purchase_transaction()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$ BEGIN RETURN NEW; END; $$;

-- 5. current_stock do catálogo é derivado: escrita direta do cliente é ignorada
CREATE OR REPLACE FUNCTION private.protect_catalog_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $$
BEGIN
  -- Profundidade 1 = comando direto (cliente ou RPC). O sync a partir de site_inventory chega com profundidade > 1.
  IF pg_trigger_depth() = 1 THEN
    IF TG_OP = 'INSERT' THEN
      NEW.current_stock := 0;
    ELSE
      NEW.current_stock := OLD.current_stock;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_catalog_stock
  BEFORE INSERT OR UPDATE ON public.epi_catalog
  FOR EACH ROW EXECUTE FUNCTION private.protect_catalog_stock();

-- 6. Kardex imutável e registros de compliance sem exclusão física
CREATE OR REPLACE FUNCTION private.forbid_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $$
BEGIN
  RAISE EXCEPTION 'Operação % bloqueada em %: registro de compliance. Use soft delete (deleted_at) ou estorno.', TG_OP, TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER trg_kardex_immutable BEFORE UPDATE OR DELETE ON public.inventory_transactions FOR EACH ROW EXECUTE FUNCTION private.forbid_change();
CREATE TRIGGER trg_no_hard_delete BEFORE DELETE ON public.workers FOR EACH ROW EXECUTE FUNCTION private.forbid_change();
CREATE TRIGGER trg_no_hard_delete BEFORE DELETE ON public.construction_sites FOR EACH ROW EXECUTE FUNCTION private.forbid_change();
CREATE TRIGGER trg_no_hard_delete BEFORE DELETE ON public.epi_catalog FOR EACH ROW EXECUTE FUNCTION private.forbid_change();
CREATE TRIGGER trg_no_hard_delete BEFORE DELETE ON public.epi_assignments FOR EACH ROW EXECUTE FUNCTION private.forbid_change();
CREATE TRIGGER trg_no_hard_delete BEFORE DELETE ON public.almoxarifado_orders FOR EACH ROW EXECUTE FUNCTION private.forbid_change();
CREATE TRIGGER trg_no_hard_delete BEFORE DELETE ON public.worker_asos FOR EACH ROW EXECUTE FUNCTION private.forbid_change();
CREATE TRIGGER trg_no_hard_delete BEFORE DELETE ON public.worker_trainings FOR EACH ROW EXECUTE FUNCTION private.forbid_change();
CREATE TRIGGER trg_no_hard_delete BEFORE DELETE ON public.disciplinary_records FOR EACH ROW EXECUTE FUNCTION private.forbid_change();
CREATE TRIGGER trg_no_hard_delete BEFORE DELETE ON public.epi_purchases FOR EACH ROW EXECUTE FUNCTION private.forbid_change();
CREATE TRIGGER trg_no_hard_delete BEFORE DELETE ON public.site_transfers FOR EACH ROW EXECUTE FUNCTION private.forbid_change();

-- Tipos do Kardex e obra obrigatória daqui em diante (linhas antigas sem obra ficam como histórico)
ALTER TABLE public.inventory_transactions
  ADD CONSTRAINT inventory_transactions_type_check CHECK (transaction_type IN (
    'SALDO_INICIAL', 'ENTRADA_COMPRA', 'AJUSTE', 'SAIDA_ENTREGA', 'DEVOLUCAO', 'ESTORNO_ENTREGA', 'DESCARTE',
    'TRANSFERENCIA_SAIDA', 'TRANSFERENCIA_ENTRADA',
    'OUT', 'IN', 'PURCHASE', 'DISCARD' -- legados, anteriores a 2026-11-06
  )),
  ADD CONSTRAINT inventory_transactions_site_required CHECK (site_id IS NOT NULL) NOT VALID;

-- 7. RPCs de estoque sobre a regra única
CREATE OR REPLACE FUNCTION public.complete_almoxarifado_order(p_order_id uuid, p_delivered_by text, p_signature_url text DEFAULT NULL::text, p_selfie_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_actor TEXT;
  v_order RECORD;
  v_item RECORD;
  v_site_id UUID;
  v_ca_number TEXT;
  v_lifespan INT;
  v_res JSONB;
BEGIN
  -- p_delivered_by fica na assinatura só por compatibilidade com o frontend; o autor é o usuário logado.
  SELECT COALESCE(email, full_name) INTO v_actor
  FROM public.users
  WHERE id = auth.uid() AND deleted_at IS NULL;

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autenticado ou desativado.';
  END IF;

  SELECT * INTO v_order
  FROM public.almoxarifado_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado.';
  END IF;

  IF v_order.deleted_at IS NOT NULL OR v_order.status NOT IN ('PREPARING', 'READY') THEN
    RAISE EXCEPTION 'Pedido #% não pode ser entregue (status: %).', v_order.order_number, v_order.status;
  END IF;

  IF jsonb_array_length(COALESCE(v_order.items, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Pedido #% não tem itens.', v_order.order_number;
  END IF;

  v_site_id := COALESCE(v_order.site_id, (SELECT current_site_id FROM public.workers WHERE id = v_order.worker_id));
  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'Pedido #% sem obra definida: informe a obra do pedido ou do colaborador.', v_order.order_number;
  END IF;

  -- Cada cautela debita a obra e grava o Kardex pelo trigger trg_epi_assignment_stock (falha se faltar saldo)
  FOR v_item IN SELECT * FROM jsonb_to_recordset(v_order.items) AS x(catalog_id UUID, quantity INT, unit_price NUMERIC)
  LOOP
    SELECT ca_number, COALESCE(lifespan_days, 180)
    INTO v_ca_number, v_lifespan
    FROM public.epi_catalog
    WHERE id = v_item.catalog_id;

    INSERT INTO public.epi_assignments (
      catalog_id, worker_id, site_id, order_id, quantity, unit_price_at_delivery, expected_return_date,
      digital_signature_url, audit_selfie_url, ca_number, condition_on_delivery, assigned_at
    ) VALUES (
      v_item.catalog_id, v_order.worker_id, v_site_id, p_order_id, COALESCE(v_item.quantity, 1), COALESCE(v_item.unit_price, 0),
      (CURRENT_DATE + (v_lifespan || ' days')::INTERVAL), p_signature_url, p_selfie_url, v_ca_number, 'GOOD'::item_condition, NOW()
    );
  END LOOP;

  UPDATE public.almoxarifado_orders
  SET status = 'DELIVERED',
      delivered_at = NOW(),
      delivered_by = v_actor,
      signature_url = p_signature_url,
      selfie_url = p_selfie_url,
      site_id = v_site_id,
      updated_at = NOW()
  WHERE id = p_order_id;

  SELECT to_jsonb(o) INTO v_res
  FROM public.almoxarifado_orders o
  WHERE o.id = p_order_id;

  RETURN v_res;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_or_delete_almoxarifado_order(p_order_id uuid, p_cancelled_by text, p_reason text DEFAULT 'Cancelamento/Exclusão solicitada pelo Administrador'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_actor TEXT;
  v_order RECORD;
  v_count INT;
  v_res JSONB;
BEGIN
  -- p_cancelled_by fica na assinatura só por compatibilidade com o frontend; o autor é o usuário logado.
  SELECT COALESCE(email, full_name) INTO v_actor
  FROM public.users
  WHERE id = auth.uid() AND deleted_at IS NULL;

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autenticado ou desativado.';
  END IF;

  SELECT * INTO v_order
  FROM public.almoxarifado_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado.';
  END IF;

  IF v_order.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Este pedido já foi excluído previamente.';
  END IF;

  -- Motivo gravado antes do estorno para o Kardex citá-lo
  UPDATE public.almoxarifado_orders
  SET status = 'CANCELLED',
      deleted_at = NOW(),
      cancellation_reason = p_reason,
      cancelled_by = v_actor,
      updated_at = NOW()
  WHERE id = p_order_id;

  IF v_order.status = 'DELIVERED' THEN
    -- Só as cautelas desta comanda; o trigger devolve ao estoque as que ainda estão com o colaborador
    UPDATE public.epi_assignments
    SET deleted_at = NOW(),
        condition_on_return = COALESCE(condition_on_return, 'ESTORNO_BALCAO')
    WHERE order_id = p_order_id AND deleted_at IS NULL;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count = 0 THEN
      RAISE EXCEPTION 'Pedido #% não tem cautelas vinculadas (entregue antes de 06/11/2026). Estorne pelas cautelas do colaborador.', v_order.order_number;
    END IF;
  END IF;

  SELECT to_jsonb(o) INTO v_res
  FROM public.almoxarifado_orders o
  WHERE o.id = p_order_id;

  RETURN v_res;
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_epi(p_worker_id uuid, p_catalog_id uuid, p_quantity integer DEFAULT 1)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF public.current_user_role() IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autenticado ou desativado.';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'A quantidade deve ser maior que zero.';
  END IF;

  -- Uma cautela por unidade; o trigger debita a obra do colaborador
  FOR i IN 1..p_quantity LOOP
    INSERT INTO public.epi_assignments (catalog_id, worker_id, condition_on_delivery)
    VALUES (p_catalog_id, p_worker_id, 'GOOD'::item_condition);
  END LOOP;

  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.return_epi(p_assignment_id uuid, p_condition item_condition DEFAULT 'GOOD'::item_condition)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF public.current_user_role() IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autenticado ou desativado.';
  END IF;

  -- O trigger devolve ao estoque a quantidade inteira quando a condição é GOOD
  UPDATE public.epi_assignments
  SET returned_at = now(), condition_on_return = p_condition::text
  WHERE id = p_assignment_id AND returned_at IS NULL AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cautela não encontrada, já devolvida ou estornada.';
  END IF;

  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.discard_epi(p_catalog_id uuid, p_quantity integer, p_reason text, p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_site uuid;
BEGIN
  IF public.current_user_role() IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autenticado ou desativado.';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantidade de descarte deve ser maior que zero.';
  END IF;

  -- shortcut: a tela de descarte não informa a obra; usa a obra de maior saldo que comporte a quantidade. Trocar por p_site_id quando a tela pedir a obra.
  SELECT site_id INTO v_site
  FROM public.site_inventory
  WHERE catalog_id = p_catalog_id AND quantity >= p_quantity
  ORDER BY quantity DESC
  LIMIT 1;

  IF v_site IS NULL THEN
    RAISE EXCEPTION 'Nenhuma obra tem % unidade(s) deste EPI para descartar.', p_quantity;
  END IF;

  PERFORM private.move_stock(v_site, p_catalog_id, -p_quantity, 'DESCARTE', NULL,
    'Descarte de EPI: ' || p_reason || COALESCE(' - ' || p_notes, ''));

  UPDATE public.epi_catalog
  SET discard_reason = p_reason, discard_notes = p_notes, discarded_at = NOW()
  WHERE id = p_catalog_id;

  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.transfer_epi_send(p_catalog_id uuid, p_origin_site_id uuid, p_destination_site_id uuid, p_quantity integer, p_sender_id uuid, p_sender_name text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_transfer_id UUID;
  v_name TEXT;
  v_dest TEXT;
BEGIN
  -- p_sender_id/p_sender_name ficam por compatibilidade; o remetente é o usuário logado.
  SELECT COALESCE(full_name, email) INTO v_name
  FROM public.users
  WHERE id = auth.uid() AND deleted_at IS NULL;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autenticado ou desativado.';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'A quantidade deve ser maior que zero.';
  END IF;
  IF p_origin_site_id = p_destination_site_id THEN
    RAISE EXCEPTION 'A obra de origem e destino devem ser diferentes.';
  END IF;

  SELECT name INTO v_dest FROM public.construction_sites WHERE id = p_destination_site_id;

  PERFORM private.move_stock(p_origin_site_id, p_catalog_id, -p_quantity, 'TRANSFERENCIA_SAIDA', NULL,
    'Transferência para ' || COALESCE(v_dest, 'outra obra') || COALESCE(' - ' || p_notes, ''));

  INSERT INTO public.site_transfers (
    catalog_id, origin_site_id, destination_site_id, quantity, status, sender_user_id, sender_name, sent_at, notes
  ) VALUES (
    p_catalog_id, p_origin_site_id, p_destination_site_id, p_quantity, 'EM_TRANSITO', auth.uid(), v_name, NOW(), p_notes
  ) RETURNING id INTO v_transfer_id;

  RETURN v_transfer_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.transfer_epi_receive(p_transfer_id uuid, p_receiver_id uuid, p_receiver_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_transfer RECORD;
  v_name TEXT;
  v_origin TEXT;
BEGIN
  -- p_receiver_id/p_receiver_name ficam por compatibilidade; o recebedor é o usuário logado.
  SELECT COALESCE(full_name, email) INTO v_name
  FROM public.users
  WHERE id = auth.uid() AND deleted_at IS NULL;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autenticado ou desativado.';
  END IF;

  SELECT * INTO v_transfer
  FROM public.site_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transferência não encontrada.';
  END IF;
  IF v_transfer.status <> 'EM_TRANSITO' THEN
    RAISE EXCEPTION 'Esta transferência já foi finalizada ou cancelada (status atual: %).', v_transfer.status;
  END IF;

  SELECT name INTO v_origin FROM public.construction_sites WHERE id = v_transfer.origin_site_id;

  PERFORM private.move_stock(v_transfer.destination_site_id, v_transfer.catalog_id, v_transfer.quantity, 'TRANSFERENCIA_ENTRADA', NULL,
    'Recebido de ' || COALESCE(v_origin, 'outra obra'));

  UPDATE public.site_transfers
  SET status = 'RECEBIDO', receiver_user_id = auth.uid(), receiver_name = v_name, received_at = NOW()
  WHERE id = p_transfer_id;

  RETURN TRUE;
END;
$function$;

-- Entrada de nota fiscal: compra + estoque + Kardex numa transação
CREATE OR REPLACE FUNCTION public.register_stock_entry(p_catalog_id uuid, p_site_id uuid, p_quantity integer, p_unit_price numeric DEFAULT 0, p_invoice_number text DEFAULT NULL::text, p_supplier text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_purchase public.epi_purchases;
BEGIN
  IF public.current_user_role() IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autenticado ou desativado.';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'A quantidade deve ser maior que zero.';
  END IF;
  IF p_site_id IS NULL THEN
    RAISE EXCEPTION 'Selecione a obra que recebe o estoque.';
  END IF;

  INSERT INTO public.epi_purchases (catalog_id, site_id, quantity, unit_price, invoice_number, supplier, notes, registered_by)
  VALUES (p_catalog_id, p_site_id, p_quantity, COALESCE(p_unit_price, 0), p_invoice_number, p_supplier, p_notes, auth.uid())
  RETURNING * INTO v_purchase;

  PERFORM private.move_stock(p_site_id, p_catalog_id, p_quantity, 'ENTRADA_COMPRA', NULL,
    'Entrada NF ' || COALESCE(p_invoice_number, 'S/N') || ' - Fornecedor: ' || COALESCE(p_supplier, 'N/A') || COALESCE(' - ' || p_notes, ''));

  IF COALESCE(p_unit_price, 0) > 0 THEN
    UPDATE public.epi_catalog SET unit_price = p_unit_price WHERE id = p_catalog_id;
  END IF;

  RETURN to_jsonb(v_purchase);
END;
$function$;

-- Ajuste manual de saldo de uma obra (inventário físico)
CREATE OR REPLACE FUNCTION public.set_site_stock(p_catalog_id uuid, p_site_id uuid, p_quantity integer, p_notes text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_current integer;
BEGIN
  IF public.current_user_role() IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autenticado ou desativado.';
  END IF;
  IF p_quantity IS NULL OR p_quantity < 0 THEN
    RAISE EXCEPTION 'O saldo não pode ser negativo.';
  END IF;

  SELECT quantity INTO v_current
  FROM public.site_inventory
  WHERE site_id = p_site_id AND catalog_id = p_catalog_id;

  PERFORM private.move_stock(p_site_id, p_catalog_id, p_quantity - COALESCE(v_current, 0), 'AJUSTE', NULL,
    COALESCE(p_notes, 'Ajuste manual de saldo'));

  RETURN p_quantity;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.register_stock_entry(uuid, uuid, integer, numeric, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_site_stock(uuid, uuid, integer, text) TO authenticated;

-- 8. Usuário desativado é banido no auth e perde as sessões; reativado volta a entrar
CREATE OR REPLACE FUNCTION private.sync_user_ban()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
BEGIN
  IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    -- Data fixa em vez de 'infinity': o GoTrue lê banned_until como timestamp comum.
    UPDATE auth.users
    SET banned_until = CASE WHEN NEW.deleted_at IS NULL THEN NULL ELSE '2999-12-31 00:00:00+00'::timestamptz END
    WHERE id = NEW.id;

    IF NEW.deleted_at IS NOT NULL THEN
      DELETE FROM auth.sessions WHERE user_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_user_ban
  AFTER UPDATE OF deleted_at ON public.users
  FOR EACH ROW EXECUTE FUNCTION private.sync_user_ban();

-- 9. RLS: usuário desativado não lê nem grava nada (restritiva soma com as permissivas existentes)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'workers', 'construction_sites', 'epi_catalog', 'epi_assignments', 'site_inventory', 'site_transfers',
    'inventory_transactions', 'almoxarifado_orders', 'epi_purchases', 'worker_asos', 'worker_trainings',
    'training_catalog', 'disciplinary_records', 'worker_roles', 'worker_roles_history', 'companies', 'system_settings'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "Somente usuários ativos" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
      'USING ((SELECT public.current_user_role()) IS NOT NULL) WITH CHECK ((SELECT public.current_user_role()) IS NOT NULL)', t);
  END LOOP;
END $$;

-- Estoque, Kardex, compras e transferências só mudam pelas RPCs (que rodam como dono e ignoram RLS)
CREATE POLICY "Leitura do estoque por obra" ON public.site_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Estoque só via RPC (insert)" ON public.site_inventory AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Estoque só via RPC (update)" ON public.site_inventory AS RESTRICTIVE FOR UPDATE TO authenticated USING (false);
CREATE POLICY "Estoque só via RPC (delete)" ON public.site_inventory AS RESTRICTIVE FOR DELETE TO authenticated USING (false);

CREATE POLICY "Kardex só via RPC" ON public.inventory_transactions AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "Leitura de transferências" ON public.site_transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Transferência só via RPC (insert)" ON public.site_transfers AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Transferência só via RPC (update)" ON public.site_transfers AS RESTRICTIVE FOR UPDATE TO authenticated USING (false);

CREATE POLICY "Leitura de compras" ON public.epi_purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Compra só via RPC (insert)" ON public.epi_purchases AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Compra só via RPC (update)" ON public.epi_purchases AS RESTRICTIVE FOR UPDATE TO authenticated USING (false);

-- Comanda: o cliente cria e move entre PREPARING/READY; entregar e cancelar só pelas RPCs
CREATE POLICY "Comanda: entrega e cancelamento só via RPC (insert)" ON public.almoxarifado_orders AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (status IN ('PREPARING', 'READY') AND deleted_at IS NULL);
CREATE POLICY "Comanda: entrega e cancelamento só via RPC (update)" ON public.almoxarifado_orders AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (status IN ('PREPARING', 'READY') AND deleted_at IS NULL)
  WITH CHECK (status IN ('PREPARING', 'READY') AND deleted_at IS NULL);

-- 10. Storage: sem listagem anônima (URL pública de bucket público continua funcionando) e evidências não são apagadas
CREATE POLICY "Sem listagem anônima" ON storage.objects AS RESTRICTIVE FOR SELECT TO anon USING (false);
CREATE POLICY "Evidências não podem ser apagadas" ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
  USING (bucket_id NOT IN ('epi-receipts', 'epi-evidence', 'sst-evidence', 'worker-photos'));

-- 11. Saldo de abertura do Kardex por obra: a partir daqui, soma do Kardex da obra = site_inventory
INSERT INTO public.inventory_transactions (catalog_id, site_id, transaction_type, quantity_change, notes)
SELECT si.catalog_id, si.site_id, 'SALDO_INICIAL', si.quantity - COALESCE(k.total, 0),
       'Saldo de abertura do Kardex por obra (reconciliação de 06/11/2026)'
FROM public.site_inventory si
LEFT JOIN (
  SELECT site_id, catalog_id, SUM(quantity_change) AS total
  FROM public.inventory_transactions
  WHERE site_id IS NOT NULL
  GROUP BY site_id, catalog_id
) k ON k.site_id = si.site_id AND k.catalog_id = si.catalog_id
WHERE si.quantity - COALESCE(k.total, 0) <> 0;
