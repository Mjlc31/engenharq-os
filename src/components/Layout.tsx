import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { ShieldCheck, HardHat, Users, MapPin, LogOut, Menu, X, ScanBarcode, Printer, FileBarChart, Building2, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

export function Layout() {
  const { signOut, user, role } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Cadastros: false,
    Operações: false,
    Relatórios: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const navigation = [
    { name: 'Dashboard Central', href: '/', icon: ShieldCheck, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },
    { name: 'Almoxarifado (Scan)', href: '/scanner', icon: ScanBarcode, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },
    { name: 'Mapa de Ativos', href: '/map', icon: MapPin, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },
    { name: 'Estoque (NR-6)', href: '/assets', icon: HardHat, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },
    { name: 'Colaboradores', href: '/workers', icon: Users, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },
    { name: 'Empresa / Obras', href: '/sites', icon: Building2, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },
    { name: 'Imprimir QR Codes', href: '/tags', icon: Printer, roles: ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'] },
    { name: 'Auditoria NR-6', href: '/audit', icon: FileBarChart, roles: ['ADMIN', 'SAFETY_ENGINEER'] },
  ].filter(item => item.roles.includes(role || 'SITE_MANAGER'));

  return (
    <div className="flex h-screen w-full flex-col bg-background font-sans text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 md:px-8 relative z-20">
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-background font-black">
            EQ
          </div>
          <h1 className="text-lg font-bold tracking-tight uppercase">
            Engenhar<span className="text-primary">Q</span> OS <span className="ml-2 text-[10px] text-muted font-mono border border-border px-1 rounded hidden lg:inline-block">v2.4.0</span>
          </h1>
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
              onClick={signOut}
              className="h-9 w-9 rounded-full bg-surface-hover flex items-center justify-center border border-border cursor-pointer relative group text-muted hover:text-primary transition-colors"
              title="Sign Out"
              aria-label="Sair da conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="text-muted ml-2 focus:outline-none focus:ring-2 focus:ring-primary rounded p-1"
              aria-label={isSidebarOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={isSidebarOpen}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden transition-opacity" 
            onClick={() => setIsSidebarOpen(false)} 
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "flex w-64 md:w-60 shrink-0 flex-col border-r border-border bg-[var(--color-sidebar)] p-4 absolute md:relative z-40 h-full transition-all duration-300 ease-in-out shadow-2xl md:shadow-none",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:hidden"
        )}>
          <nav className="flex flex-col gap-1">
            <div className="text-[10px] font-bold text-muted uppercase tracking-widest px-3 mt-2 mb-1">Principal</div>
            {navigation.filter(item => ['Dashboard Central'].includes(item.name)).map(item => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => { if (window.innerWidth < 768) setIsSidebarOpen(false); }}
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
                  onClick={() => { if (window.innerWidth < 768) setIsSidebarOpen(false); }}
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
            {openSections['Operações'] && navigation.filter(item => ['Almoxarifado (Scan)', 'Mapa de Ativos'].includes(item.name)).map(item => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => { if (window.innerWidth < 768) setIsSidebarOpen(false); }}
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
            {openSections['Relatórios'] && navigation.filter(item => ['Auditoria NR-6', 'Imprimir QR Codes'].includes(item.name)).map(item => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => { if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                  className={cn("flex items-center gap-3 rounded px-3 py-2 text-sm transition-all duration-200 cursor-pointer", isActive ? "bg-surface-hover text-primary font-bold shadow-sm" : "text-muted hover:bg-surface-hover hover:text-foreground")}
                >
                  <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted")} />
                  {item.name}
                </Link>
              );
            })}
            <div className="text-[10px] font-bold text-muted uppercase tracking-widest px-3 mt-4 mb-1">Administração</div>
            <button
              className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm transition-all duration-200 cursor-not-allowed text-muted/50"
              disabled
            >
              <Settings className="w-4 h-4" />
              Configurações
            </button>

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
              <p className="text-xs">Obra Ponta Verde</p>
              <p className="text-lg font-mono text-primary">14:20h</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex flex-1 flex-col p-4 md:p-6 overflow-auto gap-4 relative z-10">
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
