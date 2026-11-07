-- Item 17: assinatura nova só como URL do storage (uploadSignature). Base64 inchava as linhas em ~20 KB.
-- NOT VALID: as 5 assinaturas antigas em base64 ficam como histórico; vale para inserts/updates daqui em diante.
ALTER TABLE public.almoxarifado_orders
  ADD CONSTRAINT almoxarifado_orders_signature_not_base64 CHECK (signature_url NOT LIKE 'data:%') NOT VALID;
ALTER TABLE public.epi_assignments
  ADD CONSTRAINT epi_assignments_signature_not_base64 CHECK (digital_signature_url NOT LIKE 'data:%') NOT VALID,
  ADD CONSTRAINT epi_assignments_return_signature_not_base64 CHECK (return_signature_url NOT LIKE 'data:%') NOT VALID;
