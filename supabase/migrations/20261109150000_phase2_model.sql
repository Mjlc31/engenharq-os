-- =====================================================================================
-- Fase 2 da análise de arquitetura (2026-11-09): modelo.
--  1) Itens da comanda validados no banco (EPI existente e quantidade > 0).
--     Decisão: manter a lista dentro da comanda em vez de tabela própria; o risco real era
--     item inválido, e a mudança de estrutura exigiria reescrever KDS, telão, histórico e recibo.
--  2) Cargo do colaborador num histórico só (worker_roles_history); worker_roles fica sem uso.
--  3) Autor das ações gravado pelo login (quem pediu, entregou, cancelou, aplicou medida).
--  4) Trilha de alterações (audit_log) em colaboradores, EPIs, obras, usuários, treinamentos e configurações.
-- Atenção: a coluna workers."current_role" tem nome de palavra reservada; sem aspas o SQL devolve o usuário do banco.
-- =====================================================================================

-- 1. Itens da comanda
CREATE OR REPLACE FUNCTION private.validate_order_items()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $$
DECLARE
  e jsonb;
BEGIN
  FOR e IN SELECT value FROM jsonb_array_elements(NEW.items) LOOP
    IF jsonb_typeof(e) <> 'object'
       OR NOT EXISTS (SELECT 1 FROM public.epi_catalog c WHERE c.id::text = e->>'catalog_id' AND c.deleted_at IS NULL) THEN
      RAISE EXCEPTION 'Item da comanda com EPI inexistente ou excluído do catálogo.';
    END IF;
    IF COALESCE((e->>'quantity')::integer, 1) <= 0 THEN
      RAISE EXCEPTION 'Quantidade de cada item da comanda deve ser maior que zero.';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_order_items
  BEFORE INSERT OR UPDATE OF items ON public.almoxarifado_orders
  FOR EACH ROW EXECUTE FUNCTION private.validate_order_items();

-- 2. Cargo: histórico único
INSERT INTO public.worker_roles_history (worker_id, role_name, start_date, created_at)
SELECT wr.worker_id, wr.role_name, wr.start_date, wr.created_at
FROM public.worker_roles wr
WHERE NOT EXISTS (
  SELECT 1 FROM public.worker_roles_history h
  WHERE h.worker_id = wr.worker_id AND h.role_name = wr.role_name AND h.start_date = wr.start_date
);
-- worker_roles fica no banco sem uso (a exclusão foi adiada por decisão do Arthur); nenhuma tela lê ou grava nela.

-- workers."current_role" é o cargo em aberto mais recente do histórico
CREATE OR REPLACE FUNCTION private.sync_worker_current_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
BEGIN
  UPDATE public.workers w
  SET "current_role" = (
    SELECT h.role_name FROM public.worker_roles_history h
    WHERE h.worker_id = NEW.worker_id AND h.end_date IS NULL
    ORDER BY h.start_date DESC NULLS LAST, h.created_at DESC
    LIMIT 1
  )
  WHERE w.id = NEW.worker_id
    AND EXISTS (SELECT 1 FROM public.worker_roles_history h WHERE h.worker_id = NEW.worker_id AND h.end_date IS NULL);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_worker_current_role
  AFTER INSERT OR UPDATE ON public.worker_roles_history
  FOR EACH ROW EXECUTE FUNCTION private.sync_worker_current_role();

-- 3. Autores pelo login. Referência a public.users (e não auth.users) para as telas mostrarem o nome.
ALTER TABLE public.almoxarifado_orders
  ADD COLUMN IF NOT EXISTS requested_by_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivered_by_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled_by_id uuid REFERENCES public.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_almoxarifado_orders_delivered_by_id ON public.almoxarifado_orders(delivered_by_id);
CREATE INDEX IF NOT EXISTS idx_almoxarifado_orders_cancelled_by_id ON public.almoxarifado_orders(cancelled_by_id);
CREATE INDEX IF NOT EXISTS idx_almoxarifado_orders_requested_by_id ON public.almoxarifado_orders(requested_by_id);

CREATE OR REPLACE FUNCTION private.stamp_order_authors()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.requested_by_id := auth.uid();
    RETURN NEW;
  END IF;
  NEW.requested_by_id := OLD.requested_by_id;
  IF NEW.status = 'DELIVERED' AND OLD.status IS DISTINCT FROM 'DELIVERED' THEN
    NEW.delivered_by_id := auth.uid();
  ELSE
    NEW.delivered_by_id := OLD.delivered_by_id;
  END IF;
  IF NEW.status = 'CANCELLED' AND OLD.status IS DISTINCT FROM 'CANCELLED' THEN
    NEW.cancelled_by_id := auth.uid();
  ELSE
    NEW.cancelled_by_id := OLD.cancelled_by_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stamp_order_authors
  BEFORE INSERT OR UPDATE ON public.almoxarifado_orders
  FOR EACH ROW EXECUTE FUNCTION private.stamp_order_authors();

