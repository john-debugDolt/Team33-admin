/**
 * API Service
 * Centralized API client for Team33 Admin Panel
 *
 * Base URL: https://api.team33.mx
 * All endpoints require Bearer token in Authorization header
 */

import { keycloakService } from './keycloakService';

// API Base URL - uses environment variable or defaults to production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.team33.mx';

/**
 * Makes an authenticated API request
 * Automatically includes Bearer token from Keycloak service
 *
 * @param {string} endpoint - API endpoint (e.g., '/api/admin/accounts')
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Object>} - Response data or error
 */
const apiRequest = async (endpoint, options = {}) => {
  // Get valid token from Keycloak service (refreshes if needed)
  const token = await keycloakService.getValidToken();

  // If no token available, user needs to re-authenticate
  if (!token) {
    return {
      success: false,
      error: 'Session expired. Please login again.',
      sessionExpired: true,
    };
  }

  // Build request URL
  const url = `${API_BASE_URL}${endpoint}`;

  // Set default headers with Bearer token
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle different response statuses
    if (response.status === 401) {
      // Token might be invalid, try to refresh
      keycloakService.logout();
      return {
        success: false,
        error: 'Session expired. Please login again.',
        sessionExpired: true,
      };
    }

    if (response.status === 403) {
      return {
        success: false,
        error: 'Access denied. Insufficient permissions.',
        status: 403,
      };
    }

    if (response.status === 404) {
      return {
        success: false,
        error: 'Resource not found.',
        status: 404,
      };
    }

    // Parse JSON response
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error: data?.error || data?.message || `Request failed with status ${response.status}`,
        status: response.status,
        data,
      };
    }

    return {
      success: true,
      data,
      status: response.status,
    };
  } catch (error) {
    console.error('[API] Request error:', error);
    return {
      success: false,
      error: `Network error: ${error.message}`,
    };
  }
};

// ============================================
// ACCOUNT MANAGEMENT (ADMIN only)
// ============================================

/**
 * Get all accounts
 */
export const getAllAccounts = () => apiRequest('/api/admin/accounts');

/**
 * Get account by ID
 * @param {string} accountId - Account ID (e.g., 'ACC283930606797066240')
 */
export const getAccountById = (accountId) => apiRequest(`/api/admin/accounts/${accountId}`);

/**
 * Search accounts by name
 * @param {string} name - Name to search for
 */
export const searchAccountsByName = (name) =>
  apiRequest(`/api/admin/accounts/search/name?q=${encodeURIComponent(name)}`);

/**
 * Search accounts by phone
 * @param {string} phone - Phone number to search for
 */
export const searchAccountsByPhone = (phone) =>
  apiRequest(`/api/admin/accounts/search/phone?q=${encodeURIComponent(phone)}`);

// ============================================
// DEPOSIT MANAGEMENT (ADMIN or STAFF)
// ============================================

/**
 * Get all pending deposits
 */
export const getPendingDeposits = () => apiRequest('/api/admin/deposits/pending');

/**
 * Get deposits by status
 * @param {string} status - Status: PENDING, APPROVED, REJECTED, COMPLETED
 */
export const getDepositsByStatus = (status) => apiRequest(`/api/admin/deposits/status/${status}`);

/**
 * Get deposit by ID
 * @param {string} depositId - Deposit ID
 */
export const getDepositById = (depositId) => apiRequest(`/api/admin/deposits/${depositId}`);

/**
 * Approve a deposit
 * @param {string} depositId - Deposit ID to approve
 */
export const approveDeposit = (depositId) =>
  apiRequest(`/api/admin/deposits/${depositId}/approve`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

/**
 * Reject a deposit
 * @param {string} depositId - Deposit ID to reject
 * @param {string} reason - Rejection reason
 */
export const rejectDeposit = (depositId, reason) =>
  apiRequest(`/api/admin/deposits/${depositId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

/**
 * Get deposit statistics
 */
export const getDepositStats = () => apiRequest('/api/admin/deposits/stats');

/**
 * Get deposits for a specific account
 * @param {string} accountId - Account ID
 */
export const getDepositsForAccount = (accountId) =>
  apiRequest(`/api/admin/deposits/account/${accountId}`);

// ============================================
// WITHDRAWAL MANAGEMENT (ADMIN or STAFF)
// ============================================

/**
 * Get all pending withdrawals
 */
export const getPendingWithdrawals = () => apiRequest('/api/admin/withdrawals/pending');

/**
 * Get withdrawals by status
 * @param {string} status - Status: PENDING, APPROVED, REJECTED, COMPLETED
 */
export const getWithdrawalsByStatus = (status) =>
  apiRequest(`/api/admin/withdrawals/status/${status}`);

/**
 * Get withdrawal by ID
 * @param {string} withdrawId - Withdrawal ID
 */
export const getWithdrawalById = (withdrawId) =>
  apiRequest(`/api/admin/withdrawals/${withdrawId}`);

/**
 * Complete a withdrawal
 * @param {string} withdrawId - Withdrawal ID to complete
 * @param {string} transactionRef - Bank transaction reference
 */
export const completeWithdrawal = (withdrawId, transactionRef) =>
  apiRequest(`/api/admin/withdrawals/${withdrawId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ transactionRef }),
  });

/**
 * Reject a withdrawal
 * @param {string} withdrawId - Withdrawal ID to reject
 * @param {string} reason - Rejection reason
 */
