import re

with open('src/pages/Map.tsx', 'r') as f:
    content = f.read()

# Map has some queries.
old_q1 = """          .select(`*, epi:epi_inventory(*), worker:workers(*)`)"""
new_q1 = """          .select(`*, catalog:epi_catalog(*), worker:workers(*)`)"""
content = content.replace(old_q1, new_q1)

old_q2 = """        supabase.from('epi_inventory').select('*').eq('status', 'AVAILABLE'),"""
new_q2 = """        supabase.from('epi_catalog').select('*').gt('current_stock', 0),"""
content = content.replace(old_q2, new_q2)

# assignment.epi => assignment.catalog
content = content.replace("assignment.epi", "assignment.catalog")
content = content.replace("epi.category", "catalog.category")
content = content.replace("epi.tracking_code", "catalog.name")

# assignment creation
old_assign = """        await supabase.from('epi_assignments').insert([{
          epi_id: selectedEpi,
          worker_id: selectedWorkerId,
          assigned_at: new Date().toISOString()
        }]);
        await supabase.from('epi_inventory').update({ status: 'IN_USE' }).eq('id', selectedEpi);"""
new_assign = """        await supabase.rpc('assign_epi', {
          p_worker_id: selectedWorkerId,
          p_catalog_id: selectedEpi,
          p_quantity: 1
        });"""
content = content.replace(old_assign, new_assign)

with open('src/pages/Map.tsx', 'w') as f:
    f.write(content)
