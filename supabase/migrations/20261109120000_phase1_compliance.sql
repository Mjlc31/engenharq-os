-- =====================================================================================
-- Fase 1 da análise de arquitetura (2026-11-09): compliance e consistência, baixo risco.
-- =====================================================================================

-- 1. Entrega registra QUANDO foi lançada e POR QUEM (assigned_at é a data declarada e pode ser retroativa).
--    Linhas antigas ficam com created_at nulo = "lançada antes deste controle" (não dá para atualizar:
--    3 delas têm assinatura em base64 e a trava de assinatura recusaria o UPDATE).
ALTER TABLE public.epi_assignments
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
-- Default só depois de criar a coluna: com o default junto, as linhas antigas receberiam a data de hoje.
ALTER TABLE public.epi_assignments ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.epi_assignments
  ADD CONSTRAINT epi_assignments_created_at_required CHECK (created_at IS NOT NULL) NOT VALID;
CREATE INDEX IF NOT EXISTS idx_epi_assignments_created_by ON public.epi_assignments(created_by);

CREATE OR REPLACE FUNCTION private.stamp_assignment_creation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $$
BEGIN
  -- O cliente não escolhe esses valores: vêm do relógio do banco e do login.
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.created_by := auth.uid();
  ELSE
    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stamp_assignment_creation
  BEFORE INSERT OR UPDATE ON public.epi_assignments
  FOR EACH ROW EXECUTE FUNCTION private.stamp_assignment_creation();

-- 2. Anulação de ASO, treinamento e medida disciplinar (não há exclusão física: corrige-se anulando com motivo)
ALTER TABLE public.worker_asos
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.worker_trainings
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.disciplinary_records
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS void_reason text;

CREATE OR REPLACE FUNCTION private.guard_void()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $$
BEGIN
  IF OLD.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'Registro anulado não pode ser alterado.';
  END IF;

  IF NEW.voided_at IS NOT NULL THEN
    IF COALESCE((SELECT public.current_user_role()) IN ('ADMIN', 'SAFETY_ENGINEER'), false) IS NOT TRUE THEN
      RAISE EXCEPTION 'Só Administrador ou Engenharia SST podem anular registros.';
    END IF;
    IF length(trim(COALESCE(NEW.void_reason, ''))) < 5 THEN
      RAISE EXCEPTION 'Informe o motivo da anulação (mínimo 5 caracteres).';
    END IF;
    NEW.voided_at := now();
    NEW.voided_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_void BEFORE UPDATE ON public.worker_asos FOR EACH ROW EXECUTE FUNCTION private.guard_void();
CREATE TRIGGER trg_guard_void BEFORE UPDATE ON public.worker_trainings FOR EACH ROW EXECUTE FUNCTION private.guard_void();
CREATE TRIGGER trg_guard_void BEFORE UPDATE ON public.disciplinary_records FOR EACH ROW EXECUTE FUNCTION private.guard_void();

-- Aptidão do colaborador vem sempre do ASO válido mais recente (anular o último volta para o anterior)
CREATE OR REPLACE FUNCTION public.sync_worker_aso_fitness()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v record;
BEGIN
  SELECT issued_at, fit_for_height, fit_for_confined_space INTO v
  FROM public.worker_asos
  WHERE worker_id = NEW.worker_id AND voided_at IS NULL
  ORDER BY issued_at DESC, created_at DESC
  LIMIT 1;

  UPDATE public.workers
  SET aso_date = v.issued_at,
      apt_for_height = COALESCE(v.fit_for_height, false),
      apt_for_confined_space = COALESCE(v.fit_for_confined_space, false),
      apt_for_height_and_confined_space = COALESCE(v.fit_for_height AND v.fit_for_confined_space, false)
  WHERE id = NEW.worker_id;
  RETURN NEW;
END;
$function$;

-- 3. Exclusão em cascata trocada por RESTRICT: apagar colaborador, EPI, obra ou treinamento
--    nunca leva junto entregas, ASOs, medidas, Kardex ou estoque (os triggers já bloqueavam; agora a regra declara isso).
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conrelid::regclass AS tbl, conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE contype = 'f' AND connamespace = 'public'::regnamespace AND confdeltype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.tbl, c.conname);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s', c.tbl, c.conname, replace(c.def, 'ON DELETE CASCADE', 'ON DELETE RESTRICT'));
  END LOOP;
END $$;

-- 4. Código do EPI: code e tracking_code são o mesmo identificador; 20 itens estavam com tracking_code vazio
UPDATE public.epi_catalog SET tracking_code = code WHERE tracking_code IS NULL AND code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_epi_catalog_code_tracking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Os dois campos sempre iguais; code prevalece quando vierem diferentes.
  NEW.code := COALESCE(NEW.code, NEW.tracking_code);
  NEW.tracking_code := NEW.code;
  IF NEW.name IS NULL THEN
    NEW.name := COALESCE(NEW.category, 'Equipamento de Proteção');
  END IF;
  RETURN NEW;
END;
$function$;

ALTER TABLE public.epi_catalog ADD CONSTRAINT epi_catalog_code_key UNIQUE (code);

-- 5. Valores conhecidos de status e condição de devolução
ALTER TABLE public.epi_catalog
  ADD CONSTRAINT epi_catalog_status_check CHECK (status IN ('ACTIVE', 'AVAILABLE', 'IN_USE', 'MAINTENANCE', 'DISCARDED'));
ALTER TABLE public.construction_sites
  ADD CONSTRAINT construction_sites_status_check CHECK (status IN ('ACTIVE', 'FINISHED'));
ALTER TABLE public.epi_assignments
  ADD CONSTRAINT epi_assignments_condition_on_return_check
  CHECK (condition_on_return IN ('GOOD', 'DAMAGED', 'LOST', 'DISCARDED', 'ESTORNO_BALCAO'));
