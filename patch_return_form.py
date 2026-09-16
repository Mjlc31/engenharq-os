import re

with open('src/components/features/operations/ReturnForm.tsx', 'r') as f:
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

# Update UI to map properly
# Old: {assignment.epi.catalog.name} - {assignment.epi.tracking_code}
# New: {assignment.catalog.name}
content = re.sub(r"\{assignment\.epi\.catalog\.name\} - \{assignment\.epi\.tracking_code\}", "{assignment.catalog.name}", content)

# Update returnEpi call
# Old: 
#      const { error } = await supabase.rpc('return_epi', {
#        p_worker_id: selectedWorkerId,
#        p_epi_id: epiId,
#        p_condition: 'GOOD'
#      });
# New:
#      const { error } = await supabase.rpc('return_epi', {
#        p_assignment_id: epiId,
#        p_condition: 'GOOD'
#      });

old_return_call = """      const { error } = await supabase.rpc('return_epi', {
        p_worker_id: selectedWorkerId,
        p_epi_id: epiId,
        p_condition: 'GOOD'
      });"""
new_return_call = """      const { error } = await supabase.rpc('return_epi', {
        p_assignment_id: epiId,
        p_condition: 'GOOD'
      });"""
content = content.replace(old_return_call, new_return_call)

with open('src/components/features/operations/ReturnForm.tsx', 'w') as f:
    f.write(content)
