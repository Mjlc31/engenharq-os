import React, { useState, useEffect } from 'react';
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { ShieldCheck, HardHat, Users, MapPin, LogOut, Menu, X, ScanBarcode, Printer, FileBarChart, Building2, Settings, ClipboardList, Activity, Sun, Moon, GraduationCap, HeartPulse, History, Tv } from 'lucide-react';
import { cn } from '../lib/utils';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { useEscapeToClose } from '../hooks/useEscapeToClose';
import { ROLE_LABELS } from '../services/rbacService';

type NavEntry = { name: string; href: string; icon: React.ElementType; roles: string[] };

const MANAGEMENT_ROLES = ['ADMIN', 'SAFETY_ENGINEER', 'SITE_MANAGER'];
const ALL_ROLES = [...MANAGEMENT_ROLES, 'ALMOXARIFADO'];

const NAVIGATION: NavEntry[] = [
  { name: 'Dashboard Central', href: '/', icon: ShieldCheck, roles: MANAGEMENT_ROLES },
  { name: 'Painel TV Fast Food', href: '/almoxarifado-kds', icon: Tv, roles: ALL_ROLES },
  { name: 'Almoxarifado (Scan)', href: '/scanner', icon: ScanBarcode, roles: ALL_ROLES },
  { name: 'Mapa de Ativos', href: '/map', icon: MapPin, roles: MANAGEMENT_ROLES },
  { name: 'Estoque (NR-6)', href: '/assets', icon: HardHat, roles: ALL_ROLES },
  { name: 'Colaboradores', href: '/workers', icon: Users, roles: MANAGEMENT_ROLES },
  { name: 'Painel de Operações', href: '/operations', icon: Activity, roles: ALL_ROLES },
  { name: 'Treinamentos (NR)', href: '/trainings', icon: GraduationCap, roles: MANAGEMENT_ROLES },
  { name: 'Controle de ASO', href: '/aso', icon: HeartPulse, roles: MANAGEMENT_ROLES },
  { name: 'Painel de Relatórios', href: '/reports', icon: ClipboardList, roles: MANAGEMENT_ROLES },
  { name: 'Ficha de EPI', href: '/ficha-epi', icon: FileBarChart, roles: MANAGEMENT_ROLES },
  { name: 'Empresa / Obras', href: '/sites', icon: Building2, roles: MANAGEMENT_ROLES },
  { name: 'Imprimir QR Codes', href: '/tags', icon: Printer, roles: MANAGEMENT_ROLES },
  // Mesmos papéis das rotas em App.tsx: só o almoxarife fica de fora.
  { name: 'Configurações', href: '/settings', icon: Settings, roles: MANAGEMENT_ROLES },
  { name: 'Auditoria', href: '/audit', icon: History, roles: MANAGEMENT_ROLES },
];

const MANAGEMENT_GROUPS: { label: string; items: string[] }[] = [
  { label: 'Principal', items: ['Dashboard Central', 'Painel TV Fast Food'] },
  { label: 'Cadastros', items: ['Empresa / Obras', 'Colaboradores', 'Estoque (NR-6)'] },
  { label: 'Operações', items: ['Almoxarifado (Scan)', 'Mapa de Ativos', 'Painel de Operações'] },
  { label: 'Saúde e Segurança (SST)', items: ['Treinamentos (NR)', 'Controle de ASO'] },
  { label: 'Relatórios', items: ['Painel de Relatórios', 'Ficha de EPI', 'Imprimir QR Codes'] },
  { label: 'Administração', items: ['Configurações', 'Auditoria'] },
];

const ALMOXARIFADO_GROUPS = [
  { label: 'Módulo Almoxarifado', items: ['Painel TV Fast Food', 'Almoxarifado (Scan)', 'Estoque (NR-6)', 'Painel de Operações'] },
];

const navItemClass = ({ isActive }: { isActive: boolean }) => cn(
  'flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors duration-200',
  '-outline-offset-2',
  isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-muted hover:bg-surface-hover hover:text-foreground'
);

const groupLabelClass = 'px-3 mt-4 mb-1 text-xs font-bold uppercase tracking-wider text-muted first:mt-1';

const iconButtonClass = 'h-9 w-9 rounded-full bg-surface-hover flex items-center justify-center border border-border cursor-pointer text-muted hover:text-primary transition-colors';

export function Layout() {
  const { signOut, user, role, customRole } = useAuth();
  const { isOnline } = useOfflineQueue();
  useEscapeToClose();
  const isAlmoxarifado = role === 'ALMOXARIFADO' || (customRole && customRole.toLowerCase().includes('almoxarif'));
  const roleLabel = customRole || (role ? ROLE_LABELS[role] : '');
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fecha o drawer no mobile a cada navegação.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('engenharq-theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('engenharq-theme', theme);
  }, [theme]);

  const visibleItems = NAVIGATION.filter(item => item.roles.includes(isAlmoxarifado ? 'ALMOXARIFADO' : role || 'SITE_MANAGER'));
  const groups = (isAlmoxarifado ? ALMOXARIFADO_GROUPS : MANAGEMENT_GROUPS)
    .map(group => ({ label: group.label, items: visibleItems.filter(item => group.items.includes(item.name)) }))
    .filter(group => group.items.length > 0);

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
              Engenhar<span className="text-primary">Q</span> OS
            </h1>
          </Link>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2" role="status" aria-live="polite">
            <span className={cn("h-2 w-2 rounded-full", isOnline ? "bg-emerald-500" : "bg-amber-400")} />
            <span className={cn("text-xs font-medium", isOnline ? "hidden md:inline text-muted" : "text-amber-400")}>
              {isOnline ? 'Online' : 'Sem conexão'}
            </span>
          </div>
          <div className="flex items-center gap-3 md:border-l md:border-border md:pl-6">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold truncate max-w-[180px]">{user?.email}</p>
              {roleLabel && <p className="text-xs text-muted truncate max-w-[180px]">{roleLabel}</p>}
            </div>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={iconButtonClass}
              title="Alternar tema"
              aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={signOut}
              className={iconButtonClass}
              title="Sair"
              aria-label="Sair da conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-muted ml-2 rounded p-1 hover:text-foreground cursor-pointer transition-colors"
              aria-label={isSidebarOpen ? "Fechar menu lateral" : "Abrir menu lateral"}
              aria-expanded={isSidebarOpen}
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
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Menu de navegação</span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 rounded text-muted hover:text-foreground cursor-pointer"
              aria-label="Fechar menu lateral"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto" aria-label="Navegação principal">
            {groups.map(group => (
              <React.Fragment key={group.label}>
                <div className={groupLabelClass}>{group.label}</div>
                {group.items.map(item => (
                  <NavLink key={item.href} to={item.href} end={item.href === '/'} className={navItemClass}>
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.name}
                  </NavLink>
                ))}
              </React.Fragment>
            ))}

            <div className={groupLabelClass}>Sistema</div>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm transition-colors duration-200 cursor-pointer text-muted hover:bg-red-500/10 hover:text-red-500"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </nav>
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
    </div>
  );
}
