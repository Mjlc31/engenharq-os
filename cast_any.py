import os

audit_path = 'src/pages/Audit.tsx'
if os.path.exists(audit_path):
    with open(audit_path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('if (data) setAssignments(data);', 'if (data) setAssignments(data as any);')
    with open(audit_path, 'w', encoding='utf-8') as f:
        f.write(content)

rep_path = 'src/pages/Reports.tsx'
if os.path.exists(rep_path):
    with open(rep_path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('const expDate = e.catalog?.ca_validity', 'const expDate = (e.catalog as any)?.ca_validity')
    content = content.replace('Codigo_Rastreio: e.catalog?.code,', 'Codigo_Rastreio: (e.catalog as any)?.code,')
    with open(rep_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done")
