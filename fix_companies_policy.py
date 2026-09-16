import re

with open('supabase/schema.sql', 'r') as f:
    schema = f.read()

old_policy = """CREATE POLICY "Companies editable by admin" ON public.companies FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND (users.role = 'ADMIN' OR users.role = 'SAFETY_ENGINEER')
  )
);"""

new_policy = """CREATE POLICY "Companies editable by admin" ON public.companies FOR ALL TO authenticated USING (
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
);"""

schema = schema.replace(old_policy, new_policy)

with open('supabase/schema.sql', 'w') as f:
    f.write(schema)