-- Medida disciplinar: applied_by = nome exibido; applied_by_id = quem lançou (pelo login)
-- Corrige as medidas antigas em que o nome foi gravado como código do usuário.
UPDATE public.disciplinary_records d
SET applied_by_id = u.id, applied_by = u.full_name
FROM public.users u
WHERE d.applied_by = u.id::text;

ALTER TABLE public.disciplinary_records DROP CONSTRAINT disciplinary_records_applied_by_id_fkey;
ALTER TABLE public.disciplinary_records
  ADD CONSTRAINT disciplinary_records_applied_by_id_fkey FOREIGN KEY (applied_by_id) REFERENCES public.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION private.stamp_disciplinary_author()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $$
BEGIN
  NEW.applied_by_id := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stamp_disciplinary_author
  BEFORE INSERT ON public.disciplinary_records
  FOR EACH ROW EXECUTE FUNCTION private.stamp_disciplinary_author();

-- Quem lançou a entrega e quem anulou também apontam para public.users
ALTER TABLE public.epi_assignments DROP CONSTRAINT epi_assignments_created_by_fkey;
ALTER TABLE public.epi_assignments
  ADD CONSTRAINT epi_assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.worker_asos DROP CONSTRAINT worker_asos_voided_by_fkey;
ALTER TABLE public.worker_asos
  ADD CONSTRAINT worker_asos_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.worker_trainings DROP CONSTRAINT worker_trainings_voided_by_fkey;
ALTER TABLE public.worker_trainings
  ADD CONSTRAINT worker_trainings_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.disciplinary_records DROP CONSTRAINT disciplinary_records_voided_by_fkey;
ALTER TABLE public.disciplinary_records
  ADD CONSTRAINT disciplinary_records_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 4. Trilha de alterações
CREATE TABLE public.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE')),
  changed_fields jsonb NOT NULL,
  changed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_record ON public.audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_changed_at ON public.audit_log(changed_at DESC);
CREATE INDEX idx_audit_log_changed_by ON public.audit_log(changed_by);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
-- Só leitura, e só para quem acessa a tela de Auditoria; ninguém grava pelo app (só o trigger, como dono).
CREATE POLICY "Governança lê a trilha" ON public.audit_log
  FOR SELECT TO authenticated
  USING ((SELECT public.current_user_role()) IN ('ADMIN', 'SAFETY_ENGINEER'));
CREATE TRIGGER trg_audit_log_immutable BEFORE UPDATE OR DELETE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION private.forbid_change();

CREATE OR REPLACE FUNCTION private.log_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
DECLARE
  v_fields jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_fields := to_jsonb(NEW) - 'updated_at' - 'created_at' - 'current_stock';
  ELSE
    -- Só o que mudou, com valor antigo e novo. current_stock já tem o Kardex; updated_at é ruído.
    SELECT jsonb_object_agg(o.key, jsonb_build_object('de', o.value, 'para', n.value))
    INTO v_fields
    FROM jsonb_each(to_jsonb(OLD)) o
    JOIN jsonb_each(to_jsonb(NEW)) n USING (key)
    WHERE o.value IS DISTINCT FROM n.value
      AND o.key NOT IN ('updated_at', 'current_stock');
    IF v_fields IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.audit_log (table_name, record_id, action, changed_fields, changed_by)
  VALUES (TG_TABLE_NAME, NEW.id, TG_OP, v_fields, auth.uid());
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_log AFTER INSERT OR UPDATE ON public.workers FOR EACH ROW EXECUTE FUNCTION private.log_change();
CREATE TRIGGER trg_audit_log AFTER INSERT OR UPDATE ON public.epi_catalog FOR EACH ROW EXECUTE FUNCTION private.log_change();
CREATE TRIGGER trg_audit_log AFTER INSERT OR UPDATE ON public.construction_sites FOR EACH ROW EXECUTE FUNCTION private.log_change();
CREATE TRIGGER trg_audit_log AFTER INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION private.log_change();
CREATE TRIGGER trg_audit_log AFTER INSERT OR UPDATE ON public.training_catalog FOR EACH ROW EXECUTE FUNCTION private.log_change();
CREATE TRIGGER trg_audit_log AFTER INSERT OR UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION private.log_change();
