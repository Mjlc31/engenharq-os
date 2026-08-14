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
  condition_on_return item_condition,
  digital_signature_url TEXT,
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
CREATE INDEX idx_epi_assignments_returned_at ON public.epi_assignments(returned_at);
CREATE INDEX idx_inventory_transactions_epi_id ON public.inventory_transactions(epi_id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epi_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epi_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epi_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- 7. Create Fast RLS Policies using JWT Metadata (Avoid N+1)
-- Users
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Sites
CREATE POLICY "Authenticated users can view sites" ON public.construction_sites FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins and Engineers can insert sites" ON public.construction_sites FOR INSERT WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SAFETY_ENGINEER'));
CREATE POLICY "Admins and Engineers can update sites" ON public.construction_sites FOR UPDATE USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SAFETY_ENGINEER'));
CREATE POLICY "Admins and Engineers can delete sites" ON public.construction_sites FOR DELETE USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SAFETY_ENGINEER'));

-- Workers
CREATE POLICY "Authenticated users can view workers" ON public.workers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins and Engineers can insert workers" ON public.workers FOR INSERT WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SAFETY_ENGINEER'));
CREATE POLICY "Admins and Engineers can update workers" ON public.workers FOR UPDATE USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SAFETY_ENGINEER'));
CREATE POLICY "Admins and Engineers can delete workers" ON public.workers FOR DELETE USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SAFETY_ENGINEER'));

-- Worker Roles
CREATE POLICY "Authenticated users can view worker roles" ON public.worker_roles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins and Engineers can manage worker roles" ON public.worker_roles FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SAFETY_ENGINEER'));

-- EPI Catalog
CREATE POLICY "Authenticated users can view EPI catalog" ON public.epi_catalog FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins and Engineers can manage EPI catalog" ON public.epi_catalog FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SAFETY_ENGINEER'));

-- EPI Inventory
CREATE POLICY "Authenticated users can view EPIs" ON public.epi_inventory FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins and Engineers can insert EPIs" ON public.epi_inventory FOR INSERT WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SAFETY_ENGINEER'));
CREATE POLICY "Admins and Engineers can update EPIs" ON public.epi_inventory FOR UPDATE USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SAFETY_ENGINEER'));
CREATE POLICY "Admins and Engineers can delete EPIs" ON public.epi_inventory FOR DELETE USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SAFETY_ENGINEER'));

-- EPI Assignments
CREATE POLICY "Authenticated users can view assignments" ON public.epi_assignments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins and Engineers can insert assignments" ON public.epi_assignments FOR INSERT WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SAFETY_ENGINEER'));
CREATE POLICY "Admins and Engineers can update assignments" ON public.epi_assignments FOR UPDATE USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SAFETY_ENGINEER'));
CREATE POLICY "Admins and Engineers can delete assignments" ON public.epi_assignments FOR DELETE USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SAFETY_ENGINEER'));

-- Inventory Transactions
CREATE POLICY "Authenticated users can view inventory transactions" ON public.inventory_transactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins and Engineers can insert inventory transactions" ON public.inventory_transactions FOR INSERT WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SAFETY_ENGINEER'));
CREATE POLICY "Admins and Engineers can update/delete inventory transactions" ON public.inventory_transactions FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SAFETY_ENGINEER'));

-- 8. Create a trigger to automatically create a user record when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuário ' || split_part(new.email, '@', 1)), 
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'SITE_MANAGER')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 9. Insert initial mock Construction Sites
-- (Can be handled externally or omitted for production)
