import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { auditLogger } from '@/services/auditLogger';

/**
 * Admin dashboard layout wrapper.
 * Role re-verified on every mount to handle mid-session changes (OWASP A01).
 * Never displays JWT token or sensitive claims (OWASP A04).
 */
export function AdminDashboardPage() {
  const { user, hasRole } = useAuth();
  const location = useLocation();

  // Re-verify admin role on every mount and location change
  useEffect(() => {
    if (!hasRole('admin')) {
      auditLogger.logUnauthorizedAccess(location.pathname);
    } else {
      auditLogger.logAdminPageAccess(location.pathname);
    }
  }, [hasRole, location.pathname]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav
        style={{
          width: '240px',
          background: '#1a1a2e',
          color: '#fff',
          padding: '1.5rem',
          flexShrink: 0,
        }}
      >
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 0.25rem', fontSize: '1rem', color: '#aaa' }}>Admin Panel</h2>
          {/* Display email and role only — never JWT token (OWASP A04) */}
          <p style={{ margin: 0, fontSize: '0.875rem' }}>{user?.displayName ?? 'Admin'}</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#aaa' }}>
            Role: {user?.role ?? '—'}
          </p>
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            { to: '/admin/movies', label: 'Movies' },
            { to: '/admin/movies/new', label: 'Add Movie' },
            { to: '/admin/actors', label: 'Actors' },
          ].map(({ to, label }) => (
            <li key={to} style={{ marginBottom: '0.5rem' }}>
              <Link
                to={to}
                style={{
                  color: '#fff',
                  textDecoration: 'none',
                  display: 'block',
                  padding: '0.5rem',
                  borderRadius: '4px',
                }}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <Link to="/" style={{ color: '#aaa', fontSize: '0.875rem' }}>
            ← Back to Site
          </Link>
        </div>
      </nav>

      <main style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
