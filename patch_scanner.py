import re

with open('src/hooks/useScanner.ts', 'r') as f:
    content = f.read()

# Replace query
old_query = """      let query = supabase.from('epi_inventory').select('*');
      if (isUUID(cleanedCode)) {
        query = query.eq('id', cleanedCode);
      } else {
        query = query.eq('tracking_code', cleanedCode);
      }"""
new_query = """      let query = supabase.from('epi_catalog').select('*');
      if (isUUID(cleanedCode)) {
        query = query.eq('id', cleanedCode);
      } else {
        query = query.eq('code', cleanedCode);
      }"""
content = content.replace(old_query, new_query)

# Replace 'EPI' prefix with 'CATALOG' logic
content = content.replace("code.startsWith('EPI:')", "code.startsWith('CATALOG:')")
content = content.replace("code.replace('EPI:', '')", "code.replace('CATALOG:', '')")

with open('src/hooks/useScanner.ts', 'w') as f:
    f.write(content)
