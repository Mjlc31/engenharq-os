import re

with open('src/pages/Workers.tsx', 'r') as f:
    content = f.read()

# 1. Imports
content = re.sub(r"import \{ (.*?) \} from 'lucide-react';", lambda m: "import { " + m.group(1) + (", Filter" if "Filter" not in m.group(1) else "") + " } from 'lucide-react';", content)

# 2. States
state_str = """
  const [roleFilter, setRoleFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
"""
content = re.sub(r"(const \[statusFilter, setStatusFilter\] = useState\(''\);)", r"\1" + state_str, content)

# 3. uniqueRoles
roles_str = """
  const uniqueRoles = useMemo(() => {
    return Array.from(new Set(workers.map(w => w.current_role || w.initial_role).filter(Boolean))) as string[];
  }, [workers]);
"""
content = re.sub(r"(const uniqueSectors = useMemo.*?\n  \}, \[workers\]\);)", r"\1\n" + roles_str, content, flags=re.DOTALL)

# 4. filteredWorkers
filtered_str = """const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      const searchLower = debouncedSearch.toLowerCase();
      const matchSearch = (w.full_name || '').toLowerCase().includes(searchLower) ||
                          (w.cpf || '').toLowerCase().includes(searchLower) ||
                          (w.registration_number || '').toLowerCase().includes(searchLower);
      const matchSector = sectorFilter ? w.work_sector === sectorFilter : true;
      const matchStatus = statusFilter ? w.status === statusFilter : true;
      const matchRole = roleFilter ? (w.current_role === roleFilter || w.initial_role === roleFilter) : true;
      const matchSite = siteFilter ? w.current_site_id === siteFilter : true;
      return matchSearch && matchSector && matchStatus && matchRole && matchSite;
    });
  }, [workers, debouncedSearch, sectorFilter, statusFilter, roleFilter, siteFilter]);"""
content = re.sub(r"const filteredWorkers = useMemo\(\(\) => \{.*?\}, \[workers, debouncedSearch, sectorFilter, statusFilter\]\);", filtered_str, content, flags=re.DOTALL)

# 5. UI Filters
old_ui = r'<div className="p-4 border-b border-border bg-surface-hover/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">.*?</div>\s*</div>\s*</div>'
new_ui = """<div className="p-4 border-b border-border bg-surface-hover/20 flex flex-col gap-4">
  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
    <div className="relative w-full sm:max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
      <input
        type="text"
        placeholder="Buscar por nome, matrícula ou CPF..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary text-foreground"
      />
    </div>
    <div className="flex items-center gap-2 text-sm text-muted font-medium bg-background px-3 py-1.5 rounded-full border border-border">
      <Filter className="w-4 h-4" /> Filtros Avançados
    </div>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
    <select
      value={statusFilter}
      onChange={e => setStatusFilter(e.target.value)}
      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary appearance-none cursor-pointer"
    >
      <option value="">Status: Todos</option>
      <option value="ACTIVE">Status: Ativo</option>
      <option value="INACTIVE">Status: Inativo</option>
      <option value="VACATION">Status: Férias</option>
      <option value="DISMISSED">Status: Desligado</option>
    </select>
    <select
      value={roleFilter}
      onChange={e => setRoleFilter(e.target.value)}
      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary appearance-none cursor-pointer"
    >
      <option value="">Cargo: Todos</option>
      {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
    </select>
    <select
      value={siteFilter}
      onChange={e => setSiteFilter(e.target.value)}
      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary appearance-none cursor-pointer"
    >
      <option value="">Obra: Todas</option>
      {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
    <select
      value={sectorFilter}
      onChange={e => setSectorFilter(e.target.value)}
      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary appearance-none cursor-pointer"
    >
      <option value="">Setor: Todos</option>
      {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  </div>
</div>"""

content = re.sub(r'<div className="p-4 border-b border-border bg-surface-hover/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">.*?<table', new_ui + '\\n      <table', content, flags=re.DOTALL)

with open('src/pages/Workers.tsx', 'w') as f:
    f.write(content)
