import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ui/Toast';

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
const NotFound = React.lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

// Almoxarifado Restricted Route Guard
const AlmoxarifadoRestrictedRoute = ({ children }: { children: React.ReactNode }) => {
  const { role, customRole } = useAuth();
  if (role === 'ADMIN') {
    return <>{children}</>;
  }
  const isAlmoxarifado = role === 'ALMOXARIFADO' || (customRole && customRole.toLowerCase().includes('almoxarif'));
  if (isAlmoxarifado) {
    return <Navigate to="/almoxarifado-kds" replace />;
  }
  return <>{children}</>;
};

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
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<AlmoxarifadoRestrictedRoute><Dashboard /></AlmoxarifadoRestrictedRoute>} />
              <Route path="almoxarifado-kds" element={<AlmoxarifadoKds />} />
              <Route path="scanner" element={<Scanner />} />
              <Route path="assets" element={<Assets />} />
              <Route path="workers" element={<AlmoxarifadoRestrictedRoute><Workers /></AlmoxarifadoRestrictedRoute>} />
              <Route path="workers/:id" element={<AlmoxarifadoRestrictedRoute><WorkerProfile /></AlmoxarifadoRestrictedRoute>} />
              <Route path="sites" element={<AlmoxarifadoRestrictedRoute><Sites /></AlmoxarifadoRestrictedRoute>} />
              <Route path="map" element={<AlmoxarifadoRestrictedRoute><MapTracking /></AlmoxarifadoRestrictedRoute>} />
              <Route path="tags" element={<AlmoxarifadoRestrictedRoute><PrintTags /></AlmoxarifadoRestrictedRoute>} />
              <Route path="print-tags" element={<AlmoxarifadoRestrictedRoute><PrintTags /></AlmoxarifadoRestrictedRoute>} />
              <Route path="audit" element={<AlmoxarifadoRestrictedRoute><Audit /></AlmoxarifadoRestrictedRoute>} />
              <Route path="settings" element={<AlmoxarifadoRestrictedRoute><Settings /></AlmoxarifadoRestrictedRoute>} />
              <Route path="operations" element={<Operations />} />
              <Route path="reports" element={<AlmoxarifadoRestrictedRoute><Reports /></AlmoxarifadoRestrictedRoute>} />
              <Route path="ficha-epi" element={<AlmoxarifadoRestrictedRoute><FichaEpi /></AlmoxarifadoRestrictedRoute>} />
              <Route path="trainings" element={<AlmoxarifadoRestrictedRoute><Trainings /></AlmoxarifadoRestrictedRoute>} />
              <Route path="aso" element={<AlmoxarifadoRestrictedRoute><Aso /></AlmoxarifadoRestrictedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </React.Suspense>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
