import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ui/Toast';
import { GOVERNANCE_ROLES, MANAGEMENT_ROLES } from './services/rbacService';
import type { UserRole } from './types';

const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Assets = React.lazy(() => import('./pages/Assets').then(m => ({ default: m.Assets })));
const Workers = React.lazy(() => import('./pages/Workers').then(m => ({ default: m.Workers })));
const MapTracking = React.lazy(() => import('./pages/Map').then(m => ({ default: m.MapTracking })));
const Scanner = React.lazy(() => import('./pages/Scanner').then(m => ({ default: m.Scanner })));
const PrintTags = React.lazy(() => import('./pages/PrintTags').then(m => ({ default: m.PrintTags })));
const Audit = React.lazy(() => import('./pages/Audit').then(m => ({ default: m.Audit })));
const Sites = React.lazy(() => import('./pages/Sites').then(m => ({ default: m.Sites })));
const WorkerProfile = React.lazy(() => import('./pages/WorkerProfile').then(m => ({ default: m.WorkerProfile })));
const Operations = React.lazy(() => import('./pages/Operations').then(m => ({ default: m.Operations })));
const Reports = React.lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const FichaEpi = React.lazy(() => import('./pages/FichaEpi').then(m => ({ default: m.FichaEpi })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Trainings = React.lazy(() => import('./pages/Trainings').then(m => ({ default: m.Trainings })));
const Aso = React.lazy(() => import('./pages/Aso').then(m => ({ default: m.Aso })));
const AlmoxarifadoKds = React.lazy(() => import('./pages/AlmoxarifadoKds').then(m => ({ default: m.AlmoxarifadoKds })));
const KdsTv = React.lazy(() => import('./pages/KdsTv').then(m => ({ default: m.KdsTv })));
const NotFound = React.lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

// Guarda por papel, fail-closed: papel nulo ou fora da lista não entra.
const RoleRoute = ({ allow, children }: { allow: UserRole[]; children: React.ReactNode }) => {
  // O perfil do banco decide o acesso; o cargo (custom_role) é só o nome exibido.
  const { role: current } = useAuth();
  if (current && allow.includes(current)) return <>{children}</>;
  return <Navigate to={current && MANAGEMENT_ROLES.includes(current) ? '/' : '/almoxarifado-kds'} replace />;
};

const Mgmt = ({ children }: { children: React.ReactNode }) => <RoleRoute allow={MANAGEMENT_ROLES}>{children}</RoleRoute>;
const Gov = ({ children }: { children: React.ReactNode }) => <RoleRoute allow={GOVERNANCE_ROLES}>{children}</RoleRoute>;

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary font-medium">Initializing Security Protocol...</div>;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
        <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center text-primary font-medium">Carregando...</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            {/* Telão do balcão: tela cheia, fora do Layout (sem menu). */}
            <Route path="/kds/tv" element={<ProtectedRoute><KdsTv /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Mgmt><Dashboard /></Mgmt>} />
              <Route path="almoxarifado-kds" element={<AlmoxarifadoKds />} />
              <Route path="scanner" element={<Scanner />} />
              <Route path="assets" element={<Assets />} />
              <Route path="workers" element={<Mgmt><Workers /></Mgmt>} />
              <Route path="workers/:id" element={<Mgmt><WorkerProfile /></Mgmt>} />
              <Route path="sites" element={<Mgmt><Sites /></Mgmt>} />
              <Route path="map" element={<Mgmt><MapTracking /></Mgmt>} />
              <Route path="tags" element={<Mgmt><PrintTags /></Mgmt>} />
              <Route path="print-tags" element={<Mgmt><PrintTags /></Mgmt>} />
              <Route path="audit" element={<Gov><Audit /></Gov>} />
              <Route path="settings" element={<Gov><Settings /></Gov>} />
              <Route path="operations" element={<Operations />} />
              <Route path="reports" element={<Mgmt><Reports /></Mgmt>} />
              <Route path="ficha-epi" element={<Mgmt><FichaEpi /></Mgmt>} />
              <Route path="trainings" element={<Mgmt><Trainings /></Mgmt>} />
              <Route path="aso" element={<Mgmt><Aso /></Mgmt>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </React.Suspense>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
