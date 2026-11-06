-- Críticos da revisão do banco de 2026-11-06 (complementa 20261106120000_epi_profile_user_management,
-- que já fecha admin_create_user/admin_deactivate_user e revoga anon das RPCs do balcão).
--  1) handle_new_user não confia mais no papel enviado pelo próprio usuário no signUp; cadastro público bloqueado.
--  2) complete/cancel_or_delete_almoxarifado_order exigem usuário ativo, registram o autor pelo login
--     e têm search_path fixo.
--  3) transfer_epi_send não cria estoque quando a obra de origem não tem linha em site_inventory.

-- 1. Papel só vem de raw_app_meta_data, que só o servidor grava (admin_create_user).
--    raw_user_meta_data é preenchido pelo cliente no signUp e não serve para autorização.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  _role public.user_role;
BEGIN
  BEGIN
    _role := (new.raw_app_meta_data->>'role')::public.user_role;
  EXCEPTION WHEN OTHERS THEN
    _role := NULL;
  END;

  IF _role IS NULL THEN
    RAISE EXCEPTION 'Cadastro público desabilitado. Solicite acesso a um administrador.';
  END IF;

  INSERT INTO public.users (id, email, full_name, role, custom_role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuario ' || split_part(new.email, '@', 1)),
    _role,
    new.raw_user_meta_data->>'custom_role'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    custom_role = COALESCE(EXCLUDED.custom_role, public.users.custom_role);

  RETURN new;
END;
$function$;

-- 2a. Entrega no balcão: só usuário ativo; delivered_by vem do login, não do cliente.
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
  v_worker RECORD;
  v_site_id UUID;
  v_item_cat_id UUID;
  v_qty INT;
  v_unit_price NUMERIC;
  v_ca_number TEXT;
  v_lifespan INT;
  v_default_site_id UUID;
  v_res JSONB;
BEGIN
  -- p_delivered_by fica na assinatura só por compatibilidade com o frontend; o autor é o usuário logado.
  SELECT COALESCE(email, full_name) INTO v_actor
  FROM public.users
  WHERE id = auth.uid() AND deleted_at IS NULL;

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autenticado ou desativado.';
  END IF;

  -- 1. Trava e busca o pedido
  SELECT * INTO v_order
  FROM public.almoxarifado_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado.';
  END IF;

  IF v_order.status = 'DELIVERED' THEN
    RAISE EXCEPTION 'Este pedido já foi finalizado e entregue.';
  END IF;

  -- 2. Busca colaborador e determina canteiro de obra
  SELECT * INTO v_worker FROM public.workers WHERE id = v_order.worker_id;

  SELECT id INTO v_default_site_id
  FROM public.construction_sites
  WHERE status = 'ACTIVE'
  ORDER BY created_at ASC
  LIMIT 1;

  v_site_id := COALESCE(v_order.site_id, v_worker.current_site_id, v_default_site_id);

  -- 3. Itera sobre os itens do pedido
  FOR v_item IN SELECT * FROM jsonb_to_recordset(v_order.items) AS x(
    catalog_id UUID,
    name TEXT,
    quantity INT,
    size TEXT,
    ca_number TEXT,
    unit_price NUMERIC
  )
  LOOP
    v_item_cat_id := v_item.catalog_id;
    v_qty := COALESCE(v_item.quantity, 1);
    v_unit_price := COALESCE(v_item.unit_price, 0);

    -- Busca detalhes do catálogo para CA e vida útil
    SELECT ca_number, COALESCE(lifespan_days, 180)
    INTO v_ca_number, v_lifespan
    FROM public.epi_catalog
    WHERE id = v_item_cat_id;

    -- Insere registro legal em epi_assignments
    INSERT INTO public.epi_assignments (
      catalog_id,
      worker_id,
      quantity,
      unit_price_at_delivery,
      expected_return_date,
      digital_signature_url,
      audit_selfie_url,
      ca_number,
      condition_on_delivery,
      assigned_at
    ) VALUES (
      v_item_cat_id,
      v_order.worker_id,
      v_qty,
      v_unit_price,
      (CURRENT_DATE + (v_lifespan || ' days')::INTERVAL),
      p_signature_url,
      p_selfie_url,
      v_ca_number,
      'GOOD'::item_condition,
      NOW()
    );

    -- Desconta de site_inventory (trigger atualiza epi_catalog)
    IF v_site_id IS NOT NULL THEN
      UPDATE public.site_inventory
      SET quantity = GREATEST(0, quantity - v_qty),
          updated_at = NOW()
      WHERE site_id = v_site_id AND catalog_id = v_item_cat_id;

      IF NOT FOUND THEN
        INSERT INTO public.site_inventory (site_id, catalog_id, quantity, updated_at)
        VALUES (v_site_id, v_item_cat_id, 0, NOW())
        ON CONFLICT DO NOTHING;
      END IF;
    ELSE
      UPDATE public.epi_catalog
      SET current_stock = GREATEST(0, current_stock - v_qty)
      WHERE id = v_item_cat_id;
    END IF;

    -- Registra auditoria em inventory_transactions com site_id
    INSERT INTO public.inventory_transactions (
      catalog_id,
      worker_id,
      site_id,
      transaction_type,
      quantity_change,
      notes,
      created_at
    ) VALUES (
      v_item_cat_id,
      v_order.worker_id,
      v_site_id,
      'SAIDA_ENTREGA',
      -v_qty,
      'Entrega via Painel KDS Almoxarifado - Pedido #' || v_order.order_number,
      NOW()
    );
  END LOOP;

  -- 4. Marca pedido como DELIVERED
  UPDATE public.almoxarifado_orders
  SET status = 'DELIVERED',
      delivered_at = NOW(),
      delivered_by = v_actor,
      signature_url = p_signature_url,
      selfie_url = p_selfie_url,
      site_id = v_site_id,
      updated_at = NOW()
  WHERE id = p_order_id;

  -- 5. Retorna o registro atualizado
  SELECT to_jsonb(o) INTO v_res
  FROM public.almoxarifado_orders o
  WHERE o.id = p_order_id;

  RETURN v_res;
END;
$function$;

-- 2b. Estorno/cancelamento: mesma regra de autor.
CREATE OR REPLACE FUNCTION public.cancel_or_delete_almoxarifado_order(p_order_id uuid, p_cancelled_by text, p_reason text DEFAULT 'Cancelamento/Exclusão solicitada pelo Administrador'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_actor TEXT;
  v_order RECORD;
  v_item RECORD;
  v_qty INT;
  v_cat_id UUID;
  v_site_id UUID;
  v_res JSONB;
BEGIN
  -- p_cancelled_by fica na assinatura só por compatibilidade com o frontend; o autor é o usuário logado.
  SELECT COALESCE(email, full_name) INTO v_actor
  FROM public.users
  WHERE id = auth.uid() AND deleted_at IS NULL;

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autenticado ou desativado.';
  END IF;

  -- 1. Trava o registro do pedido
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

  v_site_id := v_order.site_id;

  -- 2. Se o pedido já tinha sido entregue (DELIVERED), realizamos o estorno físico e contábil
  IF v_order.status = 'DELIVERED' THEN
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_order.items) AS x(
      catalog_id UUID,
      name TEXT,
      quantity INT,
      size TEXT,
      ca_number TEXT,
      unit_price NUMERIC
    )
    LOOP
      v_cat_id := v_item.catalog_id;
      v_qty := COALESCE(v_item.quantity, 1);

      -- 2a. Devolve as unidades ao estoque da obra (site_inventory)
      IF v_site_id IS NOT NULL THEN
        UPDATE public.site_inventory
        SET quantity = quantity + v_qty,
            updated_at = NOW()
        WHERE site_id = v_site_id AND catalog_id = v_cat_id;

        IF NOT FOUND THEN
          INSERT INTO public.site_inventory (site_id, catalog_id, quantity, updated_at)
          VALUES (v_site_id, v_cat_id, v_qty, NOW())
          ON CONFLICT DO NOTHING;
        END IF;
      ELSE
        UPDATE public.epi_catalog
        SET current_stock = current_stock + v_qty
        WHERE id = v_cat_id;
      END IF;

      -- 2b. Marca a cautela de epi_assignments como estornada (soft-delete)
      UPDATE public.epi_assignments
      SET deleted_at = NOW(),
          condition_on_return = 'ESTORNO_BALCAO'
      WHERE worker_id = v_order.worker_id
        AND catalog_id = v_cat_id
        AND deleted_at IS NULL
        AND (
          (v_order.signature_url IS NOT NULL AND digital_signature_url = v_order.signature_url)
          OR (assigned_at >= (v_order.delivered_at - INTERVAL '3 minutes') AND assigned_at <= (v_order.delivered_at + INTERVAL '3 minutes'))
        );

      -- 2c. Registra o estorno em inventory_transactions (Kardex positivo)
      INSERT INTO public.inventory_transactions (
        catalog_id,
        worker_id,
        site_id,
        transaction_type,
        quantity_change,
        notes,
        created_at
      ) VALUES (
        v_cat_id,
        v_order.worker_id,
        v_site_id,
        'ESTORNO_ENTREGA',
        v_qty,
        'Estorno comanda #' || v_order.order_number || ' - ' || COALESCE(p_reason, 'Cancelado pelo administrador'),
        NOW()
      );
    END LOOP;
  END IF;

  -- 3. Atualiza almoxarifado_orders com soft-delete
  UPDATE public.almoxarifado_orders
  SET status = 'CANCELLED',
      deleted_at = NOW(),
      cancellation_reason = p_reason,
      cancelled_by = v_actor,
      updated_at = NOW()
  WHERE id = p_order_id;

  SELECT to_jsonb(o) INTO v_res
  FROM public.almoxarifado_orders o
  WHERE o.id = p_order_id;

  RETURN v_res;
END;
$function$;

-- 3. Transferência: sem linha na origem = saldo zero.
--    Antes usava o total do catálogo (soma de todas as obras) como saldo da origem e criava estoque do nada.
CREATE OR REPLACE FUNCTION public.transfer_epi_send(p_catalog_id uuid, p_origin_site_id uuid, p_destination_site_id uuid, p_quantity integer, p_sender_id uuid, p_sender_name text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_transfer_id UUID;
    v_origin_stock INTEGER;
BEGIN
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'A quantidade deve ser maior que zero.';
    END IF;

    IF p_origin_site_id = p_destination_site_id THEN
        RAISE EXCEPTION 'A obra de origem e destino devem ser diferentes.';
    END IF;

    SELECT quantity INTO v_origin_stock
    FROM public.site_inventory
    WHERE site_id = p_origin_site_id AND catalog_id = p_catalog_id
    FOR UPDATE;

    IF COALESCE(v_origin_stock, 0) < p_quantity THEN
        RAISE EXCEPTION 'Saldo insuficiente na obra de origem (disponível: %)', COALESCE(v_origin_stock, 0);
    END IF;

    UPDATE public.site_inventory
    SET quantity = quantity - p_quantity, updated_at = NOW()
    WHERE site_id = p_origin_site_id AND catalog_id = p_catalog_id;

    INSERT INTO public.site_transfers (
        catalog_id,
        origin_site_id,
        destination_site_id,
        quantity,
        status,
        sender_user_id,
        sender_name,
        sent_at,
        notes
    ) VALUES (
        p_catalog_id,
        p_origin_site_id,
        p_destination_site_id,
        p_quantity,
        'EM_TRANSITO',
        p_sender_id,
        p_sender_name,
        NOW(),
        p_notes
    ) RETURNING id INTO v_transfer_id;

    RETURN v_transfer_id;
END;
$function$;
