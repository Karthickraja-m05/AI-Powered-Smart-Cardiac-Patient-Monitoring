import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import type { UserRole } from './types';

// ── Auth ──
import LoginPage from './pages/LoginPage.tsx';

// ── Old pages (preserved) ──
import AdminDashboard from './pages/AdminDashboard.tsx';
import PatientList from './pages/PatientList.tsx';
import PatientDetail from './pages/PatientDetail.tsx';
import LiveMonitoring from './pages/LiveMonitoring.tsx';

// ── Role-Based Layout ──
import RoleBasedLayout from './components/layouts/RoleBasedLayout.tsx';

// ── Role-Specific Dashboards ──
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard.tsx';
import HospitalAdminDashboard from './pages/hospitaladmin/HospitalAdminDashboard.tsx';
import DoctorDashboard from './pages/doctor/DoctorDashboard.tsx';
import NurseDashboard from './pages/nurse/NurseDashboard.tsx';
import PatientPortalDashboard from './pages/patient/PatientPortalDashboard.tsx';
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard.tsx';
import CaregiverDashboard from './pages/caregiver/CaregiverDashboard.tsx';

// ── Doctor Portal Sub-Pages ──
import DoctorAvailabilityPage from './pages/doctor/DoctorAvailabilityPage.tsx';
import DoctorShiftsPage from './pages/doctor/DoctorShiftsPage.tsx';

// ── Feature Components (used as pages) ──
import DoctorSearchComponent from './components/features/DoctorSearch.tsx';
import AuditLogViewer from './components/features/AuditLogViewer.tsx';
import ICUPriorityBoard from './components/features/ICUPriorityBoard.tsx';
import VisitorManagement from './components/features/VisitorManagement.tsx';
import AppointmentsPage from './pages/AppointmentsPage.tsx';

import RegisterPatientPage from './pages/receptionist/RegisterPatientPage.tsx';

// ── Super Admin Sub-Pages ──
import HospitalsPage from './pages/superadmin/HospitalsPage.tsx';
import DepartmentsPage from './pages/superadmin/DepartmentsPage.tsx';
import ManageUsersPage from './pages/superadmin/ManageUsersPage.tsx';
import ShiftManagementPage from './pages/superadmin/ShiftManagementPage.tsx';
import CarbonReportsPage from './pages/superadmin/CarbonReportsPage.tsx';

// Map each role to its home dashboard
const roleDashboards: Record<UserRole, React.ComponentType> = {
  super_admin: SuperAdminDashboard,
  hospital_admin: HospitalAdminDashboard,
  doctor: DoctorDashboard,
  nurse: NurseDashboard,
  patient: PatientPortalDashboard,
  receptionist: ReceptionistDashboard,
  caregiver: CaregiverDashboard,
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Returns the dashboard component for the current user's role */
function RoleDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role || 'patient') as UserRole;
  const DashComp = roleDashboards[role] || AdminDashboard;
  return <DashComp />;
}

/** Returns the shift component for current user role (doctor gets personal schedule, admin gets fleet management) */
function RoleShiftsPage() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role || 'patient') as UserRole;
  if (role === 'doctor') return <DoctorShiftsPage />;
  return <ShiftManagementPage />;
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
              <RoleBasedLayout>
                <Routes>
                  {/* Home: Role-specific dashboard */}
                  <Route path="/" element={<RoleDashboardPage />} />
                  <Route path="/dashboard" element={<RoleDashboardPage />} />

                  {/* Shared pages (preserved) */}
                  <Route path="/patients" element={<PatientList />} />
                  <Route path="/patients/:id" element={<PatientDetail />} />
                  <Route path="/monitoring" element={<LiveMonitoring />} />

                  {/* New feature pages */}
                  <Route path="/doctor-search" element={<DoctorSearchComponent />} />
                  <Route path="/appointments" element={<AppointmentsPage />} />
                  <Route path="/visitors" element={<VisitorManagement />} />
                  <Route path="/audit" element={<AuditLogViewer />} />
                  <Route path="/icu-priority" element={<ICUPriorityBoard />} />

                  {/* Super Admin sub-pages */}
                  <Route path="/hospitals" element={<HospitalsPage />} />
                  <Route path="/departments" element={<DepartmentsPage />} />
                  <Route path="/users" element={<ManageUsersPage />} />
                  <Route path="/shifts" element={<RoleShiftsPage />} />
                  <Route path="/carbon" element={<CarbonReportsPage />} />

                  {/* Role-specific shortcuts */}
                  <Route path="/register" element={<RegisterPatientPage />} />
                  <Route path="/availability" element={<DoctorAvailabilityPage />} />

                  {/* Legacy admin dashboard (accessible by admins) */}
                  <Route path="/admin-dashboard" element={<AdminDashboard />} />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </RoleBasedLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
