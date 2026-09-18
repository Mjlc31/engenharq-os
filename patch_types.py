import os

file_path = 'src/types/index.ts'
if os.path.exists(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # We need to update EpiAssignment interface
    content = content.replace('epi_id: string;', 'catalog_id: string;')
    if 'epi?: EpiInventory;' in content:
        content = content.replace('epi?: EpiInventory;', 'catalog?: any;') # Quick fix

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched types in index.ts")
