with open('supabase/schema.sql', 'r') as f:
    schema = f.read()

old_func = """CREATE OR REPLACE FUNCTION public.return_epi(p_worker_id UUID, p_epi_id UUID, p_condition item_condition DEFAULT 'GOOD'::item_condition)
RETURNS BOOLEAN AS $$
DECLARE
  v_assignment_id UUID;
BEGIN
  -- Find active assignment
  SELECT id INTO v_assignment_id
  FROM public.epi_assignments
  WHERE epi_id = p_epi_id AND worker_id = p_worker_id AND returned_at IS NULL
  LIMIT 1;"""

new_func = """CREATE OR REPLACE FUNCTION public.return_epi(p_epi_id UUID, p_worker_id UUID DEFAULT NULL, p_condition item_condition DEFAULT 'GOOD'::item_condition)
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
  LIMIT 1;"""

schema = schema.replace(old_func, new_func)

with open('supabase/schema.sql', 'w') as f:
    f.write(schema)
