const fs = require('fs');
let content = fs.readFileSync('src/pages/WorkerProfile.tsx', 'utf-8');

// The file shows a table of worker roles. I need to add a "Registrar Nova Função" logic.
const newRoleLogic = `
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDate, setNewRoleDate] = useState('');
  
  const handleAddRole = async () => {
    if (!newRoleName || !newRoleDate) return;
    try {
      const { error } = await supabase.from('worker_roles').insert([
        { worker_id: id, role_name: newRoleName, start_date: newRoleDate }
      ]);
      if (error) throw error;
      toast({ type: 'success', title: 'Promoção registrada', message: 'Nova função inserida com sucesso.' });
      setIsAddingRole(false);
      setNewRoleName('');
      setNewRoleDate('');
      fetchWorker();
    } catch(err) {
      toast({ type: 'error', title: 'Erro', message: 'Falha ao registrar promoção.' });
    }
  };
`;

content = content.replace('const handleSave = async () => {', newRoleLogic + '\n  const handleSave = async () => {');

const roleModalUi = `
      {isAddingRole && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-4">Registrar Nova Função / Promoção</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Nova Função</label>
                <input type="text" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Data de Vigência</label>
                <input type="date" value={newRoleDate} onChange={e => setNewRoleDate(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setIsAddingRole(false)} className="px-4 py-2 text-muted hover:text-foreground">Cancelar</button>
              <button onClick={handleAddRole} disabled={!newRoleName || !newRoleDate} className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50">Registrar</button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace('      {deleteConfirmId && (', roleModalUi + '\n      {deleteConfirmId && (');
content = content.replace(
  '<h3 className="font-bold text-foreground">Histórico de Cargos</h3>', 
  '<h3 className="font-bold text-foreground">Histórico de Cargos</h3>\n              <button onClick={() => setIsAddingRole(true)} className="text-xs bg-primary/20 text-primary px-3 py-1.5 rounded-full font-medium hover:bg-primary/30 transition-colors">+ Registrar Promoção</button>'
);
content = content.replace(
  '<div className="flex items-center gap-3 mb-6">',
  '<div className="flex items-center justify-between mb-6">\n              <div className="flex items-center gap-3">'
);
content = content.replace(
  '<div className="space-y-6">', // This might be wrong. Let's find exactly the history header
  ''
);

fs.writeFileSync('patch_worker_profile.cjs_tmp', content);
