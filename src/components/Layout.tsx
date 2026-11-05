import React, { useState, useEffect } from 'react';
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { ShieldCheck, HardHat, Users, MapPin, LogOut, Menu, X, ScanBarcode, Printer, FileBarChart, Building2, ChevronDown, ChevronRight, Settings, ClipboardList, Activity, Sun, Moon, GraduationCap, HeartPulse, History, Tv } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

export function Layout() {
  const { signOut, user, role, customRole } = useAuth();
  const isAlmoxarifado = role === 'ALMOXARIFADO' || (customRole && customRole.toLowerCase().includes('almoxarif'));
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

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

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Cadastros: false,
    Operações: false,
    SST: false,
    Relatórios: false,
  });

  useEffect(() => {
    const p = location.pathname;
    if (['/sites', '/workers', '/assets'].some(path => p.startsWith(path))) {
      setOpenSections(prev => ({ ...prev, Cadastros: true }));
    } else if (['/scanner', '/map', '/operations'].some(path => p.startsWith(path))) {
      setOpenSections(prev => ({ ...prev, Operações: true }));
    } else if (['/trainings', '/aso'].some(path => p.startsWith(path))) {
      setOpenSections(prev => ({ ...prev, SST: true }));
    } else if (['/reports', '/ficha-epi', '/tags', '/print-tags'].some(path => p.startsWith(path))) {
      setOpenSections(prev => ({ ...prev, Relatórios: true }));
    }
  }, [location.pathname]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const navigation = [
    { name: 'Dashboard Central', href: '/', icon: ShieldCheck, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },
    { name: 'Painel TV Fast Food', href: '/almoxarifado-kds', icon: Tv, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER', 'ALMOXARIFADO'] },
    { name: 'Almoxarifado (Scan)', href: '/scanner', icon: ScanBarcode, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER', 'ALMOXARIFADO'] },
    { name: 'Mapa de Ativos', href: '/map', icon: MapPin, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },
    { name: 'Estoque (NR-6)', href: '/assets', icon: HardHat, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER', 'ALMOXARIFADO'] },
    { name: 'Colaboradores', href: '/workers', icon: Users, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },
    { name: 'Painel de Operações', href: '/operations', icon: Activity, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER', 'ALMOXARIFADO'] },
    { name: 'Treinamentos (NR)', href: '/trainings', icon: GraduationCap, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },
    { name: 'Controle de ASO', href: '/aso', icon: HeartPulse, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },
    { name: 'Painel de Relatórios', href: '/reports', icon: ClipboardList, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },
    { name: 'Ficha de EPI', href: '/ficha-epi', icon: FileBarChart, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },
    { name: 'Empresa / Obras', href: '/sites', icon: Building2, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },
    { name: 'Imprimir QR Codes', href: '/tags', icon: Printer, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },
    { name: 'Auditoria', href: '/audit', icon: History, roles: ['ADMIN', 'SAFETY_ENGINEER'] },
  ].filter(item => {
    if (isAlmoxarifado) {
      return ['Painel TV Fast Food', 'Almoxarifado (Scan)', 'Estoque (NR-6)', 'Painel de Operações'].includes(item.name);
    }
    return item.roles.includes(role || 'SITE_MANAGER');
  });

  return (
    <div className="flex h-screen w-full flex-col bg-background font-sans text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 md:px-8 relative z-40 bg-background">
        <div className="flex items-center gap-3 shrink-0">
          <Link to={isAlmoxarifado ? "/almoxarifado-kds" : "/"} className="flex items-center gap-2.5 group">
            <img 
              src="/icon-192.png" 
              alt="EngenharQ Logo" 
              className="h-8 w-8 object-contain transition-transform group-hover:scale-105" 
            />
            <h1 className="text-lg font-bold tracking-tight uppercase">
              Engenhar<span className="text-primary">Q</span> OS <span className="ml-2 text-[10px] text-muted font-mono border border-border px-1 rounded hidden lg:inline-block">v2.7.0</span>
            </h1>
          </Link>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="hidden md:flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></div>
            <span className="text-xs text-muted uppercase tracking-widest font-medium">Systems Operational</span>
          </div>
          <div className="flex items-center gap-3 md:border-l md:border-border md:pl-6">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold truncate max-w-[150px]">{user?.email}</p>
              <p className="text-[10px] text-muted uppercase">Safety Lead • Maceió</p>
            </div>
            
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9 rounded-full bg-surface-hover flex items-center justify-center border border-border cursor-pointer relative group text-muted hover:text-primary transition-colors"
              title="Alternar Tema"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
<button
              onClick={signOut}
              className="h-9 w-9 rounded-full bg-surface-hover flex items-center justify-center border border-border cursor-pointer relative group text-muted hover:text-primary transition-colors"
              title="Sign Out"
              aria-label="Sair da conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="text-muted ml-2 focus:outline-none focus:ring-2 focus:ring-primary rounded p-1 hover:text-foreground cursor-pointer transition-colors"
              aria-label={isSidebarOpen ? "Fechar menu lateral" : "Abrir menu lateral"}
              title={isSidebarOpen ? "Fechar menu" : "Abrir menu"}
            >
              {isSidebarOpen ? <X className="w-5 h-5 text-primary" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 top-16 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity" 
            onClick={() => setIsSidebarOpen(false)} 
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "flex w-64 lg:w-60 shrink-0 flex-col border-r border-border bg-[var(--color-sidebar)] p-4 h-full transition-all duration-300 ease-in-out",
          "fixed lg:relative inset-y-0 top-16 lg:top-0 left-0 z-50 lg:z-10 shadow-2xl lg:shadow-none",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:hidden"
        )}>
          {/* Mobile Drawer Header */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-border lg:hidden">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Menu de Navegação</span>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 rounded text-muted hover:text-foreground cursor-pointer"
              title="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            {isAlmoxarifado ? (
              <>
                <div className="text-[10px] font-bold text-primary uppercase tracking-widest px-3 mt-2 mb-1">
                  Módulo Almoxarifado
                </div>
                {navigation.map(item => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => { if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                      className={cn(
                        "flex items-center gap-3 rounded px-3 py-2 text-sm transition-all duration-200 cursor-pointer",
                        isActive ? "bg-primary/10 text-primary font-bold shadow-sm border border-primary/20" : "text-muted hover:bg-surface-hover hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted")} />
                      {item.name}
                    </Link>
                  );
                })}
              </>
            ) : (
              <>
                <div className="text-[10px] font-bold text-muted uppercase tracking-widest px-3 mt-2 mb-1">Principal</div>
                {navigation.filter(item => ['Dashboard Central', 'Painel TV Fast Food'].includes(item.name)).map(item => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => { if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                      className={cn("flex items-center gap-3 rounded px-3 py-2 text-sm transition-all duration-200 cursor-pointer", isActive ? "bg-surface-hover text-primary font-bold shadow-sm" : "text-muted hover:bg-surface-hover hover:text-foreground")}
                    >
                      <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted")} />
                      {item.name}
                    </Link>
                  );
                })}
                
                <button 
                  onClick={() => toggleSection('Cadastros')}
                  className="flex items-center justify-between w-full text-[10px] font-bold text-muted uppercase tracking-widest px-3 mt-4 mb-1 hover:text-foreground transition-colors focus:outline-none"
                >
                  <span>Cadastros</span>
                  {openSections['Cadastros'] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                {openSections['Cadastros'] && navigation.filter(item => ['Empresa / Obras', 'Colaboradores', 'Estoque (NR-6)'].includes(item.name)).map(item => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => { if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                      className={cn("flex items-center gap-3 rounded px-3 py-2 text-sm transition-all duration-200 cursor-pointer", isActive ? "bg-surface-hover text-primary font-bold shadow-sm" : "text-muted hover:bg-surface-hover hover:text-foreground")}
                    >
                      <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted")} />
                      {item.name}
                    </Link>
                  );
                })}

                <button 
                  onClick={() => toggleSection('Operações')}
                  className="flex items-center justify-between w-full text-[10px] font-bold text-muted uppercase tracking-widest px-3 mt-4 mb-1 hover:text-foreground transition-colors focus:outline-none"
                >
                  <span>Operações</span>
                  {openSections['Operações'] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                {openSections['Operações'] && navigation.filter(item => ['Almoxarifado (Scan)', 'Mapa de Ativos', 'Painel de Operações'].includes(item.name)).map(item => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => { if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                      className={cn("flex items-center gap-3 rounded px-3 py-2 text-sm transition-all duration-200 cursor-pointer", isActive ? "bg-surface-hover text-primary font-bold shadow-sm" : "text-muted hover:bg-surface-hover hover:text-foreground")}
                    >
                      <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted")} />
                      {item.name}
                    </Link>
                  );
                })}

                <button 
                  onClick={() => toggleSection('SST')}
                  className="flex items-center justify-between w-full text-[10px] font-bold text-muted uppercase tracking-widest px-3 mt-4 mb-1 hover:text-foreground transition-colors focus:outline-none"
                >
                  <span>Saúde e Segurança (SST)</span>
                  {openSections['SST'] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                {openSections['SST'] && navigation.filter(item => ['Treinamentos (NR)', 'Controle de ASO'].includes(item.name)).map(item => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => { if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                      className={cn("flex items-center gap-3 rounded px-3 py-2 text-sm transition-all duration-200 cursor-pointer", isActive ? "bg-surface-hover text-primary font-bold shadow-sm" : "text-muted hover:bg-surface-hover hover:text-foreground")}
                    >
                      <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted")} />
                      {item.name}
                    </Link>
                  );
                })}

                <button 
                  onClick={() => toggleSection('Relatórios')}
                  className="flex items-center justify-between w-full text-[10px] font-bold text-muted uppercase tracking-widest px-3 mt-4 mb-1 hover:text-foreground transition-colors focus:outline-none"
                >
                  <span>Relatórios</span>
                  {openSections['Relatórios'] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                {openSections['Relatórios'] && navigation.filter(item => ['Painel de Relatórios', 'Ficha de EPI', 'Imprimir QR Codes'].includes(item.name)).map(item => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => { if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                      className={cn("flex items-center gap-3 rounded px-3 py-2 text-sm transition-all duration-200 cursor-pointer", isActive ? "bg-surface-hover text-primary font-bold shadow-sm" : "text-muted hover:bg-surface-hover hover:text-foreground")}
                    >
                      <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted")} />
                      {item.name}
                    </Link>
                  );
                })}
                <div className="text-[10px] font-bold text-muted uppercase tracking-widest px-3 mt-4 mb-1">Administração</div>
                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded px-3 py-2 text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20'
                        : 'text-muted hover:bg-surface hover:text-foreground'
                    }`
                  }
                >
                  <Settings className="w-4 h-4" />
                  Configurações
                </NavLink>
                <NavLink
                  to="/audit"
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded px-3 py-2 text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20'
                        : 'text-muted hover:bg-surface hover:text-foreground'
                    }`
                  }
                >
                  <History className="w-4 h-4" />
                  Auditoria
                </NavLink>
              </>
            )}

            <div className="text-[10px] font-bold text-muted uppercase tracking-widest px-3 mt-4 mb-1">Sistema</div>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm transition-all duration-200 cursor-pointer text-muted hover:bg-red-500/10 hover:text-red-500"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </nav>
          
          <div className="mt-auto hidden md:block">
            <div className="rounded border border-border bg-background/50 p-4">
              <p className="text-[10px] text-muted uppercase tracking-widest mb-2 font-bold">Próxima Vistoria</p>
              <p className="text-xs">{nextSiteName}</p>
              <p className="text-lg font-mono text-primary">{nextTime}</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex flex-1 flex-col p-4 md:p-6 overflow-auto gap-4 relative z-10 min-w-0">
          <React.Suspense fallback={
            <div className="flex-1 flex flex-col items-center justify-center h-full gap-3 text-muted">
              <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <span className="text-sm font-medium tracking-wide animate-pulse">Carregando módulo...</span>
            </div>
          }>
            <Outlet />
          </React.Suspense>
        </main>
      </div>

      {/* Footer Status */}
      <footer className="hidden md:flex h-8 shrink-0 bg-background border-t border-border items-center justify-between px-8">
         <div className="flex gap-4">
           <span className="text-[10px] text-zinc-600">Supabase: <span className="text-emerald-500">CONNECTED</span></span>
           <span className="text-[10px] text-zinc-600">MapEngine: <span className="text-emerald-500">{location.pathname === '/map' ? 'ACTIVE' : 'IDLE'}</span></span>
         </div>
         <div className="flex gap-4 items-center">
           <span className="text-[10px] text-muted">Maceió, AL - UTC -03:00</span>
         </div>
      </footer>
    </div>
  );
}
