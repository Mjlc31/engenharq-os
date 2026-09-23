-- Supabase Schema for EngenharQ OS (Optimized)

-- 1. Create custom types
CREATE TYPE user_role AS ENUM ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER');
CREATE TYPE epi_status AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'DISCARDED');
CREATE TYPE worker_status AS ENUM ('ACTIVE', 'INACTIVE', 'VACATION', 'DISMISSED');
CREATE TYPE site_status AS ENUM ('ACTIVE', 'FINISHED', 'PAUSED');
CREATE TYPE item_condition AS ENUM ('GOOD', 'DAMAGED', 'LOST');
CREATE TYPE item_size AS ENUM ('Único', 'PP', 'P', 'M', 'G', 'GG', 'XG', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45');

-- 2. Create updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create tables
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'SITE_MANAGER',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.construction_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT,
  cno TEXT,
  start_date DATE,
  end_date DATE,
  address TEXT,
  image_url TEXT,
  status site_status DEFAULT 'ACTIVE',
  latitude DECIMAL NOT NULL,
  longitude DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  registration_number TEXT UNIQUE NOT NULL,
  initial_role TEXT,
  current_role TEXT,
  admission_date DATE,
  birth_date DATE,
  work_sector TEXT,
  uniform_size item_size,
  boot_size item_size,
  apt_for_height_and_confined_space BOOLEAN DEFAULT false,
  phone_contact TEXT,
  current_site_id UUID REFERENCES public.construction_sites(id) ON DELETE SET NULL,
  reference_photo_url TEXT,
  facial_descriptor JSONB,
  status worker_status DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.worker_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
  role_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.worker_roles_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
  role_name TEXT,
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.epi_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  ca_number TEXT,
  ca_validity DATE,
  lifespan_days INTEGER DEFAULT 180,
  minimum_stock INTEGER DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  image_url TEXT,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.epi_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epi_catalog_id UUID REFERENCES public.epi_catalog(id) ON DELETE CASCADE,
  category TEXT,
  tracking_code TEXT UNIQUE NOT NULL,
  status epi_status NOT NULL DEFAULT 'AVAILABLE',
  ca_number TEXT NOT NULL,
  size item_size DEFAULT 'Único',
  ca_expiration_date DATE,
  recommended_lifespan_days INTEGER DEFAULT 180,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.epi_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epi_id UUID REFERENCES public.epi_inventory(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  returned_at TIMESTAMP WITH TIME ZONE,
  condition_on_delivery item_condition,
  condition_on_return item_condition,
  digital_signature_url TEXT,
    return_signature_url TEXT,
  generated_pdf_url TEXT,
  audit_selfie_url TEXT,
  biometric_match_score DECIMAL,
  liveness_verified BOOLEAN,
  expected_return_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epi_id UUID REFERENCES public.epi_inventory(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL,
  previous_status epi_status,
  new_status epi_status,
  worker_id UUID REFERENCES public.workers(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Triggers for updated_at
CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_sites_updated_at BEFORE UPDATE ON public.construction_sites FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_workers_updated_at BEFORE UPDATE ON public.workers FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_worker_roles_updated_at BEFORE UPDATE ON public.worker_roles FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_epi_catalog_updated_at BEFORE UPDATE ON public.epi_catalog FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_epi_inventory_updated_at BEFORE UPDATE ON public.epi_inventory FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_epi_assignments_updated_at BEFORE UPDATE ON public.epi_assignments FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- 5. Create Secondary Indexes for Performance
CREATE INDEX idx_workers_current_site_id ON public.workers(current_site_id);
CREATE INDEX idx_workers_status ON public.workers(status);
CREATE INDEX idx_worker_roles_worker_id ON public.worker_roles(worker_id);
CREATE INDEX idx_epi_inventory_catalog_id ON public.epi_inventory(epi_catalog_id);
CREATE INDEX idx_epi_inventory_status ON public.epi_inventory(status);
CREATE INDEX idx_epi_assignments_worker_id ON public.epi_assignments(worker_id);
CREATE INDEX idx_epi_assignments_epi_id ON public.epi_assignments(epi_id);
CREATE INDEX idx_epi_assignments_active ON public.epi_assignments(epi_id) WHERE returned_at IS NULL;
CREATE INDEX idx_inventory_transactions_epi_id ON public.inventory_transactions(epi_id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_roles_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epi_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epi_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epi_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- 7. Create Fast RLS Policies using JWT Metadata (Avoid N+1)
-- Users
CREATE POLICY "Users can view all users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Sites
CREATE POLICY "Authenticated users can view sites" ON public.construction_sites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and Engineers can insert sites" ON public.construction_sites FOR INSERT WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'));
CREATE POLICY "Admins and Engineers can update sites" ON public.construction_sites FOR UPDATE USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER')) WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'));
CREATE POLICY "Admins and Engineers can delete sites" ON public.construction_sites FOR DELETE USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'));

-- Workers
CREATE POLICY "Authenticated users can view workers" ON public.workers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and Engineers can insert workers" ON public.workers FOR INSERT WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'));
CREATE POLICY "Admins and Engineers can update workers" ON public.workers FOR UPDATE USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER')) WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'));
CREATE POLICY "Admins and Engineers can delete workers" ON public.workers FOR DELETE USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'));

-- Worker Roles
CREATE POLICY "Authenticated users can view worker roles" ON public.worker_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and Engineers can manage worker roles" ON public.worker_roles FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER')) WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'));

-- Worker Roles History
CREATE POLICY "Authenticated users can view worker roles history" ON public.worker_roles_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and Engineers can manage worker roles history" ON public.worker_roles_history FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER')) WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'));

-- EPI Catalog
CREATE POLICY "Authenticated users can view EPI catalog" ON public.epi_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and Engineers can manage EPI catalog" ON public.epi_catalog FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER')) WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'));

-- EPI Inventory
CREATE POLICY "Authenticated users can view EPIs" ON public.epi_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and Engineers can insert EPIs" ON public.epi_inventory FOR INSERT WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'));
CREATE POLICY "Admins and Engineers can update EPIs" ON public.epi_inventory FOR UPDATE USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER')) WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'));
CREATE POLICY "Admins and Engineers can delete EPIs" ON public.epi_inventory FOR DELETE USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'));

