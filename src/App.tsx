import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Assets } from './pages/Assets';
import { Workers } from './pages/Workers';
import { MapTracking } from './pages/Map';
import { Scanner } from './pages/Scanner';
import { PrintTags } from './pages/PrintTags';
import { Audit } from './pages/Audit';
import { Sites } from './pages/Sites';
import { WorkerProfile } from './pages/WorkerProfile';

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
      <BrowserRouter>
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
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
