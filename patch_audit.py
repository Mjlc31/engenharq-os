import os

file_path = 'src/pages/Audit.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'epi: { tracking_code: string; category: string; ca_number: string } | { tracking_code: string; category: string; ca_number: string }[];',
    'catalog: { code: string; category: string; ca_number: string } | { code: string; category: string; ca_number: string }[];'
)

content = content.replace(
    'epi:epi_inventory(tracking_code, category, ca_number),',
    'catalog:epi_catalog(code, category, ca_number),'
)

content = content.replace('const epiInfo = Array.isArray(a.epi) ? a.epi[0] : a.epi;', 'const epiInfo = Array.isArray(a.catalog) ? a.catalog[0] : a.catalog;')

content = content.replace('epiInfo?.tracking_code', 'epiInfo?.code')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied to Audit.tsx")
