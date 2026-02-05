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
// COMMISSION & REFERRAL MANAGEMENT
// Via Admin-Service: /api/admin/commissions (requires JWT)
// Direct: /api/wallets/commissions
// ============================================

/**
 * Create a referral relationship
 * POST /api/wallets/commissions/referrals
 *
 * @param {Object} referralData - Referral configuration
 * @param {string} referralData.principalAccountId - Referrer's account ID
 * @param {string} referralData.referredAccountId - Referred player's account ID
 * @param {string} referralData.referralCode - Optional tracking code
 * @param {number} referralData.depositCommissionRate - Rate for deposit commission (0.0-1.0)
 * @param {number} referralData.depositCommissionMaxCount - Max deposits eligible for commission
 * @param {number} referralData.playCommissionRate - Rate for play/bet commission (0.0-1.0)
 * @param {string} referralData.playCommissionUntil - End date for play commission (null = forever)
 */
export const createReferral = (referralData) =>
  apiRequest('/api/wallets/commissions/referrals', {
    method: 'POST',
    body: JSON.stringify(referralData),
  });

/**
 * Update referral configuration
 * PUT /api/wallets/commissions/referrals/{referralId}
 *
 * @param {string} referralId - Referral ID
 * @param {Object} config - Updated configuration
 * @param {number} config.depositCommissionRate - Rate for deposit commission
 * @param {number} config.depositCommissionMaxCount - Max deposits for commission
 * @param {number} config.playCommissionRate - Rate for play commission
 * @param {string} config.playCommissionUntil - End date for play commission
 * @param {boolean} config.isActive - Whether referral is active
 */
export const updateReferral = (referralId, config) =>
  apiRequest(`/api/wallets/commissions/referrals/${referralId}`, {
    method: 'PUT',
    body: JSON.stringify(config),
  });

/**
 * Get all players referred by this account (referrer's referrals)
 * GET /api/wallets/commissions/referrals/principal/{accountId}
 *
 * @param {string} accountId - Principal (referrer) account ID
 * @returns {Promise<Object>} - Array of Referral objects
 */
export const getReferralsByPrincipal = (accountId) =>
  apiRequest(`/api/wallets/commissions/referrals/principal/${accountId}`);

/**
 * Get who referred this account
 * GET /api/wallets/commissions/referrals/referred/{accountId}
 *
 * @param {string} accountId - Referred account ID
 * @returns {Promise<Object>} - Single Referral object
 */
export const getReferralByReferred = (accountId) =>
  apiRequest(`/api/wallets/commissions/referrals/referred/${accountId}`);

/**
 * Get commission earnings for an account
 * GET /api/wallets/commissions/earnings/{principalAccountId}
 *
 * @param {string} principalAccountId - Principal account ID
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter by status: PENDING, CREDITED, CANCELLED
 * @param {string} params.type - Filter by type: DEPOSIT or PLAY
 * @returns {Promise<Object>} - Array of CommissionEarning objects
 */
export const getCommissionEarnings = (principalAccountId, params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const endpoint = `/api/wallets/commissions/earnings/${principalAccountId}${queryParams ? `?${queryParams}` : ''}`;
  return apiRequest(endpoint);
};

/**
 * Get pending commission total for an account
 * GET /api/wallets/commissions/earnings/{principalAccountId}/pending-total
 *
 * @param {string} principalAccountId - Principal account ID
 * @returns {Promise<Object>} - { pendingTotal: number }
 */
export const getPendingCommissionTotal = (principalAccountId) =>
  apiRequest(`/api/wallets/commissions/earnings/${principalAccountId}/pending-total`);

/**
 * Credit all pending commissions to the principal's wallet
 * POST /api/wallets/commissions/earnings/{principalAccountId}/credit
 *
 * @param {string} principalAccountId - Principal account ID
 * @returns {Promise<Object>} - Transaction object for the credit
 */
export const creditPendingCommissions = (principalAccountId) =>
  apiRequest(`/api/wallets/commissions/earnings/${principalAccountId}/credit`, {
    method: 'POST',
  });

// ============================================
// BET HISTORY
// ============================================

