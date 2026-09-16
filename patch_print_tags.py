import re

with open('src/pages/PrintTags.tsx', 'r') as f:
    content = f.read()

# Remove useEpiAssets
# Replace epi_inventory with epi_catalog

old_q = """      const [workersRes, inventoryRes] = await Promise.all([
        supabase.from('workers').select('*'),
        supabase.from('epi_inventory').select('*')
      ]);"""
new_q = """      const [workersRes, inventoryRes] = await Promise.all([
        supabase.from('workers').select('*'),
        supabase.from('epi_catalog').select('*')
      ]);"""
content = content.replace(old_q, new_q)

# Fix items mapped
# Old: { type: 'worker' | 'epi', item: any }
# New: { type: 'worker' | 'catalog', item: any }
content = content.replace("'worker' | 'epi'", "'worker' | 'catalog'")

# Filters and lists
content = content.replace("setFilterType('epi')", "setFilterType('catalog')")
content = content.replace("filterType === 'epi'", "filterType === 'catalog'")
content = content.replace("EPIs", "Catálogo EPIs")

content = content.replace("item.tracking_code", "item.name") # for search match
content = content.replace("item.category", "item.category") # valid

old_render = """                      <div className="font-medium text-foreground">{item.category}</div>
                      <div className="text-sm text-muted">{item.tracking_code}</div>"""
new_render = """                      <div className="font-medium text-foreground">{item.name}</div>
                      <div className="text-sm text-muted">{item.code || item.category}</div>"""
content = content.replace(old_render, new_render)

# QR values
# Worker: `WORKER:${item.id}`
# EPI: `EPI:${item.id}` -> this remains the same, it just prints the catalog ID!
content = content.replace("`EPI:${item.id}`", "`CATALOG:${item.id}`")
content = content.replace("item.tracking_code ||", "item.code ||")

with open('src/pages/PrintTags.tsx', 'w') as f:
    f.write(content)
