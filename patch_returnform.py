import os

file_path = 'src/components/features/operations/ReturnForm.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update handleDevolucao function
old_handle = '''  const handleDevolucao = async (assignmentId: string, epiId: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('return_epi', {
        p_assignment_id: epiId,
        p_condition: 'GOOD'
      });'''

new_handle = '''  const handleDevolucao = async (assignmentId: string, epiId: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('return_epi', {
        p_assignment_id: assignmentId,
        p_condition: 'GOOD'
      });'''

content = content.replace(old_handle, new_handle)

# Update JSX table
old_td1 = '<td className="px-4 py-2">{a.epi?.catalog?.name} ({a.epi?.tracking_code})</td>'
new_td1 = '<td className="px-4 py-2">{a.catalog?.name}</td>'
content = content.replace(old_td1, new_td1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied to ReturnForm.tsx")
