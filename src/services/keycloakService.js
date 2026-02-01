/**
 * Keycloak Authentication Service
 * Handles admin/staff authentication via Keycloak OAuth2
 *
 * NOTE: Authentication is currently BYPASSED for development
 */

// BYPASS AUTH - Backend removed Keycloak, all endpoints are now public
const BYPASS_AUTH = true;

// Keycloak configuration - direct URL (Amplify can't proxy to external servers)
const KEYCLOAK_URL = 'https://k8s-team33-keycloak-320152ed2f-65380cdab2265c8a.elb.ap-southeast-2.amazonaws.com';
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'Team33Casino';
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'Team33admin';
const KEYCLOAK_CLIENT_SECRET = import.meta.env.VITE_KEYCLOAK_CLIENT_SECRET || '';

// Token endpoint - call Keycloak directly (Amplify can't proxy to external servers)
const TOKEN_ENDPOINT = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

// Mock user for bypassed auth
const MOCK_USER = {
  id: 'mock-admin-id',
  username: 'admin',
  name: 'Admin User',
  email: 'admin@team33.com',
  roles: ['admin'],
  isAdmin: true,
  isStaff: true,
};

// Mock token for bypassed auth (this won't work with real API calls that validate JWT)
const MOCK_TOKEN = 'mock-jwt-token-for-development';

// Storage keys
const ADMIN_TOKEN_KEY = 'team33_admin_token';
const ADMIN_REFRESH_TOKEN_KEY = 'team33_admin_refresh_token';
const ADMIN_USER_KEY = 'team33_admin_user';
const TOKEN_EXPIRY_KEY = 'team33_admin_token_expiry';

// Token endpoint - uses proxy rewrite
const getTokenEndpoint = () => TOKEN_ENDPOINT;

// Parse JWT token to extract payload
const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

// Extract user info from token
const extractUserFromToken = (token) => {
  const payload = parseJwt(token);
  if (!payload) return null;

  // Get roles and normalize to lowercase for comparison
  const roles = payload.realm_access?.roles || [];
  const rolesLower = roles.map(r => r.toLowerCase());

  return {
    id: payload.sub,
    username: payload.preferred_username,
    name: payload.name || payload.preferred_username,
    email: payload.email,
    roles: roles,
    isAdmin: rolesLower.includes('admin'),
    isStaff: rolesLower.includes('staff'),
  };
};

class KeycloakService {
  constructor() {
    this.tokenRefreshTimer = null;
  }

  /**
   * Login with username and password (Resource Owner Password Grant)
   */
  async login(username, password) {
    // BYPASS: Always succeed
    if (BYPASS_AUTH) {
      console.log('[Keycloak] Auth bypassed - logging in as mock admin');
      localStorage.setItem(ADMIN_TOKEN_KEY, MOCK_TOKEN);
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(MOCK_USER));
      localStorage.setItem(TOKEN_EXPIRY_KEY, (Date.now() + 86400000).toString()); // 24 hours
      return { success: true, user: MOCK_USER, accessToken: MOCK_TOKEN };
    }

