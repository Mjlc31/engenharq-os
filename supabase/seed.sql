-- 1. Insert initial mock Construction Sites in Maceió
INSERT INTO public.construction_sites (name, latitude, longitude) VALUES
  ('Obra Ponta Verde', -9.6631, -35.7027),
  ('Residencial Pajuçara', -9.6705, -35.7143),
  ('Complexo Jatiúca', -9.6452, -35.6980);

-- 2. Insert some Mock Workers
INSERT INTO public.workers (full_name, cpf, registration_number, current_site_id)
SELECT 
  'João da Silva', 
  '123.456.789-01', 
  'MAT-001', 
  id 
FROM public.construction_sites WHERE name = 'Obra Ponta Verde' LIMIT 1;

INSERT INTO public.workers (full_name, cpf, registration_number, current_site_id)
SELECT 
  'Maria Oliveira', 
  '987.654.321-09', 
  'MAT-002', 
  id 
FROM public.construction_sites WHERE name = 'Residencial Pajuçara' LIMIT 1;

-- 2. Insert some Mock EPI Inventory
INSERT INTO public.epi_inventory (category, tracking_code, status, ca_number, size, ca_expiration_date, recommended_lifespan_days)
VALUES
  ('Capacete', 'CAP-001', 'AVAILABLE', '31469', 'Único', '2026-12-31', 180),
  ('Capacete', 'CAP-002', 'AVAILABLE', '31469', 'Único', '2026-12-31', 180),
  ('Bota', 'BOT-001', 'AVAILABLE', '12345', '41', '2025-05-15', 365),
  ('Luva', 'LUV-001', 'AVAILABLE', '98765', 'G', '2024-08-10', 90);

-- 3. Storage buckets (If not created via dashboard)
-- Note: You might need to create these buckets manually in the Storage section if the SQL below doesn't work depending on your Supabase permissions.
INSERT INTO storage.buckets (id, name, public) VALUES ('epi-receipts', 'epi-receipts', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('worker-photos', 'worker-photos', true) ON CONFLICT DO NOTHING;
