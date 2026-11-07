-- 1) Almoxarifado entrega e devolve EPI pelo Scanner/Operações (antes só pelo KDS).
--    O trigger trg_epi_assignment_stock já debita/credita a obra e grava o Kardex de forma atômica.
DROP POLICY IF EXISTS "Admins and Engineers can insert assignments" ON public.epi_assignments;
DROP POLICY IF EXISTS "Admins and Engineers can update assignments" ON public.epi_assignments;

CREATE POLICY "Operadores podem registrar cautelas" ON public.epi_assignments
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_user_role()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER', 'ALMOXARIFADO'));

CREATE POLICY "Operadores podem atualizar cautelas" ON public.epi_assignments
  FOR UPDATE TO authenticated
  USING ((SELECT public.current_user_role()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER', 'ALMOXARIFADO'))
  WITH CHECK ((SELECT public.current_user_role()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER', 'ALMOXARIFADO'));

-- 2) Evidências legais (assinaturas, selfies, recibos, foto de referência) não podem ser sobrescritas.
CREATE POLICY "Evidências não podem ser sobrescritas" ON storage.objects
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (bucket_id <> ALL (ARRAY['epi-receipts', 'epi-evidence', 'sst-evidence', 'worker-photos']));
