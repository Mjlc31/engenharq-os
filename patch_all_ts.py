import os
import re

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# Map.tsx
map_path = 'src/pages/Map.tsx'
if os.path.exists(map_path):
    with open(map_path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('epiData.data as EpiInventory[]', 'epiData.data as any[]')
    content = content.replace('episData.data as EpiInventory[]', 'episData.data as any[]')
    content = content.replace('a.epi?.category', 'a.catalog?.category')
    content = content.replace('a.epi?.tracking_code', 'a.catalog?.code')
    content = content.replace('epi_id: selectedEpi', 'catalog_id: selectedEpi')
    with open(map_path, 'w', encoding='utf-8') as f:
        f.write(content)

# Reports.tsx
rep_path = 'src/pages/Reports.tsx'
if os.path.exists(rep_path):
    with open(rep_path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('e.ca_expiration_date', 'e.catalog?.ca_validity')
    content = content.replace('e.tracking_code', 'e.catalog?.code')
    with open(rep_path, 'w', encoding='utf-8') as f:
        f.write(content)

# WorkerProfile.tsx
wp_path = 'src/pages/WorkerProfile.tsx'
replace_in_file(wp_path, 'assignment.epi?.ca_number', 'assignment.catalog?.ca_number')
replace_in_file(wp_path, 'assignment.epi?.tracking_code', 'assignment.catalog?.code')

# pdfGenerator.ts
pdf_path = 'src/lib/pdfGenerator.ts'
replace_in_file(pdf_path, 'assignment.epi?.catalog', 'assignment.catalog')
replace_in_file(pdf_path, 'assignment.epi?.tracking_code', 'assignment.catalog?.code')

# useEpiAssets.ts
assets_path = 'src/hooks/useEpiAssets.ts'
if os.path.exists(assets_path):
    with open(assets_path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('p_epi_id: epiId', 'p_catalog_id: epiId, p_quantity: 1')
    content = content.replace('p_epi_id: epiId', 'p_assignment_id: epiId, p_condition: "GOOD"')
    
    # Let's use regex for useEpiAssets
    content = re.sub(r'p_epi_id:\s*epiId', 'p_catalog_id: epiId, p_quantity: 1', content)
    with open(assets_path, 'w', encoding='utf-8') as f:
        f.write(content)

# useEpiInventory.ts
inv_path = 'src/hooks/useEpiInventory.ts'
if os.path.exists(inv_path):
    with open(inv_path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = re.sub(r'p_epi_id:\s*epiId', 'p_catalog_id: epiId, p_quantity: 1', content)
    with open(inv_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Applied quick TS fixes")
