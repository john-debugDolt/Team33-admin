import { Navigate, useLocation } from 'react-router-dom';
import { keycloakService } from '../services/keycloakService';

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 * Redirects unauthenticated users to the login page
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @param {boolean} props.requireAdmin - If true, requires admin role (optional)
 * @returns {React.ReactNode} - Children if authenticated, Navigate to /login otherwise
 */
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  // Get current location so we can redirect back after login
  const location = useLocation();

  // Check if user is authenticated via Keycloak
  const isAuthenticated = keycloakService.isAuthenticated();

  // Check if user has required roles
  const user = keycloakService.getCurrentUser();
  const hasRequiredRole = user?.isAdmin || user?.isStaff;

  // If requireAdmin is true, check specifically for admin role
  const hasAdminRole = requireAdmin ? user?.isAdmin : true;

  // If not authenticated, redirect to login page
  // Pass current location in state so we can redirect back after login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated but doesn't have required role, redirect to login with error
  if (!hasRequiredRole || !hasAdminRole) {
    keycloakService.logout();
    return <Navigate to="/login" state={{ error: 'Access denied. Admin or Staff role required.' }} replace />;
  }

  // User is authenticated and has required role, render children
  return children;
};

export default ProtectedRoute;
