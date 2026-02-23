import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { auditLogger } from '@/services/auditLogger';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Admin-only route guard.
 * Re-verifies 'admin' role on every mount to handle mid-session
 * token expiry or role changes (OWASP A01).
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  // Re-check role on every mount, not just initial render
  useEffect(() => {
    if (isAuthenticated && !hasRole('admin')) {
      auditLogger.logUnauthorizedAccess(location.pathname);
    }
  }, [isAuthenticated, hasRole, location.pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasRole('admin')) {
    auditLogger.logUnauthorizedAccess(location.pathname);
    return <Navigate to="/unauthorized" replace />;
  }

  useEffect(() => {
    auditLogger.logAdminPageAccess(location.pathname);
  }, [location.pathname]);

  return <>{children}</>;
}
