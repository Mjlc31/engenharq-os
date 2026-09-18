import os

file_path = 'src/types/database.types.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'return_epi: { Args: { p_catalog_id: string }; Returns: boolean }', 
    'return_epi: { Args: { p_assignment_id: string, p_condition?: string }; Returns: boolean }'
)

content = content.replace(
    'assign_epi: {\n        Args: { p_catalog_id: string; p_worker_id: string }\n        Returns: boolean\n      }', 
    'assign_epi: {\n        Args: { p_catalog_id: string; p_worker_id: string; p_quantity?: number }\n        Returns: boolean\n      }'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
