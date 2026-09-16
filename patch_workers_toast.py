with open('src/pages/Workers.tsx', 'r') as f:
    content = f.read()

old_block = """      {isAdding && (
        <WorkerForm sites={sites} onClose={() => setIsAdding(false)} onSave={async (data) => {
          try {
            await addWorker(data);
            setIsAdding(false);
          } catch (e) {
            console.error(e);
          }
        }} />
      )}"""

new_block = """      {isAdding && (
        <WorkerForm sites={sites} onClose={() => setIsAdding(false)} onSave={async (data) => {
          try {
            await addWorker(data);
            setIsAdding(false);
          } catch (e: any) {
            console.error(e);
            toast({ type: 'error', title: 'Erro', message: e.message || 'Falha ao registrar trabalhador.' });
            throw e;
          }
        }} />
      )}"""

content = content.replace(old_block, new_block)

with open('src/pages/Workers.tsx', 'w') as f:
    f.write(content)
