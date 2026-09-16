import re

with open('src/hooks/useAudit.ts', 'r') as f:
    content = f.read()

content = content.replace("epi:epi_inventory(tracking_code, category, ca_number)", "catalog:epi_catalog(name, category, ca_number)")

with open('src/hooks/useAudit.ts', 'w') as f:
    f.write(content)

with open('src/pages/Audit.tsx', 'r') as f:
    content = f.read()

content = content.replace("log.epi?.tracking_code", "log.catalog?.name")
content = content.replace("log.epi?.category", "log.catalog?.category")
content = content.replace("log.epi?.ca_number", "log.catalog?.ca_number")

with open('src/pages/Audit.tsx', 'w') as f:
    f.write(content)