    const tokenEndpoint = getTokenEndpoint();
    console.log('[Keycloak] Attempting login to:', tokenEndpoint);
    console.log('[Keycloak] Client ID:', KEYCLOAK_CLIENT_ID);
    console.log('[Keycloak] Realm:', KEYCLOAK_REALM);

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: KEYCLOAK_CLIENT_ID,
          client_secret: KEYCLOAK_CLIENT_SECRET,
          username,
          password,
        }),
      });

      console.log('[Keycloak] Response status:', response.status);

      const data = await response.json();
      console.log('[Keycloak] Response data:', data.error || 'Token received');

      if (!response.ok) {
        return {
          success: false,
          error: data.error_description || data.error || 'Login failed',
        };
      }

      // Store tokens
      this.storeTokens(data);

      // Extract user from token
      const user = extractUserFromToken(data.access_token);
      console.log('[Keycloak] User logged in:', user?.username, 'Roles:', user?.roles);

      // Store user info
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));

      // Setup auto-refresh
      this.setupTokenRefresh(data.expires_in);

      return {
        success: true,
        user,
        accessToken: data.access_token,
      };
    } catch (error) {
      console.error('[Keycloak] Login error:', error);
      console.error('[Keycloak] Token endpoint was:', tokenEndpoint);
      return {
        success: false,
        error: `Network error: ${error.message}. Check browser console for details.`,
      };
    }
  }

  /**
   * Store tokens in localStorage
   */
  storeTokens(tokenData) {
    localStorage.setItem(ADMIN_TOKEN_KEY, tokenData.access_token);
    if (tokenData.refresh_token) {
      localStorage.setItem(ADMIN_REFRESH_TOKEN_KEY, tokenData.refresh_token);
    }
    // Store expiry time (current time + expires_in seconds)
    const expiryTime = Date.now() + (tokenData.expires_in * 1000);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  }

  /**
   * Get stored access token
   */
  getAccessToken() {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  }

  /**
   * Get stored refresh token
   */
  getRefreshToken() {
    return localStorage.getItem(ADMIN_REFRESH_TOKEN_KEY);
  }

  /**
   * Check if token is expired or about to expire (within 30 seconds)
   */
  isTokenExpired() {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiry) return true;
    return Date.now() > (parseInt(expiry) - 30000);
  }

  /**
   * Refresh the access token using refresh token
   */
  async refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return { success: false, error: 'No refresh token available' };
    }

    try {
      const response = await fetch(getTokenEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: KEYCLOAK_CLIENT_ID,
          client_secret: KEYCLOAK_CLIENT_SECRET,
          refresh_token: refreshToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Refresh token expired or invalid - user needs to re-login
        this.logout();
        return {
          success: false,
          error: 'Session expired. Please login again.',
          sessionExpired: true,
        };
      }

      // Store new tokens
      this.storeTokens(data);

      // Update user info
      const user = extractUserFromToken(data.access_token);
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));

      // Setup next refresh
      this.setupTokenRefresh(data.expires_in);

      return {
        success: true,
        accessToken: data.access_token,
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: 'Failed to refresh session.',
      };
    }
  }

  /**
   * Setup automatic token refresh
   */
  setupTokenRefresh(expiresIn) {
    // Clear existing timer
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    // Refresh 60 seconds before expiry
    const refreshTime = (expiresIn - 60) * 1000;
    if (refreshTime > 0) {
      this.tokenRefreshTimer = setTimeout(() => {
        this.refreshToken();
      }, refreshTime);
    }
  }

  /**
   * Get valid access token (refreshes if needed)
   */
  async getValidToken() {
    // BYPASS: Always return mock token
    if (BYPASS_AUTH) {
      return MOCK_TOKEN;
    }

    if (this.isTokenExpired()) {
      const result = await this.refreshToken();
      if (!result.success) {
        return null;
      }
      return result.accessToken;
    }
    return this.getAccessToken();
  }

  /**
   * Logout - clear all tokens and user data
   */
  logout() {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  }

  /**
   * Get current admin user
   */
  getCurrentUser() {
    // BYPASS: Always return mock user
    if (BYPASS_AUTH) {
      return MOCK_USER;
    }

    try {
      const userJson = localStorage.getItem(ADMIN_USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    // BYPASS: Always authenticated
    if (BYPASS_AUTH) {
      return true;
    }

    const token = this.getAccessToken();
    const user = this.getCurrentUser();
    return token && user && !this.isTokenExpired();
  }

  /**
   * Check if user has admin role
   */
  isAdmin() {
    if (BYPASS_AUTH) return true;
    const user = this.getCurrentUser();
    return user?.isAdmin || false;
  }

  /**
   * Check if user has staff role
   */
  isStaff() {
    if (BYPASS_AUTH) return true;
    const user = this.getCurrentUser();
    return user?.isStaff || false;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role) {
    const user = this.getCurrentUser();
    return user?.roles?.includes(role) || false;
  }

  /**
   * Initialize service - check for existing session and setup refresh
   */
  async init() {
    const token = this.getAccessToken();
    if (!token) return false;

    if (this.isTokenExpired()) {
      const result = await this.refreshToken();
      return result.success;
    }

    // Token is valid, setup refresh timer
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (expiry) {
      const remainingTime = parseInt(expiry) - Date.now();
      if (remainingTime > 0) {
        this.setupTokenRefresh(remainingTime / 1000);
      }
    }

    return true;
  }
}

export const keycloakService = new KeycloakService();
export default keycloakService;
