-- Auditoria aba por aba (10/11/2026), itens 1 e 2 do backlog.

-- 1) Status da cautela num lugar só: estorno é soft delete, extravio é devolução com condição LOST.
ALTER TABLE public.epi_assignments
  ADD COLUMN IF NOT EXISTS lifecycle_status text GENERATED ALWAYS AS (
    CASE
      WHEN deleted_at IS NOT NULL THEN 'ESTORNADA'
      WHEN returned_at IS NULL THEN 'ATIVA'
      WHEN condition_on_return = 'LOST' THEN 'EXTRAVIADA'
      ELSE 'DEVOLVIDA'
    END
  ) STORED;

-- 2) EPI só sai do catálogo sem saldo nas obras e sem cautela ativa (senão o saldo e a cautela ficam órfãos).
CREATE OR REPLACE FUNCTION private.guard_catalog_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_saldo integer;
  v_ativas integer;
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity), 0) INTO v_saldo FROM public.site_inventory WHERE catalog_id = OLD.id;
    IF v_saldo > 0 THEN
      RAISE EXCEPTION 'O EPI "%" ainda tem % un em estoque. Registre o descarte ou zere o saldo das obras antes de excluir.', OLD.name, v_saldo;
    END IF;

    SELECT count(*) INTO v_ativas FROM public.epi_assignments
    WHERE catalog_id = OLD.id AND deleted_at IS NULL AND returned_at IS NULL;
    IF v_ativas > 0 THEN
      RAISE EXCEPTION 'O EPI "%" está em % cautela(s) ativa(s). Registre a devolução ou o extravio antes de excluir.', OLD.name, v_ativas;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_catalog_delete ON public.epi_catalog;
CREATE TRIGGER trg_guard_catalog_delete
  BEFORE UPDATE OF deleted_at ON public.epi_catalog
  FOR EACH ROW EXECUTE FUNCTION private.guard_catalog_delete();

-- 3) Colaborador com EPI em posse não é excluído nem desligado (NR-6 / CLT 462: devolver ou registrar extravio antes).
CREATE OR REPLACE FUNCTION private.guard_worker_exit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_ativas integer;
BEGIN
  IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
     OR (NEW.status = 'DISMISSED' AND OLD.status IS DISTINCT FROM 'DISMISSED') THEN
    SELECT count(*) INTO v_ativas FROM public.epi_assignments
    WHERE worker_id = OLD.id AND deleted_at IS NULL AND returned_at IS NULL;
    IF v_ativas > 0 THEN
      RAISE EXCEPTION 'O colaborador "%" ainda está com % EPI(s). Registre a devolução ou o extravio em Operações antes de desligar ou excluir.', OLD.full_name, v_ativas;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_worker_exit ON public.workers;
CREATE TRIGGER trg_guard_worker_exit
  BEFORE UPDATE OF deleted_at, status ON public.workers
  FOR EACH ROW EXECUTE FUNCTION private.guard_worker_exit();
