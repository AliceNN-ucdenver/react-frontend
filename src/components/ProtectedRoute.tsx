import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types/user';
import { auditLogger } from '@/services/auditLogger';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

/**
 * Deny-by-default route guard (OWASP A01).
 * - Unauthenticated users → /login
 * - Authenticated but insufficient role → /unauthorized
 * - Authorized → renders children
 */
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    auditLogger.logUnauthorizedAccess(location.pathname);
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
