import re

with open('src/pages/Reports.tsx', 'r') as f:
    content = f.read()

old_query1 = """        const { data } = await supabase
          .from('epi_assignments')
          .select('*, worker:workers(full_name), epi:epi_inventory(tracking_code, catalog:epi_catalog(name))')
          .gte('assigned_at', startDate.toISOString())
          .lte('assigned_at', endDate.toISOString())
          .order('assigned_at', { ascending: false });"""
new_query1 = """        const { data } = await supabase
          .from('epi_assignments')
          .select('*, worker:workers(full_name), catalog:epi_catalog(name)')
          .gte('assigned_at', startDate.toISOString())
          .lte('assigned_at', endDate.toISOString())
          .order('assigned_at', { ascending: false });"""
content = content.replace(old_query1, new_query1)

old_query2 = """        const { data } = await supabase.from('epi_inventory').select('tracking_code, ca_expiration_date, status, catalog:epi_catalog(name, recommended_lifespan_days)').eq('status', 'IN_USE');"""
new_query2 = """        const { data } = await supabase.from('epi_assignments').select('assigned_at, catalog:epi_catalog(name, ca_validity, lifespan_days)').is('returned_at', null);"""
content = content.replace(old_query2, new_query2)

content = content.replace("assignment.epi?.catalog?.name", "assignment.catalog?.name")
content = content.replace("item.catalog?.recommended_lifespan_days", "item.catalog?.lifespan_days")
content = content.replace("item.ca_expiration_date", "item.catalog?.ca_validity")
content = content.replace("item.tracking_code", "item.catalog?.name")
content = content.replace("Código: ${assignment.epi?.tracking_code}", "")

old_query3 = """        const { data } = await supabase
          .from('inventory_transactions')
          .select('*, epi:epi_inventory(*, catalog:epi_catalog(*))')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false });"""
new_query3 = """        const { data } = await supabase
          .from('inventory_transactions')
          .select('*, catalog:epi_catalog(*)')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false });"""
content = content.replace(old_query3, new_query3)

content = content.replace("transaction.epi?.catalog?.name", "transaction.catalog?.name")

with open('src/pages/Reports.tsx', 'w') as f:
    f.write(content)
