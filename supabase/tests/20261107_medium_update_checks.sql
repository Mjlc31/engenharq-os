-- Testes dos itens médios que precisam de UPDATE (20261107040000_medium_priority_fixes).
-- Rodar pelo MCP execute_sql ou no SQL Editor. Termina com RAISE: tudo é revertido.
-- Esperado: "M21 almox alterou=0 admin alterou=1" e "M23b updated_at mudou=true".
DO $$
DECLARE
  r text := '';
  v_admin uuid := (SELECT id FROM public.users WHERE email = 'admin@engenharq.com');
  v_almox uuid := (SELECT id FROM public.users WHERE email = 'almoxarifado@engenharq.com');
  v_site uuid := (SELECT id FROM public.construction_sites LIMIT 1);
  n int; m int; t0 timestamptz; t1 timestamptz;
BEGIN
  -- M21 almoxarife não altera o texto legal da Ficha de EPI; admin altera
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_almox, 'role', 'authenticated')::text, true);
    UPDATE public.system_settings SET company_name = 'HACK';
    GET DIAGNOSTICS n = ROW_COUNT;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    UPDATE public.system_settings SET company_name = company_name;
    GET DIAGNOSTICS m = ROW_COUNT;
    RESET ROLE;
    r := r || 'M21 almox alterou=' || n || ' admin alterou=' || m || ' | ';
  EXCEPTION WHEN OTHERS THEN r := r || 'M21 FALHOU: ' || left(SQLERRM, 70) || ' | '; END;
  RESET ROLE;

  -- M23b updated_at é atualizado pelo trigger
  BEGIN
    SELECT updated_at INTO t0 FROM public.construction_sites WHERE id = v_site;
    PERFORM pg_sleep(0.01);
    UPDATE public.construction_sites SET name = name WHERE id = v_site;
    SELECT updated_at INTO t1 FROM public.construction_sites WHERE id = v_site;
    r := r || 'M23b updated_at mudou=' || (t1 > COALESCE(t0, '-infinity'));
  EXCEPTION WHEN OTHERS THEN r := r || 'M23b FALHOU: ' || left(SQLERRM, 70); END;

  RAISE EXCEPTION 'RESULTADOS (tudo revertido): %', r;
END $$;
