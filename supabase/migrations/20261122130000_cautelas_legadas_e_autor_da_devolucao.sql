-- QA 22/11/2026.
-- 1) Cautelas anteriores a 10/11 têm created_at nulo e a checagem epi_assignments_created_at_required
--    recusava qualquer UPDATE nelas (devolução, extravio, estorno). A trava preenche com assigned_at;
--    data já gravada continua imutável.
-- 2) P2-3: quem registrou a devolução/extravio fica gravado pelo banco (returned_by), não pelo frontend.
ALTER TABLE public.epi_assignments
  ADD COLUMN IF NOT EXISTS returned_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION private.stamp_assignment_creation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.created_by := auth.uid();
    NEW.returned_by := CASE WHEN NEW.returned_at IS NOT NULL THEN auth.uid() END;
  ELSE
    NEW.created_at := COALESCE(OLD.created_at, OLD.assigned_at, now());
    NEW.created_by := OLD.created_by;
    NEW.returned_by := CASE
      WHEN OLD.returned_at IS NULL AND NEW.returned_at IS NOT NULL THEN auth.uid()
      ELSE OLD.returned_by
    END;
  END IF;
  RETURN NEW;
END;
$function$;
