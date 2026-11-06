-- Testes de escrita direta do cliente contra as regras de 20261106160000 (estoque, Kardex, RLS).
-- Rodar no SQL Editor (o MCP recusa UPDATE/DELETE). Termina com RAISE: tudo é revertido
-- e o resultado aparece na mensagem de erro. Esperado: todas as linhas com "ok".
DO $$
DECLARE
  r text := '';
  v_admin uuid := (SELECT id FROM public.users WHERE email = 'admin@engenharq.com');
  v_almox uuid := (SELECT id FROM public.users WHERE email = 'almoxarifado@engenharq.com');
  v_target uuid := (SELECT id FROM public.users WHERE email = 'almoxarife.teste@engenharq.com');
  v_worker uuid; v_site uuid; v_cat uuid; v_dest uuid; v_a uuid; v_order uuid; v_tid uuid;
  rc int; q0 int; q1 int; c0 int; c1 int; t text;
BEGIN
  SELECT id, current_site_id INTO v_worker, v_site FROM public.workers WHERE deleted_at IS NULL AND current_site_id IS NOT NULL LIMIT 1;
  SELECT catalog_id INTO v_cat FROM public.site_inventory WHERE site_id = v_site ORDER BY quantity DESC LIMIT 1;
  SELECT id INTO v_dest FROM public.construction_sites WHERE id <> v_site LIMIT 1;

  -- A1 alterar a quantidade de uma entrega
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    INSERT INTO public.epi_assignments (catalog_id, worker_id, quantity) VALUES (v_cat, v_worker, 1) RETURNING id INTO v_a;
    UPDATE public.epi_assignments SET quantity = 5 WHERE id = v_a;
    r := r || 'A1 FALHOU | ';
  EXCEPTION WHEN OTHERS THEN r := r || 'A1 ok | '; END;
  RESET ROLE;

  -- A2 desfazer uma devolução
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    INSERT INTO public.epi_assignments (catalog_id, worker_id, quantity) VALUES (v_cat, v_worker, 1) RETURNING id INTO v_a;
    PERFORM public.return_epi(v_a, 'GOOD');
    UPDATE public.epi_assignments SET returned_at = NULL WHERE id = v_a;
    r := r || 'A2 FALHOU | ';
  EXCEPTION WHEN OTHERS THEN r := r || 'A2 ok | '; END;
  RESET ROLE;

  -- A3 escrever direto em site_inventory e em epi_catalog.current_stock
  BEGIN
    SELECT quantity INTO q0 FROM public.site_inventory WHERE site_id = v_site AND catalog_id = v_cat;
    SELECT current_stock INTO c0 FROM public.epi_catalog WHERE id = v_cat;
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    UPDATE public.site_inventory SET quantity = 99999 WHERE site_id = v_site AND catalog_id = v_cat;
    UPDATE public.epi_catalog SET current_stock = 99999 WHERE id = v_cat;
    RESET ROLE;
    SELECT quantity INTO q1 FROM public.site_inventory WHERE site_id = v_site AND catalog_id = v_cat;
    SELECT current_stock INTO c1 FROM public.epi_catalog WHERE id = v_cat;
    r := r || CASE WHEN q0 = q1 AND c0 = c1 THEN 'A3 ok' ELSE 'A3 FALHOU' END || ' (obra ' || q0 || '->' || q1 || ', catálogo ' || c0 || '->' || c1 || ') | ';
  EXCEPTION WHEN OTHERS THEN r := r || 'A3 ok (erro) | '; END;
  RESET ROLE;

  -- A4 editar ou apagar o Kardex (nem como postgres)
  BEGIN
    UPDATE public.inventory_transactions SET quantity_change = 0 WHERE id = (SELECT id FROM public.inventory_transactions LIMIT 1);
    r := r || 'A4a FALHOU | ';
  EXCEPTION WHEN OTHERS THEN r := r || 'A4a ok | '; END;
  BEGIN
    DELETE FROM public.inventory_transactions WHERE id = (SELECT id FROM public.inventory_transactions LIMIT 1);
    r := r || 'A4b FALHOU | ';
  EXCEPTION WHEN OTHERS THEN r := r || 'A4b ok | '; END;

  -- A5 exclusão física de colaborador e de EPI do catálogo
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    DELETE FROM public.workers WHERE id = v_worker;
    GET DIAGNOSTICS rc = ROW_COUNT;
    r := r || CASE WHEN rc = 0 THEN 'A5a ok (0 linhas) | ' ELSE 'A5a FALHOU | ' END;
  EXCEPTION WHEN OTHERS THEN r := r || 'A5a ok | '; END;
  RESET ROLE;
  BEGIN
    DELETE FROM public.epi_catalog WHERE id = v_cat;
    r := r || 'A5b FALHOU (postgres apagou catálogo) | ';
  EXCEPTION WHEN OTHERS THEN r := r || 'A5b ok | '; END;

  -- A6 marcar comanda como DELIVERED direto
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_almox, 'role', 'authenticated')::text, true);
    INSERT INTO public.almoxarifado_orders (worker_id, status, items) VALUES (v_worker, 'PREPARING', '[]') RETURNING id INTO v_order;
    UPDATE public.almoxarifado_orders SET status = 'DELIVERED' WHERE id = v_order;
    r := r || 'A6 FALHOU | ';
  EXCEPTION WHEN OTHERS THEN r := r || 'A6 ok | '; END;
  RESET ROLE;

  -- A7 mudar status de transferência direto
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_almox, 'role', 'authenticated')::text, true);
    v_tid := public.transfer_epi_send(v_cat, v_site, v_dest, 1, v_almox, 'teste');
    UPDATE public.site_transfers SET status = 'RECEBIDO' WHERE id = v_tid;
    GET DIAGNOSTICS rc = ROW_COUNT;
    SELECT status::text INTO t FROM public.site_transfers WHERE id = v_tid;
    r := r || CASE WHEN rc = 0 AND t = 'EM_TRANSITO' THEN 'A7 ok | ' ELSE 'A7 FALHOU | ' END;
  EXCEPTION WHEN OTHERS THEN r := r || 'A7 ok (erro) | '; END;
  RESET ROLE;

  -- A8 desativar bane no auth; reativar desbane
  BEGIN
    UPDATE public.users SET deleted_at = now() WHERE id = v_target;
    SELECT COALESCE(banned_until::text, 'NULL') INTO t FROM auth.users WHERE id = v_target;
    UPDATE public.users SET deleted_at = NULL WHERE id = v_target;
    SELECT t || ' -> ' || COALESCE(banned_until::text, 'NULL') INTO t FROM auth.users WHERE id = v_target;
    r := r || 'A8 ' || t;
  EXCEPTION WHEN OTHERS THEN r := r || 'A8 FALHOU: ' || left(SQLERRM, 80); END;

  RAISE EXCEPTION 'RESULTADOS (tudo revertido): %', r;
END $$;
