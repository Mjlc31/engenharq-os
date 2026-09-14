const fs = require('fs');
let code = fs.readFileSync('src/components/Layout.tsx', 'utf-8');

const oldBtn = `<button
              className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm transition-all duration-200 cursor-not-allowed text-muted/50"
              disabled
            >
              <Settings className="w-4 h-4" />
              Configurações
            </button>`;

const newLink = `<NavLink
              to="/settings"
              className={({ isActive }) =>
                \`flex items-center gap-3 rounded px-3 py-2 text-sm transition-all duration-200 \${
                  isActive
                    ? 'bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20'
                    : 'text-muted hover:bg-surface hover:text-foreground'
                }\`
              }
            >
              <Settings className="w-4 h-4" />
              Configurações
            </NavLink>`;

code = code.replace(oldBtn, newLink);
fs.writeFileSync('src/components/Layout.tsx', code);
