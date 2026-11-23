-- QA 22/11/2026 (REQ-07), aprovada pelo Arthur: limpeza com rastro, sem DELETE.
-- 1) As 3 cautelas ativas do colaborador excluído "teste" passam a extraviadas (LOST não volta ao estoque).
--    Uma delas tem assinatura antiga em base64; a checagem é suspensa só dentro desta transação
--    e recriada idêntica (NOT VALID), sem tocar na assinatura.
ALTER TABLE public.epi_assignments DROP CONSTRAINT epi_assignments_signature_not_base64;
UPDATE public.epi_assignments SET returned_at = now(), condition_on_return = 'LOST'
WHERE id IN ('d20374d3-1e6f-4d4f-878f-9225ab61fae8','5fa044ec-9e73-467e-85f0-74194bb19afb','8f6f4a28-d358-44e0-ba51-a0e2e21a6478')
  AND returned_at IS NULL AND deleted_at IS NULL;
ALTER TABLE public.epi_assignments ADD CONSTRAINT epi_assignments_signature_not_base64 CHECK (digital_signature_url !~~ 'data:%') NOT VALID;

-- 2) Saldo parado em itens excluídos do catálogo é baixado com lançamento AJUSTE no Kardex.
DO $$
DECLARE x record;
BEGIN
  FOR x IN SELECT si.site_id, si.catalog_id, si.quantity
           FROM public.site_inventory si JOIN public.epi_catalog c ON c.id = si.catalog_id
           WHERE c.deleted_at IS NOT NULL AND si.quantity > 0 LOOP
    PERFORM private.move_stock(x.site_id, x.catalog_id, -x.quantity, 'AJUSTE', NULL,
      'Baixa de saldo de item excluído do catálogo (limpeza QA 22/11/2026)');
  END LOOP;
END $$;
