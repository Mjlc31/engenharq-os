const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'src/components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add Sun/Moon imports
content = content.replace("from 'lucide-react';", "Sun, Moon } from 'lucide-react';");

// 2. Add theme state and effect
const themeLogic = `
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('engenharq-theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('engenharq-theme', theme);
  }, [theme]);
`;
content = content.replace("const [isSidebarOpen, setIsSidebarOpen] = useState(true);", "const [isSidebarOpen, setIsSidebarOpen] = useState(true);\n" + themeLogic);

// 3. Add button in header
const buttonHtml = `
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9 rounded-full bg-surface-hover flex items-center justify-center border border-border cursor-pointer relative group text-muted hover:text-primary transition-colors"
              title="Alternar Tema"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
`;
content = content.replace('<button\n              onClick={signOut}', buttonHtml + '<button\n              onClick={signOut}');

fs.writeFileSync(file, content);
console.log('Layout patched');
