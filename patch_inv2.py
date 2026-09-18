import os

f4 = 'src/hooks/useEpiInventory.ts'
with open(f4, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'p_assignment_id: epiId, p_condition: "GOOD"' in line and i < 60:
        lines[i] = line.replace('p_assignment_id: epiId, p_condition: "GOOD"', 'p_catalog_id: epiId, p_quantity: 1')

with open(f4, 'w', encoding='utf-8') as f:
    f.writelines(lines)
