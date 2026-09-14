-- 1. Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  cnpj TEXT NOT NULL,
  state_registration TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  legal_representative TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Companies viewable by authenticated users" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Companies editable by admin" ON public.companies FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND (users.role = 'ADMIN' OR users.role = 'SAFETY_ENGINEER')
  )
);

CREATE TRIGGER set_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- 2. Alter construction_sites
ALTER TABLE public.construction_sites ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.construction_sites ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.construction_sites ADD COLUMN IF NOT EXISTS manager_name TEXT;
ALTER TABLE public.construction_sites ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE public.construction_sites ALTER COLUMN longitude DROP NOT NULL;

-- 3. Alter epi_catalog
ALTER TABLE public.epi_catalog ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.epi_catalog ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE public.epi_catalog ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

CREATE SEQUENCE IF NOT EXISTS epi_code_seq;

CREATE OR REPLACE FUNCTION generate_epi_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'EPI' || LPAD(nextval('epi_code_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_epi_code ON public.epi_catalog;
CREATE TRIGGER trigger_generate_epi_code
  BEFORE INSERT ON public.epi_catalog
  FOR EACH ROW
  EXECUTE PROCEDURE generate_epi_code();

-- 4. Sync worker_roles to workers.current_role
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS current_role TEXT;

CREATE OR REPLACE FUNCTION sync_current_role()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.workers
  SET current_role = NEW.role_name
  WHERE id = NEW.worker_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_current_role ON public.worker_roles;
CREATE TRIGGER trigger_sync_current_role
  AFTER INSERT OR UPDATE ON public.worker_roles
  FOR EACH ROW
  EXECUTE PROCEDURE sync_current_role();

-- 5. Auto update current_stock in epi_catalog based on epi_assignments
-- Note: 'assign_epi' sets returned_at = NULL. 'return_epi' sets returned_at = NOW().
CREATE OR REPLACE FUNCTION update_catalog_stock_on_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_catalog_id UUID;
BEGIN
  -- We need to find the catalog_id from epi_inventory
  SELECT epi_catalog_id INTO v_catalog_id FROM public.epi_inventory WHERE id = NEW.epi_id;
  
  IF v_catalog_id IS NOT NULL THEN
    -- If assigning (INSERT or returned_at is still NULL)
    IF TG_OP = 'INSERT' AND NEW.returned_at IS NULL THEN
      UPDATE public.epi_catalog SET current_stock = GREATEST(0, COALESCE(current_stock, 0) - 1) WHERE id = v_catalog_id;
    END IF;
    -- If returning (UPDATE and returned_at became NOT NULL)
    IF TG_OP = 'UPDATE' AND OLD.returned_at IS NULL AND NEW.returned_at IS NOT NULL THEN
      UPDATE public.epi_catalog SET current_stock = COALESCE(current_stock, 0) + 1 WHERE id = v_catalog_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_catalog_stock ON public.epi_assignments;
CREATE TRIGGER trigger_update_catalog_stock
  AFTER INSERT OR UPDATE ON public.epi_assignments
  FOR EACH ROW
  EXECUTE PROCEDURE update_catalog_stock_on_assignment();
