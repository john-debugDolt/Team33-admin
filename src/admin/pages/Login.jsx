import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { keycloakService } from '../../services/keycloakService';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get the redirect path from location state (set by ProtectedRoute)
  const from = location.state?.from?.pathname || '/users';

  // Check for error message passed from ProtectedRoute
  useEffect(() => {
    if (location.state?.error) {
      setError(location.state.error);
    }

    // If user is already authenticated, redirect to intended page
    if (keycloakService.isAuthenticated()) {
      const user = keycloakService.getCurrentUser();
      if (user?.isAdmin || user?.isStaff) {
        navigate(from, { replace: true });
      }
    }
  }, [location.state, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await keycloakService.login(username, password);

      if (result.success) {
        // Check if user has admin or staff role
        if (result.user.isAdmin || result.user.isStaff) {
          // Redirect to the originally requested page or default to /users
          navigate(from, { replace: true });
        } else {
          setError('Access denied. Admin or Staff role required.');
          keycloakService.logout();
        }
      } else {
        setError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h1 className="login-title">Admin Login</h1>
        {error && (
          <div style={{
            color: '#ef4444',
            backgroundColor: '#fef2f2',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-row">
            <span className="form-label">Username</span>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="form-row">
            <span className="form-label">Password</span>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'LOGGING IN...' : 'LOGIN'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
