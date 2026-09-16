DROP FUNCTION IF EXISTS public.get_dashboard_alerts();
CREATE OR REPLACE FUNCTION public.get_dashboard_alerts()
RETURNS TABLE (
  assignment_id UUID,
  catalog_id UUID,
  worker_id UUID,
  worker_name TEXT,
  epi_name TEXT,
  ca_number TEXT,
  alert_type TEXT,
  days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ea.id AS assignment_id,
    ea.catalog_id,
    ea.worker_id,
    w.full_name AS worker_name,
    ec.name AS epi_name,
    ec.ca_number,
    'LIFESPAN' AS alert_type,
    (ec.lifespan_days - (EXTRACT(EPOCH FROM (now() - ea.assigned_at))/86400)::INTEGER) AS days_remaining
  FROM public.epi_assignments ea
  JOIN public.workers w ON w.id = ea.worker_id
  JOIN public.epi_catalog ec ON ec.id = ea.catalog_id
  WHERE ea.returned_at IS NULL 
    AND ec.lifespan_days IS NOT NULL
    AND (ec.lifespan_days - (EXTRACT(EPOCH FROM (now() - ea.assigned_at))/86400)::INTEGER) <= 30;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
