import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Layout() {
  const { auth, logout, can } = useAuth();
  const location = useLocation();
  const isApprover = can('approver');
  const [pendingCount, setPendingCount] = useState(0);

  // Count of pending timekeeping requests assigned to this approver, shown as a
  // badge on the Approvals nav link. Refetched on navigation so it stays fresh
  // after approving/rejecting on the Approvals page.
  const loadPending = useCallback(async () => {
    if (!isApprover) return;
    try {
      const items = await api.approvals();
      setPendingCount(Array.isArray(items) ? items.length : 0);
    } catch {
      /* leave the last known count on transient errors */
    }
  }, [isApprover]);

  useEffect(() => {
    loadPending();
  }, [loadPending, location.pathname]);

  const links = [
    { to: '/', label: 'Dashboard', end: true, show: true },
    { to: '/payslip', label: 'My Payslip', show: true },
    { to: '/requests', label: 'My Requests', show: true },
    { to: '/approvals', label: 'Approvals', show: isApprover, badge: pendingCount },
    { to: '/reports', label: 'Reports', show: can('approver') },
    { to: '/payroll', label: 'Payroll', show: can('hr_admin') },
    { to: '/staff', label: 'Staff', show: can('hr_admin') }
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/logo-icon.png" alt="Pinoy Ride logo" className="brand-logo" />
          Pinoy Ride <strong>HR Portal</strong>
        </div>

        <nav className="topbar-nav">
          {links
            .filter((l) => l.show)
            .map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
              >
                {l.label}
                {l.badge > 0 ? <span className="nav-badge">{l.badge}</span> : null}
              </NavLink>
            ))}
        </nav>

        <div className="userbox">
          <span className="user-name">{auth?.fullName || 'Staff'}</span>
          <span className={`role-badge role-${auth?.role || ''}`}>{auth?.role || ''}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}