/**
 * Get bet history (game rounds) for account with pagination
 * GET /api/wallets/commissions/bet-history/{accountId}
 *
 * @param {string} accountId - Account ID (e.g., ACC287106027097165824)
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Number of records (default: 20, max: 100)
 * @param {number} params.offset - Pagination offset (default: 0)
 * @returns {Promise<Object>} - Array of GameRound objects
 */
export const getBetHistory = (accountId, params = { limit: 20, offset: 0 }) => {
  const queryParams = new URLSearchParams(params).toString();
  return apiRequest(`/api/wallets/commissions/bet-history/${accountId}?${queryParams}`);
};

/**
 * Get total count of bet history records for account
 * GET /api/wallets/commissions/bet-history/{accountId}/count
 *
 * @param {string} accountId - Account ID
 * @returns {Promise<Object>} - Count number
 */
export const getBetHistoryCount = (accountId) =>
  apiRequest(`/api/wallets/commissions/bet-history/${accountId}/count`);

// ============================================
// CHAT MANAGEMENT
// Base URL: /api/admin/chats
// ============================================

/**
 * Get waiting chats (no agent assigned)
 * GET /api/admin/chats/queue
 *
 * @returns {Promise<Object>} - Array of waiting chat sessions
 */
export const getChatQueue = () => apiRequest('/api/admin/chats/queue');

/**
 * Get chat session details
 * GET /api/admin/chats/sessions/{sessionId}
 *
 * @param {string} sessionId - Chat session ID
 * @returns {Promise<Object>} - Chat session details
 */
export const getChatSession = (sessionId) =>
  apiRequest(`/api/admin/chats/sessions/${sessionId}`);

/**
 * Get chat messages for a session
 * GET /api/admin/chats/sessions/{sessionId}/messages
 *
 * @param {string} sessionId - Chat session ID
 * @returns {Promise<Object>} - Array of chat messages
 */
export const getChatMessages = (sessionId) =>
  apiRequest(`/api/admin/chats/sessions/${sessionId}/messages`);

/**
 * Get all chats for an account
 * GET /api/admin/chats/account/{accountId}
 *
 * @param {string} accountId - Account ID
 * @returns {Promise<Object>} - Array of chat sessions for the account
 */
export const getChatsForAccount = (accountId) =>
  apiRequest(`/api/admin/chats/account/${accountId}`);

/**
 * Assign agent to a chat session
 * POST /api/admin/chats/sessions/{sessionId}/assign?agentId={id}
 *
 * @param {string} sessionId - Chat session ID
 * @param {string} agentId - Agent ID to assign
 * @returns {Promise<Object>} - Updated session
 */
export const assignChatAgent = (sessionId, agentId) =>
  apiRequest(`/api/admin/chats/sessions/${sessionId}/assign?agentId=${agentId}`, {
    method: 'POST',
  });

/**
 * Close a chat session
 * POST /api/admin/chats/sessions/{sessionId}/close
 *
 * @param {string} sessionId - Chat session ID
 * @returns {Promise<Object>} - Closed session
 */
export const closeChatSession = (sessionId) =>
  apiRequest(`/api/admin/chats/sessions/${sessionId}/close`, {
    method: 'POST',
  });

/**
 * Send message to a chat session
 * POST /api/admin/chats/sessions/{sessionId}/messages
 *
 * @param {string} sessionId - Chat session ID
 * @param {Object} messageData - Message content
 * @returns {Promise<Object>} - Sent message
 */
export const sendChatMessage = (sessionId, messageData) =>
  apiRequest(`/api/admin/chats/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify(messageData),
  });

// ============================================
// IP / ACCOUNT DETAILS
// Base URL: /api/admin/accounts
// ============================================

/**
 * Get last IP for an account
 * GET /api/admin/accounts/{accountId}/ip
 *
 * @param {string} accountId - Account ID
 * @returns {Promise<Object>} - IP information
 */
export const getAccountIp = (accountId) =>
  apiRequest(`/api/admin/accounts/${accountId}/ip`);

/**
 * Get full account details (includes lastIp)
 * GET /api/admin/accounts/{accountId}
 *
 * @param {string} accountId - Account ID
 * @returns {Promise<Object>} - Full account details
 */
export const getAccountDetails = (accountId) =>
  apiRequest(`/api/admin/accounts/${accountId}`);

// Export the base request function for custom calls
export { apiRequest, API_BASE_URL };