-- EPI Assignments
CREATE POLICY "Authenticated users can view assignments" ON public.epi_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and Engineers can insert assignments" ON public.epi_assignments FOR INSERT WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'));
CREATE POLICY "Admins and Engineers can update assignments" ON public.epi_assignments FOR UPDATE USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER')) WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'));
CREATE POLICY "Admins and Engineers can delete assignments" ON public.epi_assignments FOR DELETE USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'));

-- Inventory Transactions
CREATE POLICY "Authenticated users can view inventory transactions" ON public.inventory_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and Engineers can insert inventory transactions" ON public.inventory_transactions FOR INSERT WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'));
CREATE POLICY "Admins and Engineers can update/delete inventory transactions" ON public.inventory_transactions FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER')) WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'));

-- 8. Create a trigger to automatically create a user record when auth.users is created
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuário ' || split_part(new.email, '@', 1)), 
    'SITE_MANAGER'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE private.handle_new_user();

-- 9. Insert initial mock Construction Sites
-- (Can be handled externally or omitted for production)

-- 10. Dashboard Alerts RPC
CREATE OR REPLACE FUNCTION public.get_dashboard_alerts()
RETURNS TABLE (
  assignment_id UUID,
  epi_id UUID,
  worker_id UUID,
  worker_name TEXT,
  epi_name TEXT,
  ca_number TEXT,
  alert_type TEXT,
  days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ea.id AS assignment_id,
    ea.epi_id,
    ea.worker_id,
    w.full_name AS worker_name,
    ec.name AS epi_name,
    ei.ca_number,
    'CA_EXPIRATION' AS alert_type,
    (ei.ca_expiration_date - CURRENT_DATE)::INTEGER AS days_remaining
  FROM public.epi_assignments ea
  JOIN public.epi_inventory ei ON ea.epi_id = ei.id
  JOIN public.epi_catalog ec ON ei.epi_catalog_id = ec.id
  JOIN public.workers w ON ea.worker_id = w.id
  WHERE ea.returned_at IS NULL 
    AND ei.ca_expiration_date IS NOT NULL 
    AND (ei.ca_expiration_date - CURRENT_DATE) <= 30

  UNION ALL

  SELECT 
    ea.id AS assignment_id,
    ea.epi_id,
    ea.worker_id,
    w.full_name AS worker_name,
    ec.name AS epi_name,
    ei.ca_number,
    'LIFESPAN_EXPIRATION' AS alert_type,
    ((ea.assigned_at::DATE + ei.recommended_lifespan_days) - CURRENT_DATE)::INTEGER AS days_remaining
  FROM public.epi_assignments ea
  JOIN public.epi_inventory ei ON ea.epi_id = ei.id
  JOIN public.epi_catalog ec ON ei.epi_catalog_id = ec.id
  JOIN public.workers w ON ea.worker_id = w.id
  WHERE ea.returned_at IS NULL 
    AND ei.recommended_lifespan_days IS NOT NULL 
    AND ((ea.assigned_at::DATE + ei.recommended_lifespan_days) - CURRENT_DATE) <= 5;
END;
$$ LANGUAGE plpgsql;

-- 11. Trigger to log inventory transactions automatically
CREATE OR REPLACE FUNCTION public.log_inventory_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.inventory_transactions (epi_id, transaction_type, previous_status, new_status, created_by)
    VALUES (NEW.id, 'STATUS_CHANGE', OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_epi_status_change
  AFTER UPDATE ON public.epi_inventory
  FOR EACH ROW EXECUTE PROCEDURE public.log_inventory_transaction();

-- 12. New Indexes
CREATE INDEX idx_inventory_transactions_worker_id ON public.inventory_transactions(worker_id);
CREATE INDEX idx_inventory_transactions_created_by ON public.inventory_transactions(created_by);

-- 13. Atomic RPCs for EPI Assignment and Return
CREATE OR REPLACE FUNCTION public.assign_epi(p_worker_id UUID, p_catalog_id UUID, p_quantity INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'A quantidade deve ser maior que zero.';
  END IF;

  SELECT current_stock INTO v_current_stock FROM public.epi_catalog WHERE id = p_catalog_id;
  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Estoque insuficiente no catálogo %.', p_catalog_id;
  END IF;

  FOR i IN 1..p_quantity LOOP
    INSERT INTO public.epi_assignments (catalog_id, worker_id, condition_on_delivery)
    VALUES (p_catalog_id, p_worker_id, 'GOOD'::item_condition);
  END LOOP;

  UPDATE public.epi_catalog
  SET current_stock = current_stock - p_quantity
  WHERE id = p_catalog_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.return_epi(p_epi_id UUID, p_worker_id UUID DEFAULT NULL, p_condition item_condition DEFAULT 'GOOD'::item_condition)
RETURNS BOOLEAN AS $$
DECLARE
  v_assignment_id UUID;
BEGIN
  -- Find active assignment
  SELECT id INTO v_assignment_id
  FROM public.epi_assignments
  WHERE epi_id = p_epi_id 
    AND (p_worker_id IS NULL OR worker_id = p_worker_id)
    AND returned_at IS NULL
  LIMIT 1;

  IF v_assignment_id IS NOT NULL THEN
    -- Complete assignment
    UPDATE public.epi_assignments
    SET returned_at = timezone('utc'::text, now()), condition_on_return = p_condition
    WHERE id = v_assignment_id;
  END IF;

  -- Update inventory based on condition
  IF p_condition = 'DAMAGED' OR p_condition = 'LOST' THEN
    UPDATE public.epi_inventory
    SET status = p_condition::text::epi_status, updated_at = timezone('utc'::text, now())
    WHERE id = p_epi_id;
  ELSE
    UPDATE public.epi_inventory
    SET status = 'AVAILABLE', updated_at = timezone('utc'::text, now())
    WHERE id = p_epi_id;
  END IF;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.bulk_assign_epis(p_worker_id UUID, p_assignments JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  v_assignment JSONB;
  v_catalog_id UUID;
  v_qty INTEGER;
BEGIN
  FOR v_assignment IN SELECT * FROM jsonb_array_elements(p_assignments)
  LOOP
    v_catalog_id := (v_assignment->>'catalog_id')::UUID;
    IF v_catalog_id IS NULL THEN
        v_catalog_id := (v_assignment->>'epi_id')::UUID; -- fallback for old payload
    END IF;
    v_qty := COALESCE((v_assignment->>'quantity')::INTEGER, 1);
    
    PERFORM public.assign_epi(p_worker_id, v_catalog_id, v_qty);
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualização: Novos campos de worker
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ATIVO';
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
) WITH CHECK (
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
    NEW.code := 'EPI' || LPAD(nextval('public.epi_code_seq')::TEXT, 3, '0');
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
-- 1. Alter epi_assignments
ALTER TABLE public.epi_assignments ADD COLUMN catalog_id UUID REFERENCES public.epi_catalog(id) ON DELETE CASCADE;

-- Backfill catalog_id from epi_inventory
UPDATE public.epi_assignments 
SET catalog_id = (SELECT epi_catalog_id FROM public.epi_inventory WHERE public.epi_inventory.id = public.epi_assignments.epi_id);

-- Make catalog_id NOT NULL and drop epi_id
ALTER TABLE public.epi_assignments ALTER COLUMN catalog_id SET NOT NULL;
ALTER TABLE public.epi_assignments DROP COLUMN epi_id CASCADE;

-- 2. Update inventory_transactions
ALTER TABLE public.inventory_transactions ADD COLUMN catalog_id UUID REFERENCES public.epi_catalog(id) ON DELETE CASCADE;
UPDATE public.inventory_transactions 
SET catalog_id = (SELECT epi_catalog_id FROM public.epi_inventory WHERE public.epi_inventory.id = public.inventory_transactions.epi_id);
ALTER TABLE public.inventory_transactions ALTER COLUMN catalog_id SET NOT NULL;
ALTER TABLE public.inventory_transactions DROP COLUMN epi_id CASCADE;
ALTER TABLE public.inventory_transactions DROP COLUMN previous_status;
ALTER TABLE public.inventory_transactions DROP COLUMN new_status;
ALTER TABLE public.inventory_transactions ADD COLUMN quantity_change INTEGER DEFAULT 0;

-- 3. Drop triggers related to epi_inventory
DROP TRIGGER IF EXISTS trigger_update_catalog_stock ON public.epi_assignments;
DROP FUNCTION IF EXISTS update_catalog_stock_on_assignment();
DROP TRIGGER IF EXISTS on_epi_status_change ON public.epi_inventory;
DROP FUNCTION IF EXISTS public.log_inventory_transaction();

-- 4. Recreate RPC assign_epi
CREATE OR REPLACE FUNCTION public.assign_epi(p_worker_id UUID, p_catalog_id UUID, p_quantity INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'A quantidade deve ser maior que zero.';
  END IF;

  SELECT current_stock INTO v_current_stock FROM public.epi_catalog WHERE id = p_catalog_id;
  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Estoque insuficiente no catálogo %.', p_catalog_id;
  END IF;

  FOR i IN 1..p_quantity LOOP
    INSERT INTO public.epi_assignments (catalog_id, worker_id, condition_on_delivery)
    VALUES (p_catalog_id, p_worker_id, 'GOOD'::item_condition);
  END LOOP;

  UPDATE public.epi_catalog
  SET current_stock = current_stock - p_quantity
  WHERE id = p_catalog_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recreate RPC return_epi
CREATE OR REPLACE FUNCTION public.return_epi(p_assignment_id UUID, p_condition item_condition DEFAULT 'GOOD'::item_condition)
RETURNS BOOLEAN AS $$
DECLARE
  v_catalog_id UUID;
BEGIN
  SELECT catalog_id INTO v_catalog_id
  FROM public.epi_assignments
  WHERE id = p_assignment_id AND returned_at IS NULL;

  IF v_catalog_id IS NOT NULL THEN
    UPDATE public.epi_assignments
    SET returned_at = timezone('utc'::text, now()), condition_on_return = p_condition
    WHERE id = p_assignment_id;

    -- Return to stock ONLY if it's in GOOD condition
    IF p_condition = 'GOOD' THEN
      UPDATE public.epi_catalog
      SET current_stock = current_stock + 1
      WHERE id = v_catalog_id;
    END IF;
  END IF;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Drop epi_inventory
DROP TABLE IF EXISTS public.epi_inventory CASCADE;
DROP FUNCTION IF EXISTS public.get_dashboard_alerts();
CREATE OR REPLACE FUNCTION public.get_dashboard_alerts()
RETURNS TABLE (
  assignment_id UUID,
  catalog_id UUID,
  worker_id UUID,
  worker_name TEXT,
  epi_name TEXT,
  ca_number TEXT,
  alert_type TEXT,
  days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ea.id AS assignment_id,
    ea.catalog_id,
    ea.worker_id,
    w.full_name AS worker_name,
    ec.name AS epi_name,
    ec.ca_number,
    'LIFESPAN' AS alert_type,
    (ec.lifespan_days - (EXTRACT(EPOCH FROM (now() - ea.assigned_at))/86400)::INTEGER) AS days_remaining
  FROM public.epi_assignments ea
  JOIN public.workers w ON w.id = ea.worker_id
  JOIN public.epi_catalog ec ON ec.id = ea.catalog_id
  WHERE ea.returned_at IS NULL 
    AND ec.lifespan_days IS NOT NULL
    AND (ec.lifespan_days - (EXTRACT(EPOCH FROM (now() - ea.assigned_at))/86400)::INTEGER) <= 30;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- System Settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_name TEXT DEFAULT 'EngenharQ OS',
  logo_url TEXT,
  epi_declaration_text TEXT DEFAULT 'Declaro para todos os fins de direito que recebi gratuitamente, após orientação de uso e aplicação os Equipamentos de Proteção Individual a utilizar durante a realização de minhas atividades.',
  epi_terms_text TEXT DEFAULT 'Declaro, ainda, ter ciência de que: a) Os EPIs deverão ser utilizados...',
  epi_legal_base_text TEXT DEFAULT 'Base Legal: NR 1 ...',
  default_expiration_alert_days INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings are viewable by everyone" ON public.system_settings
    FOR SELECT USING (true);

CREATE POLICY "Settings can be updated by authenticated users" ON public.system_settings
    FOR UPDATE USING (auth.role() = 'authenticated');
    
CREATE POLICY "Settings can be inserted by authenticated users" ON public.system_settings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
