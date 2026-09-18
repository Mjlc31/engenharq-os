-- Migration: Add batch RPCs for EPI assignments and returns
-- Criação de batch_assign_epi e batch_return_epi

CREATE OR REPLACE FUNCTION public.batch_assign_epi(p_assignments JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  v_item JSONB;
  v_worker_id UUID;
  v_catalog_id UUID;
  v_quantity INTEGER;
BEGIN
  -- Percorre o array de entregas
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_assignments)
  LOOP
    v_worker_id := (v_item->>'worker_id')::UUID;
    v_catalog_id := (v_item->>'catalog_id')::UUID;
    v_quantity := COALESCE((v_item->>'quantity')::INTEGER, 1);

    -- Insere um registro para cada unidade do EPI
    FOR i IN 1..v_quantity LOOP
      INSERT INTO public.epi_assignments (catalog_id, worker_id, condition_on_delivery)
      VALUES (v_catalog_id, v_worker_id, 'GOOD'::item_condition);
    END LOOP;

    -- Deduz do estoque a quantidade total entregue deste EPI
    UPDATE public.epi_catalog
    SET current_stock = current_stock - v_quantity
    WHERE id = v_catalog_id;
  END LOOP;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.batch_return_epi(p_returns JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  v_item JSONB;
  v_assignment_id UUID;
  v_condition item_condition;
  v_catalog_id UUID;
BEGIN
  -- Percorre o array de devoluções
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_returns)
  LOOP
    v_assignment_id := (v_item->>'assignment_id')::UUID;
    v_condition := COALESCE((v_item->>'condition')::text, 'GOOD')::item_condition;

    -- Busca o ID de catálogo a partir da atribuição (se ainda não devolvido)
    SELECT catalog_id INTO v_catalog_id
    FROM public.epi_assignments
    WHERE id = v_assignment_id AND returned_at IS NULL;

    IF v_catalog_id IS NOT NULL THEN
      -- Marca como devolvido
      UPDATE public.epi_assignments
      SET returned_at = timezone('utc'::text, now()), condition_on_return = v_condition
      WHERE id = v_assignment_id;

      -- Apenas retorna o item ao estoque se a condição for 'GOOD'
      IF v_condition = 'GOOD' THEN
        UPDATE public.epi_catalog
        SET current_stock = current_stock + 1
        WHERE id = v_catalog_id;
      END IF;
    END IF;
  END LOOP;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
