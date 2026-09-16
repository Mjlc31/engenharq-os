CREATE OR REPLACE FUNCTION public.assign_epi(p_worker_id UUID, p_epi_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert into assignments
  INSERT INTO public.epi_assignments (epi_id, worker_id, condition_on_delivery)
  VALUES (p_epi_id, p_worker_id, 'GOOD'::item_condition);

  -- Update inventory status
  UPDATE public.epi_inventory
  SET status = 'IN_USE', updated_at = timezone('utc'::text, now())
  WHERE id = p_epi_id;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
