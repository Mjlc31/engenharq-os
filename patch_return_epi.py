with open('supabase/schema.sql', 'r') as f:
    schema = f.read()

old_func = """CREATE OR REPLACE FUNCTION public.return_epi(p_epi_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_assignment_id UUID;
BEGIN
  -- Find active assignment
  SELECT id INTO v_assignment_id
  FROM public.epi_assignments
  WHERE epi_id = p_epi_id AND returned_at IS NULL
  LIMIT 1;

  IF v_assignment_id IS NOT NULL THEN
    -- Complete assignment
    UPDATE public.epi_assignments
    SET returned_at = timezone('utc'::text, now()), condition_on_return = 'GOOD'
    WHERE id = v_assignment_id;
  END IF;

  -- Update inventory
  UPDATE public.epi_inventory
  SET status = 'AVAILABLE', updated_at = timezone('utc'::text, now())
  WHERE id = p_epi_id;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;"""

new_func = """CREATE OR REPLACE FUNCTION public.return_epi(p_worker_id UUID, p_epi_id UUID, p_condition item_condition DEFAULT 'GOOD'::item_condition)
RETURNS BOOLEAN AS $$
DECLARE
  v_assignment_id UUID;
BEGIN
  -- Find active assignment
  SELECT id INTO v_assignment_id
  FROM public.epi_assignments
  WHERE epi_id = p_epi_id AND worker_id = p_worker_id AND returned_at IS NULL
  LIMIT 1;

  IF v_assignment_id IS NOT NULL THEN
    -- Complete assignment
    UPDATE public.epi_assignments
    SET returned_at = timezone('utc'::text, now()), condition_on_return = p_condition
    WHERE id = v_assignment_id;
  END IF;

  -- Update inventory based on condition
  IF p_condition = 'DAMAGED' OR p_condition = 'LOST' THEN
    UPDATE public.epi_inventory
    SET status = p_condition::text::epi_status, updated_at = timezone('utc'::text, now())
    WHERE id = p_epi_id;
  ELSE
    UPDATE public.epi_inventory
    SET status = 'AVAILABLE', updated_at = timezone('utc'::text, now())
    WHERE id = p_epi_id;
  END IF;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;"""

schema = schema.replace(old_func, new_func)

with open('supabase/schema.sql', 'w') as f:
    f.write(schema)