export const rejectWithdrawal = (withdrawId, reason) =>
  apiRequest(`/api/admin/withdrawals/${withdrawId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

/**
 * Get withdrawal statistics
 */
export const getWithdrawalStats = () => apiRequest('/api/admin/withdrawals/stats');

/**
 * Get withdrawals for a specific account
 * @param {string} accountId - Account ID
 */
export const getWithdrawalsForAccount = (accountId) =>
  apiRequest(`/api/admin/withdrawals/account/${accountId}`);

// ============================================
// BANK MANAGEMENT (ADMIN only)
// ============================================

/**
 * Get all banks
 */
export const getAllBanks = () => apiRequest('/api/admin/banks');

/**
 * Get bank by ID
 * @param {string} bankId - Bank ID
 */
export const getBankById = (bankId) => apiRequest(`/api/admin/banks/${bankId}`);

/**
 * Create a new bank
 * @param {Object} bankData - Bank details
 * @param {string} bankData.bankName - Bank name
 * @param {string} bankData.accountNumber - Account number
 * @param {string} bankData.accountName - Account holder name
 * @param {string} bankData.bsb - BSB code
 */
export const createBank = (bankData) =>
  apiRequest('/api/admin/banks', {
    method: 'POST',
    body: JSON.stringify(bankData),
  });

/**
 * Update bank status
 * @param {string} bankId - Bank ID
 * @param {string} status - New status: ACTIVE, INACTIVE
 */
export const updateBankStatus = (bankId, status) =>
  apiRequest(`/api/admin/banks/${bankId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });

/**
 * Get banks by status
 * @param {string} status - Status: ACTIVE, INACTIVE
 */
export const getBanksByStatus = (status) => apiRequest(`/api/admin/banks/status/${status}`);

/**
 * Get bank statistics
 */
export const getBankStats = () => apiRequest('/api/admin/banks/stats');

// ============================================
// WALLET MANAGEMENT (ADMIN only)
// ============================================

/**
 * Get wallet for account
 * @param {string} accountId - Account ID
 */
export const getWallet = (accountId) => apiRequest(`/api/admin/wallets/${accountId}`);

/**
 * Create wallet for account
 * @param {string} accountId - Account ID
 */
export const createWallet = (accountId) =>
  apiRequest(`/api/admin/wallets/${accountId}`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

/**
 * Update wallet balance
 * @param {string} accountId - Account ID
 * @param {number} amount - Amount to adjust
 * @param {string} type - CREDIT or DEBIT
 * @param {string} reason - Reason for adjustment
 */
export const updateWalletBalance = (accountId, amount, type, reason) =>
  apiRequest(`/api/admin/wallets/${accountId}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ amount, type, reason }),
  });

// ============================================
// COMMISSION & REFERRAL MANAGEMENT (ADMIN only)
// ============================================

/**
 * Create a referral
 * @param {string} principalAccountId - Principal (referrer) account ID
 * @param {string} referredAccountId - Referred account ID
 * @param {number} commissionRate - Commission rate (e.g., 0.05 for 5%)
 */
export const createReferral = (principalAccountId, referredAccountId, commissionRate) =>
  apiRequest('/api/admin/commissions/referrals', {
    method: 'POST',
    body: JSON.stringify({ principalAccountId, referredAccountId, commissionRate }),
  });

/**
 * Update referral configuration
 * @param {string} referralId - Referral ID
 * @param {Object} config - Updated configuration
 */
export const updateReferral = (referralId, config) =>
  apiRequest(`/api/admin/commissions/referrals/${referralId}`, {
    method: 'PUT',
    body: JSON.stringify(config),
  });

/**
 * Get referrals by principal account
 * @param {string} accountId - Principal account ID
 */
export const getReferralsByPrincipal = (accountId) =>
  apiRequest(`/api/admin/commissions/referrals/principal/${accountId}`);

/**
 * Get referral by referred account
 * @param {string} accountId - Referred account ID
 */
export const getReferralByReferred = (accountId) =>
  apiRequest(`/api/admin/commissions/referrals/referred/${accountId}`);

/**
 * Get commission earnings
 * @param {string} principalAccountId - Principal account ID
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter by status: PENDING, CREDITED
 * @param {string} params.type - Filter by type: BET
 */
export const getCommissionEarnings = (principalAccountId, params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const endpoint = `/api/admin/commissions/earnings/${principalAccountId}${queryParams ? `?${queryParams}` : ''}`;
  return apiRequest(endpoint);
};

/**
 * Get pending commission total
 * @param {string} principalAccountId - Principal account ID
 */
export const getPendingCommissionTotal = (principalAccountId) =>
  apiRequest(`/api/admin/commissions/earnings/${principalAccountId}/pending-total`);

/**
 * Credit pending commissions
 * @param {string} principalAccountId - Principal account ID
 */
export const creditPendingCommissions = (principalAccountId) =>
  apiRequest(`/api/admin/commissions/earnings/${principalAccountId}/credit`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

// ============================================
// BET HISTORY (ADMIN only)
// ============================================

/**
 * Get bet history for account
 * @param {string} accountId - Account ID
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Number of records (default: 20)
 * @param {number} params.offset - Offset for pagination (default: 0)
 */
export const getBetHistory = (accountId, params = { limit: 20, offset: 0 }) => {
  const queryParams = new URLSearchParams(params).toString();
  return apiRequest(`/api/admin/commissions/bet-history/${accountId}?${queryParams}`);
};

/**
 * Get bet history count for account
 * @param {string} accountId - Account ID
 */
export const getBetHistoryCount = (accountId) =>
  apiRequest(`/api/admin/commissions/bet-history/${accountId}/count`);

// Export the base request function for custom calls
export { apiRequest, API_BASE_URL };
