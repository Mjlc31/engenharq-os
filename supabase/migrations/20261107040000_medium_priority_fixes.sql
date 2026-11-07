-- =====================================================================================
-- Itens MÉDIOS da revisão do banco de 2026-11-06 (15, 16, 19, 21, 23 + search_path do ASO).
-- Já resolvidos antes: 14 e 18 (20261106160000), 20 e o resto do 12 (20261107023253, outra sessão).
-- O 17 (assinaturas em base64) depende do frontend e fica para a próxima migration.
-- =====================================================================================

-- 15. Alertas do dashboard: respeitar RLS (usuário ativo) e ignorar estornos, devolvidos e cadastros apagados
CREATE OR REPLACE FUNCTION public.get_dashboard_alerts()
 RETURNS TABLE(assignment_id uuid, catalog_id uuid, worker_id uuid, worker_name text, epi_name text, ca_number text, alert_type text, days_remaining integer)
 LANGUAGE plpgsql
 STABLE
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ea.id,
    ea.catalog_id,
    ea.worker_id,
    w.full_name,
    ec.name,
    ec.ca_number,
    'LIFESPAN'::text,
    (ec.lifespan_days - (EXTRACT(EPOCH FROM (now() - ea.assigned_at)) / 86400)::integer)
  FROM public.epi_assignments ea
  JOIN public.workers w ON w.id = ea.worker_id
  JOIN public.epi_catalog ec ON ec.id = ea.catalog_id
  WHERE ea.returned_at IS NULL
    AND ea.deleted_at IS NULL
    AND w.deleted_at IS NULL
    AND ec.deleted_at IS NULL
    AND ec.lifespan_days IS NOT NULL
    AND (ec.lifespan_days - (EXTRACT(EPOCH FROM (now() - ea.assigned_at)) / 86400)::integer) <= 30;
END;
$function$;

-- 16. Comanda: status conhecido e items sempre lista (quantidade <= 0 já é recusada pelo trigger da cautela)
ALTER TABLE public.almoxarifado_orders
  ADD CONSTRAINT almoxarifado_orders_status_check CHECK (status IN ('PREPARING', 'READY', 'DELIVERED', 'CANCELLED')),
  ADD CONSTRAINT almoxarifado_orders_items_array CHECK (jsonb_typeof(items) = 'array');

-- 19. Funções quebradas (referenciam tabelas que não existem) e sem uso
DROP FUNCTION IF EXISTS public.checkout_epi(uuid, uuid, date);
DROP FUNCTION IF EXISTS public.update_stock_from_operation();

-- 21. Texto legal da Ficha de EPI e logo: só ADMIN e Engenharia SST alteram (leitura continua pública)
DROP POLICY IF EXISTS "Settings can be inserted by authenticated users" ON public.system_settings;
DROP POLICY IF EXISTS "Settings can be updated by authenticated users" ON public.system_settings;
CREATE POLICY "Governança insere configurações" ON public.system_settings
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_user_role()) IN ('ADMIN', 'SAFETY_ENGINEER'));
CREATE POLICY "Governança altera configurações" ON public.system_settings
  FOR UPDATE TO authenticated
  USING ((SELECT public.current_user_role()) IN ('ADMIN', 'SAFETY_ENGINEER'))
  WITH CHECK ((SELECT public.current_user_role()) IN ('ADMIN', 'SAFETY_ENGINEER'));

-- 23a. Status do colaborador com um vocabulário só (o frontend usa estes quatro)
UPDATE public.workers SET status = 'ACTIVE' WHERE status = 'Ativo';
ALTER TABLE public.workers ALTER COLUMN status SET DEFAULT 'ACTIVE';
ALTER TABLE public.workers
  ADD CONSTRAINT workers_status_check CHECK (status IN ('ACTIVE', 'INACTIVE', 'DISMISSED', 'VACATION'));

-- 23b. updated_at automático em toda tabela que tem a coluna (antes só companies)
CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_workers_updated_at BEFORE UPDATE ON public.workers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_construction_sites_updated_at BEFORE UPDATE ON public.construction_sites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_epi_catalog_updated_at BEFORE UPDATE ON public.epi_catalog FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_site_inventory_updated_at BEFORE UPDATE ON public.site_inventory FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_almoxarifado_orders_updated_at BEFORE UPDATE ON public.almoxarifado_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ASO: search_path fixo e só o ASO mais recente define a aptidão do colaborador
-- (antes, editar um ASO antigo sobrescrevia a aptidão atual com dados velhos)
CREATE OR REPLACE FUNCTION public.sync_worker_aso_fitness()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.worker_asos
    WHERE worker_id = NEW.worker_id AND id <> NEW.id AND issued_at > NEW.issued_at
  ) THEN
    RETURN NEW;
  END IF;

  UPDATE public.workers
  SET aso_date = NEW.issued_at,
      apt_for_height = NEW.fit_for_height,
      apt_for_confined_space = NEW.fit_for_confined_space,
      apt_for_height_and_confined_space = (NEW.fit_for_height AND NEW.fit_for_confined_space),
      updated_at = NOW()
  WHERE id = NEW.worker_id;
  RETURN NEW;
END;
$function$;
