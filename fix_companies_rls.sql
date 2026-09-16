DROP POLICY IF EXISTS "Companies editable by admin" ON public.companies;
CREATE POLICY "Companies editable by admin" ON public.companies FOR ALL TO authenticated USING (
  true
) WITH CHECK (
  true
);
