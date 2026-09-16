-- 1. Alter epi_assignments
ALTER TABLE public.epi_assignments ADD COLUMN catalog_id UUID REFERENCES public.epi_catalog(id) ON DELETE CASCADE;

-- Backfill catalog_id from epi_inventory
UPDATE public.epi_assignments 
SET catalog_id = (SELECT epi_catalog_id FROM public.epi_inventory WHERE public.epi_inventory.id = public.epi_assignments.epi_id);

-- Make catalog_id NOT NULL and drop epi_id
ALTER TABLE public.epi_assignments ALTER COLUMN catalog_id SET NOT NULL;
ALTER TABLE public.epi_assignments DROP COLUMN epi_id CASCADE;

-- 2. Update inventory_transactions
ALTER TABLE public.inventory_transactions ADD COLUMN catalog_id UUID REFERENCES public.epi_catalog(id) ON DELETE CASCADE;
UPDATE public.inventory_transactions 
SET catalog_id = (SELECT epi_catalog_id FROM public.epi_inventory WHERE public.epi_inventory.id = public.inventory_transactions.epi_id);
ALTER TABLE public.inventory_transactions ALTER COLUMN catalog_id SET NOT NULL;
ALTER TABLE public.inventory_transactions DROP COLUMN epi_id CASCADE;
ALTER TABLE public.inventory_transactions DROP COLUMN previous_status;
ALTER TABLE public.inventory_transactions DROP COLUMN new_status;
ALTER TABLE public.inventory_transactions ADD COLUMN quantity_change INTEGER DEFAULT 0;

-- 3. Drop triggers related to epi_inventory
DROP TRIGGER IF EXISTS trigger_update_catalog_stock ON public.epi_assignments;
DROP FUNCTION IF EXISTS update_catalog_stock_on_assignment();
DROP TRIGGER IF EXISTS on_epi_status_change ON public.epi_inventory;
DROP FUNCTION IF EXISTS public.log_inventory_transaction();

-- 4. Recreate RPC assign_epi
CREATE OR REPLACE FUNCTION public.assign_epi(p_worker_id UUID, p_catalog_id UUID, p_quantity INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
BEGIN
  -- We don't decrement here because we'll add a trigger on epi_assignments
  -- Wait, if we use a trigger, we don't need to do it in the RPC!
  -- But an RPC is cleaner. Let's do it in the RPC.
  FOR i IN 1..p_quantity LOOP
    INSERT INTO public.epi_assignments (catalog_id, worker_id, condition_on_delivery)
    VALUES (p_catalog_id, p_worker_id, 'GOOD'::item_condition);
  END LOOP;

  UPDATE public.epi_catalog
  SET current_stock = current_stock - p_quantity
  WHERE id = p_catalog_id;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recreate RPC return_epi
CREATE OR REPLACE FUNCTION public.return_epi(p_assignment_id UUID, p_condition item_condition DEFAULT 'GOOD'::item_condition)
RETURNS BOOLEAN AS $$
DECLARE
  v_catalog_id UUID;
BEGIN
  SELECT catalog_id INTO v_catalog_id
  FROM public.epi_assignments
  WHERE id = p_assignment_id AND returned_at IS NULL;

  IF v_catalog_id IS NOT NULL THEN
    UPDATE public.epi_assignments
    SET returned_at = timezone('utc'::text, now()), condition_on_return = p_condition
    WHERE id = p_assignment_id;

    -- Return to stock ONLY if it's in GOOD condition
    IF p_condition = 'GOOD' THEN
      UPDATE public.epi_catalog
      SET current_stock = current_stock + 1
      WHERE id = v_catalog_id;
    END IF;
  END IF;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Drop epi_inventory
DROP TABLE IF EXISTS public.epi_inventory CASCADE;
