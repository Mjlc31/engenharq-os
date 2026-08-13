-- Supabase Schema for EngenharQ OS

-- 1. Create custom types
CREATE TYPE user_role AS ENUM ('ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER');
CREATE TYPE epi_status AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'DISCARDED');

-- 2. Create tables
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'SITE_MANAGER',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.construction_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  latitude DECIMAL NOT NULL,
  longitude DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  registration_number TEXT UNIQUE NOT NULL,
  current_site_id UUID REFERENCES public.construction_sites(id),
  reference_photo_url TEXT,
  facial_descriptor JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.epi_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  tracking_code TEXT UNIQUE NOT NULL,
  status epi_status NOT NULL DEFAULT 'AVAILABLE',
  ca_number TEXT NOT NULL,
  size TEXT DEFAULT 'Único',
  ca_expiration_date DATE,
  recommended_lifespan_days INTEGER DEFAULT 180,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.epi_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epi_id UUID REFERENCES public.epi_inventory(id) NOT NULL,
  worker_id UUID REFERENCES public.workers(id) NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  returned_at TIMESTAMP WITH TIME ZONE,
  condition_on_return TEXT,
  digital_signature_url TEXT,
  generated_pdf_url TEXT,
  audit_selfie_url TEXT,
  biometric_match_score DECIMAL,
  liveness_verified BOOLEAN,
  expected_return_date DATE
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epi_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epi_assignments ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
-- Users can view all users, but only update themselves (simplified for now)
CREATE POLICY "Users can view all users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Prevent users from escalating their own privileges
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF (auth.role() = 'authenticated') AND (SELECT role FROM public.users WHERE id = auth.uid()) != 'ADMIN' THEN
      RAISE EXCEPTION 'Not authorized to change role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.prevent_role_escalation() FROM PUBLIC;

CREATE TRIGGER on_user_role_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_role_escalation();

-- Sites: Authenticated users can view, admins/engineers can manage
CREATE POLICY "Authenticated users can view sites" ON public.construction_sites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and Engineers can insert sites" ON public.construction_sites FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SAFETY_ENGINEER')));
CREATE POLICY "Admins and Engineers can update sites" ON public.construction_sites FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SAFETY_ENGINEER'))) WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SAFETY_ENGINEER')));

-- Workers: Authenticated users can view, admins/engineers can manage
CREATE POLICY "Authenticated users can view workers" ON public.workers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and Engineers can insert workers" ON public.workers FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SAFETY_ENGINEER')));
CREATE POLICY "Admins and Engineers can update workers" ON public.workers FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SAFETY_ENGINEER'))) WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SAFETY_ENGINEER')));

-- EPI Inventory: Authenticated users can view, admins/engineers can manage
CREATE POLICY "Authenticated users can view EPIs" ON public.epi_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and Engineers can insert EPIs" ON public.epi_inventory FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SAFETY_ENGINEER')));
CREATE POLICY "Admins and Engineers can update EPIs" ON public.epi_inventory FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SAFETY_ENGINEER'))) WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SAFETY_ENGINEER')));

-- EPI Assignments: Authenticated users can view, admins/engineers can manage
CREATE POLICY "Authenticated users can view assignments" ON public.epi_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and Engineers can insert assignments" ON public.epi_assignments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SAFETY_ENGINEER')));
CREATE POLICY "Admins and Engineers can update assignments" ON public.epi_assignments FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SAFETY_ENGINEER'))) WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SAFETY_ENGINEER')));

-- 5. Create a trigger to automatically create a user record when auth.users is created
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

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_workers_current_site_id ON public.workers(current_site_id);
CREATE INDEX IF NOT EXISTS idx_epi_assignments_worker_id ON public.epi_assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_epi_assignments_epi_id ON public.epi_assignments(epi_id);
CREATE INDEX IF NOT EXISTS idx_epi_inventory_status ON public.epi_inventory(status);
CREATE INDEX IF NOT EXISTS idx_epi_inventory_ca_expiration_date ON public.epi_inventory(ca_expiration_date);
