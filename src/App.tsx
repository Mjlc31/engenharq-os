import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary font-medium">Initializing Security Protocol...</div>;
  if (!session) return <Navigate to="/login" replace />;
  
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
              <Route index element={<Dashboard />} />
              <Route path="scanner" element={<Scanner />} />
              <Route path="assets" element={<Assets />} />
              <Route path="workers" element={<Workers />} />
              <Route path="workers/:id" element={<WorkerProfile />} />
              <Route path="sites" element={<Sites />} />
              <Route path="map" element={<MapTracking />} />
              <Route path="tags" element={<PrintTags />} />
              <Route path="audit" element={<Audit />} />
              <Route path="settings" element={<Settings />} />
              <Route path="operations" element={<Operations />} />
              <Route path="reports" element={<Reports />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
