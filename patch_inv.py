import os

f4 = 'src/hooks/useEpiInventory.ts'
if os.path.exists(f4):
    with open(f4, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('p_catalog_id: epiId, p_quantity: 1', 'p_assignment_id: epiId, p_condition: "GOOD"')
    with open(f4, 'w', encoding='utf-8') as f:
        f.write(c)

print("Done")
