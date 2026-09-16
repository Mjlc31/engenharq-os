import re

with open('src/pages/WorkerProfile.tsx', 'r') as f:
    content = f.read()

# Update fetch query
old_query = """supabase.from('epi_assignments').select('*, epi:epi_inventory(*, catalog:epi_catalog(*))').eq('worker_id', id).order('assigned_at', { ascending: false })"""
new_query = """supabase.from('epi_assignments').select('*, catalog:epi_catalog(*)').eq('worker_id', id).order('assigned_at', { ascending: false })"""
content = content.replace(old_query, new_query)

# Update render
# Old: assignment.epi?.catalog?.name || 'Desconhecido'
# New: assignment.catalog?.name || 'Desconhecido'
content = content.replace("assignment.epi?.catalog?.name", "assignment.catalog?.name")

# Old: {assignment.epi?.tracking_code && <span className="text-sm text-muted block">Código: {assignment.epi.tracking_code}</span>}
content = re.sub(r"\{assignment\.epi\?\.tracking_code && <span className=\"text-sm text-muted block\">Código: \{assignment\.epi\.tracking_code\}</span>\}", "", content)

with open('src/pages/WorkerProfile.tsx', 'w') as f:
    f.write(content)
