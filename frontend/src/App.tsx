import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage.tsx';
import DashboardLayout from './components/DashboardLayout.tsx';
import AdminDashboard from './pages/AdminDashboard.tsx';
import PatientList from './pages/PatientList.tsx';
import PatientDetail from './pages/PatientDetail.tsx';
import LiveMonitoring from './pages/LiveMonitoring.tsx';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          className: '!bg-surface-800 !text-slate-100 !border !border-white/10 !shadow-xl',
          duration: 4000,
          style: {
            background: 'rgba(17, 24, 39, 0.95)',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<AdminDashboard />} />
                  <Route path="/dashboard" element={<AdminDashboard />} />
                  <Route path="/patients" element={<PatientList />} />
                  <Route path="/patients/:id" element={<PatientDetail />} />
                  <Route path="/monitoring" element={<LiveMonitoring />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
