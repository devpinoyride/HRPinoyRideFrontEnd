import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import RequestsPage from './pages/RequestsPage.jsx';
import ApprovalsPage from './pages/ApprovalsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import PayrollPage from './pages/PayrollPage.jsx';
import StaffPage from './pages/StaffPage.jsx';

function RequireAuth({ children }) {
  const { auth } = useAuth();
  const location = useLocation();
  if (!auth) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function RequireRole({ level, children }) {
  const { auth, can } = useAuth();
  if (!auth) return <Navigate to="/login" replace />;
  if (!can(level)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { auth } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={auth ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route
          path="approvals"
          element={
            <RequireRole level="approver">
              <ApprovalsPage />
            </RequireRole>
          }
        />
        <Route
          path="reports"
          element={
            <RequireRole level="approver">
              <ReportsPage />
            </RequireRole>
          }
        />
        <Route
          path="payroll"
          element={
            <RequireRole level="hr_admin">
              <PayrollPage />
            </RequireRole>
          }
        />
        <Route
          path="staff"
          element={
            <RequireRole level="hr_admin">
              <StaffPage />
            </RequireRole>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}