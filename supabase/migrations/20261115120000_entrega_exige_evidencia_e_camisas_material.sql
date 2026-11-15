-- QA E2E de 15/11/2026: P1-1 (entrega sem assinatura passava no banco) e P1-3 (uniforme cadastrado como EPI sem CA).

-- 1) Uniforme não é EPI: sem CA, sai dos documentos NR-6. Só atinge camisas ativas sem CA.
UPDATE public.epi_catalog
SET item_type = 'MATERIAL'
WHERE item_type = 'EPI'
  AND deleted_at IS NULL
  AND ca_number IS NULL
  AND name ILIKE 'CAMISA %';

-- 2) Entrega exige evidência (assinatura ou selfie). Corpo igual ao que estava no banco, mais a trava.
CREATE OR REPLACE FUNCTION public.complete_almoxarifado_order(
  p_order_id uuid,
  p_delivered_by text,
  p_signature_url text DEFAULT NULL::text,
  p_selfie_url text DEFAULT NULL::text
)
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

  -- NR-6: sem assinatura nem selfie não há prova de entrega.
  IF NULLIF(btrim(p_signature_url), '') IS NULL AND NULLIF(btrim(p_selfie_url), '') IS NULL THEN
    RAISE EXCEPTION 'Entrega sem comprovante: colete a assinatura ou a selfie do colaborador antes de confirmar.';
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
