const fs = require('fs');

let c = fs.readFileSync('src/components/Layout.tsx', 'utf8');

c = c.replace(/import \{ ([^}]+) \} from 'lucide-react';/, "import { $1, Sun, Moon } from 'lucide-react';");

c = c.replace(/export function Layout\(\) \{/g, `export function Layout() {
  const [isLight, setIsLight] = React.useState(() => document.documentElement.classList.contains('light'));
  
  const toggleTheme = () => {
    const newMode = !isLight;
    setIsLight(newMode);
    if (newMode) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };`);

c = c.replace(/<div className="flex items-center gap-3 md:border-l md:border-border md:pl-6">/g, `<div className="flex items-center gap-3 md:border-l md:border-border md:pl-6">
            <button 
              onClick={toggleTheme}
              className="p-2 text-muted hover:text-foreground hover:bg-surface-hover rounded-full transition-colors"
              title="Alternar Tema"
            >
              {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>`);

fs.writeFileSync('src/components/Layout.tsx', c);
