import os
import re

file_path = 'src/types/database.types.ts'
if os.path.exists(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Change epi_id to catalog_id in epi_assignments
    content = re.sub(r'epi_id:\s*string', r'catalog_id: string', content)
    content = re.sub(r'epi_id\?:\s*string', r'catalog_id?: string', content)
    
    # Add args to assign_epi and return_epi
    assign_epi_args = "p_worker_id: string, p_catalog_id: string, p_quantity: number"
    return_epi_args = "p_assignment_id: string, p_condition?: string"
    
    content = re.sub(r"Args:\s*{\s*p_epi_id:\s*string\s*p_worker_id:\s*string\s*}", r"Args: {\n            p_catalog_id: string\n            p_worker_id: string\n            p_quantity?: number\n          }", content)
    
    content = re.sub(r"Args:\s*{\s*p_epi_id:\s*string\s*}", r"Args: {\n            p_assignment_id: string\n            p_condition?: string\n          }", content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched types in database.types.ts")
