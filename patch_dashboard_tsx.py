import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

# {item.epi.category} - {item.epi.tracking_code}
content = re.sub(r"\{item\.epi\.category\} - \{item\.epi\.tracking_code\}", "{item.catalog?.name}", content)
content = re.sub(r"\{item\.epi\?\.category\} - \{item\.epi\?\.tracking_code\}", "{item.epi?.name}", content)
content = re.sub(r"\{item\.epi\.category\}", "{item.epi?.name}", content)

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)
