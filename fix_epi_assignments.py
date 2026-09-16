with open('supabase/schema.sql', 'r') as f:
    schema = f.read()

schema = schema.replace(
    "condition_on_return item_condition,",
    "condition_on_delivery item_condition,\n  condition_on_return item_condition,"
)

with open('supabase/schema.sql', 'w') as f:
    f.write(schema)
