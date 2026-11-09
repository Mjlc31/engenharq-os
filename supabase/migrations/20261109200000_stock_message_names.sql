-- Mensagem de saldo insuficiente com o nome do EPI e da obra (antes: só números, o almoxarife não sabia onde faltava).
CREATE OR REPLACE FUNCTION private.move_stock(p_site uuid, p_catalog uuid, p_delta integer, p_type text, p_worker uuid, p_notes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
DECLARE
  v_qty integer;
  v_epi text;
  v_obra text;
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
    SELECT name INTO v_epi FROM public.epi_catalog WHERE id = p_catalog;
    SELECT name INTO v_obra FROM public.construction_sites WHERE id = p_site;
    RAISE EXCEPTION 'Sem saldo de "%" na obra "%" (tem %, precisa de %). Lance entrada de estoque ou transfira de outra obra.',
      COALESCE(v_epi, 'EPI'), COALESCE(v_obra, 'obra'), v_qty, -p_delta;
  END IF;

  UPDATE public.site_inventory
  SET quantity = v_qty + p_delta, updated_at = now()
  WHERE site_id = p_site AND catalog_id = p_catalog;

  INSERT INTO public.inventory_transactions (catalog_id, site_id, worker_id, transaction_type, quantity_change, notes, created_by)
  VALUES (p_catalog, p_site, p_worker, p_type, p_delta, p_notes, auth.uid());
END;
$$;
