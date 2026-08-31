import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Layout() {
  const { auth, logout, can } = useAuth();

  const links = [
    { to: '/', label: 'Dashboard', end: true, show: true },
    { to: '/requests', label: 'My Requests', show: true },
    { to: '/approvals', label: 'Approvals', show: can('approver') },
    { to: '/reports', label: 'Reports', show: can('approver') },
    { to: '/staff', label: 'Staff', show: can('hr_admin') }
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          Pinoy Ride <strong>HR Portal</strong>
        </div>
        <div className="userbox">
          <span className="user-name">{auth?.fullName || 'Staff'}</span>
          <span className={`role-badge role-${auth?.role || ''}`}>{auth?.role || ''}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <nav className="navbar">
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
            </NavLink>
          ))}
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}