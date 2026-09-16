import re

with open('src/components/features/operations/LossForm.tsx', 'r') as f:
    content = f.read()

# Update fetch query
old_query = """    const { data, error } = await supabase
      .from('epi_assignments')
      .select(`
        id, assigned_at, epi_id, condition_on_delivery,
        epi:epi_inventory(id, tracking_code, catalog:epi_catalog(name))
      `)
      .eq('worker_id', selectedWorkerId)
      .is('returned_at', null);"""

new_query = """    const { data, error } = await supabase
      .from('epi_assignments')
      .select(`
        id, assigned_at, catalog_id, condition_on_delivery,
        catalog:epi_catalog(name)
      `)
      .eq('worker_id', selectedWorkerId)
      .is('returned_at', null);"""
content = content.replace(old_query, new_query)

content = re.sub(r"\{assignment\.epi\.catalog\.name\} - \{assignment\.epi\.tracking_code\}", "{assignment.catalog.name}", content)

# update return_epi call
old_return_call = """      const { error } = await supabase.rpc('return_epi', {
        p_worker_id: selectedWorkerId,
        p_epi_id: epiId,
        p_condition: 'LOST'
      });"""
new_return_call = """      const { error } = await supabase.rpc('return_epi', {
        p_assignment_id: epiId,
        p_condition: 'LOST'
      });"""
content = content.replace(old_return_call, new_return_call)

with open('src/components/features/operations/LossForm.tsx', 'w') as f:
    f.write(content)
