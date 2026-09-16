with open('supabase/schema.sql', 'r') as f:
    schema = f.read()

schema = schema.replace(
    "INSERT INTO public.epi_assignments (epi_id, worker_id)\n  VALUES (p_epi_id, p_worker_id);",
    "INSERT INTO public.epi_assignments (epi_id, worker_id, condition_on_delivery)\n  VALUES (p_epi_id, p_worker_id, 'GOOD'::item_condition);"
)

with open('supabase/schema.sql', 'w') as f:
    f.write(schema)
