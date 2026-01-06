import { Navigate } from "react-router";

/**
 * ProtectedRoute - wrapper component that redirects unverified users to email verification
 * Reduces cognitive complexity by centralizing the verification check
 */
function ProtectedRoute({ children, isUnverifiedSession, requireAuth = false, user = null }) {
  // Redirect unverified sessions to verification page
  if (isUnverifiedSession) {
    return <Navigate to="/verify-email" />;
  }
  
  // If authentication is required and user is not logged in, redirect to login page
  if (requireAuth && !user) {
    return <Navigate to="/login" />;
  }
  
  return children;
}

export default ProtectedRoute;

