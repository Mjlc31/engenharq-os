const fs = require('fs');
let content = fs.readFileSync('src/components/Layout.tsx', 'utf-8');

const hookLogic = `
  // Próxima Vistoria State
  const [nextSiteName, setNextSiteName] = useState<string>('Carregando...');
  const [nextTime, setNextTime] = useState<string>('--:--h');

  useEffect(() => {
    async function fetchNextSite() {
      try {
        const { data, error } = await supabase
          .from('construction_sites')
          .select('name')
          .eq('status', 'ACTIVE')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (!error && data) {
          setNextSiteName(data.name);
          
          const currentHour = new Date().getHours();
          if (currentHour < 12) {
            setNextTime('14:00h');
          } else {
            setNextTime('08:30h');
          }
        } else {
          setNextSiteName('Nenhuma obra ativa');
          setNextTime('--:--');
        }
      } catch (err) {
        setNextSiteName('Erro ao carregar');
      }
    }
    fetchNextSite();
  }, []);
`;

content = content.replace('const [isSidebarOpen, setIsSidebarOpen] = useState(true);', 'const [isSidebarOpen, setIsSidebarOpen] = useState(true);' + hookLogic);

content = content.replace('<p className="text-xs">Obra Ponta Verde</p>', '<p className="text-xs">{nextSiteName}</p>');
content = content.replace('<p className="text-lg font-mono text-primary">14:20h</p>', '<p className="text-lg font-mono text-primary">{nextTime}</p>');

fs.writeFileSync('src/components/Layout.tsx', content);
