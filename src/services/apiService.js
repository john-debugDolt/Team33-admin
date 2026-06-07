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
 * Reset wallet balance to zero. Idempotent. ADMIN role required.
 * Backend doc: POST /api/admin/wallets/{accountId}/clear-balance.
 * No request body; returns the wallet with balance: 0 on success.
 */
export const clearWalletBalance = (accountId) =>
  apiRequest(`/api/admin/wallets/${accountId}/clear-balance`, {
    method: 'POST',
  });

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
  apiRequest(`/api/admin/commissions/referrals/${referralId}`, {
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
 * GET /api/admin/commissions/earnings/{accountId}
 *
 * @param {string} accountId - Account ID
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter by status: PENDING, CREDITED, CANCELLED
 * @param {string} params.type - Filter by type: DEPOSIT or PLAY
 * @returns {Promise<Object>} - Array of CommissionEarning objects
 */
export const getCommissionEarnings = (accountId, params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const endpoint = `/api/admin/commissions/earnings/${accountId}${queryParams ? `?${queryParams}` : ''}`;
  return apiRequest(endpoint);
};

/**
 * Get pending commission total for an account
 * GET /api/admin/commissions/earnings/{accountId}/pending-total
 *
 * @param {string} accountId - Account ID
 * @returns {Promise<Object>} - { pendingTotal: number }
 */
export const getPendingCommissionTotal = (accountId) =>
  apiRequest(`/api/admin/commissions/earnings/${accountId}/pending-total`);

/**
 * Credit all pending commissions to the principal's wallet
 * POST /api/admin/commissions/earnings/{accountId}/credit
 *
 * @param {string} accountId - Account ID to credit commissions for
 * @returns {Promise<Object>} - Transaction object for the credit
 */
export const creditPendingCommissions = (accountId) =>
  apiRequest(`/api/admin/commissions/earnings/${accountId}/credit`, {
    method: 'POST',
  });

/**
 * Get all referrals (admin endpoint)
 * GET /api/admin/commissions/referrals
 *
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter: ACTIVE, INACTIVE
 * @returns {Promise<Object>} - Array of all referral relationships
 */
export const getAllReferrals = (params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const endpoint = `/api/admin/commissions/referrals${queryParams ? `?${queryParams}` : ''}`;
  return apiRequest(endpoint);
};

/**
 * Get all commission earnings (admin endpoint)
 * GET /api/admin/commissions/earnings
 *
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter: PENDING, CREDITED, CANCELLED
 * @param {string} params.type - Filter: DEPOSIT, PLAY
 * @param {number} params.limit - Pagination limit
 * @param {number} params.offset - Pagination offset
 * @returns {Promise<Object>} - Array of all commission earnings
 */
export const getAllCommissionEarnings = (params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const endpoint = `/api/admin/commissions/earnings${queryParams ? `?${queryParams}` : ''}`;
  return apiRequest(endpoint);
};

/**
 * Get commission statistics (admin endpoint)
 * GET /api/admin/commissions/stats
 *
 * @returns {Promise<Object>} - Commission statistics
 */
export const getCommissionStats = () => apiRequest('/api/admin/commissions/stats');

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
// BET HISTORY V2 — admin-service /api/admin/bet-history/*
// Per-bet seamless-wallet ledger across all 9 providers
// ============================================

const buildQuery = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
};

/**
 * GET /api/admin/bet-history/providers
 * Returns the canonical list of seamless providers with bet history.
 */
export const getBetHistoryProviders = () =>
  apiRequest('/api/admin/bet-history/providers');

/**
 * GET /api/admin/bet-history/{provider}
 * Paginated list of callback rows for one provider, newest first.
 *
 * @param {string} provider - One of richgaming, uuslot, megah5, epicwin, wfgaming, metagaming, advantplay, evo888h5, clotplay
 * @param {string} accountId - Required
 * @param {Object} params - { callbackType, status, limit, offset }
 */
export const getBetHistoryByProvider = (provider, accountId, params = {}) =>
  apiRequest(`/api/admin/bet-history/${provider}${buildQuery({ accountId, ...params })}`);

/**
 * GET /api/admin/bet-history/{provider}/count
 * Total row count for one provider (uses same filters as the list).
 */
export const getBetHistoryByProviderCount = (provider, accountId, params = {}) =>
  apiRequest(`/api/admin/bet-history/${provider}/count${buildQuery({ accountId, ...params })}`);

/**
 * GET /api/admin/bet-history/summary/{accountId}
 * Cross-provider snapshot: last-N rows from every provider plus per-provider totals.
 */
export const getBetHistorySummary = (accountId, params = {}) =>
  apiRequest(`/api/admin/bet-history/summary/${accountId}${buildQuery(params)}`);

/**
 * GET /api/admin/transfer-history/providers
 * Returns the list of provider keys the saga ledger supports
 * (acewin, allbet, awc, bigpot, dragonsoft, evo888h5-bonus, funta, ibc,
 *  jdb, joker, lucky365, m9, pegasus, pussy888, rich88, scr888h5,
 *  spadegaming, vpower, win568, win8 — 20 in total).
 */
export const getTransferHistoryProviders = () =>
  apiRequest('/api/admin/transfer-history/providers');

/**
 * GET /api/admin/transfer-history/{provider}
 * Saga session rows for one transfer-wallet provider (DEPOSIT / WITHDRAW,
 * with status PENDING / CONFIRMED / RECONCILING / FAILED).
 *
 * @param {string} provider - one of the 20 keys returned by getTransferHistoryProviders
 * @param {string} accountId - Required
 * @param {Object} params - { direction: 'DEPOSIT'|'WITHDRAW', status, limit, offset }
 */
export const getTransferHistoryByProvider = (provider, accountId, params = {}) =>
  apiRequest(`/api/admin/transfer-history/${provider}${buildQuery({ accountId, ...params })}`);

/**
 * GET /api/admin/transfer-history/{provider}/count
 * Same filter params as the list endpoint.
 */
export const getTransferHistoryByProviderCount = (provider, accountId, params = {}) =>
  apiRequest(`/api/admin/transfer-history/${provider}/count${buildQuery({ accountId, ...params })}`);

/**
 * GET /api/admin/transfer-history/summary/{accountId}
 * Cross-provider transfer-wallet snapshot across all 20 providers — returns
 * `{ accountId, <provider>: { total, rows }, ..., grandTotal }`.
 * Query: limit (1–100, default 10), direction, status apply uniformly.
 */
export const getTransferHistorySummary = (accountId, params = {}) =>
  apiRequest(`/api/admin/transfer-history/summary/${accountId}${buildQuery(params)}`);

/**
 * GET /api/admin/bonus-ledger/{accountId}
 * Single bonus_wallet ledger per player — credits (grant / provider withdraw)
 * and debits (revoke / provider deposit / clear) in newest-first order.
 *
 * Row shape: { id, accountId, type, amount, balanceAfter, referenceId,
 *              provider, description, createdAt }
 * Type values: CREDIT_GRANT, CREDIT_REFUND, CREDIT_PROVIDER_WITHDRAW,
 *              DEBIT_REVOKE, DEBIT_PROVIDER_DEPOSIT, DEBIT_CLEAR_BALANCE.
 */
export const getBonusLedger = (accountId) =>
  apiRequest(`/api/admin/bonus-ledger/${accountId}`);

// ============================================
// DAILY CHECK-IN BONUS — campaign management
// Base URL: /api/admin/checkin-bonus
// Auth: ADMIN realm role
// ============================================

/**
 * GET /api/admin/checkin-bonus
 * Lists every campaign (active + soft-disabled), newest first.
 */
export const getCheckinBonusCampaigns = () =>
  apiRequest('/api/admin/checkin-bonus');

/**
 * GET /api/admin/checkin-bonus/active
 * Returns the currently active campaign — 404 if none.
 */
export const getActiveCheckinBonusCampaign = () =>
  apiRequest('/api/admin/checkin-bonus/active');

/**
 * POST /api/admin/checkin-bonus
 * Creates a campaign. Body:
 *   { displayName, description?, dailyAmount (>=0.01), days (1..365), active? }
 * Returns 201 with the persisted campaign.
 *
 * Only one active campaign should exist at a time — toggle the previous one
 * off via PATCH .../active first (the DB doesn't enforce this).
 */
export const createCheckinBonusCampaign = (body) =>
  apiRequest('/api/admin/checkin-bonus', {
    method: 'POST',
    body: JSON.stringify(body),
  });

/**
 * PATCH /api/admin/checkin-bonus/{id}/active
 * Toggles a campaign on/off. Body: { active: true|false }.
 */
export const setCheckinBonusCampaignActive = (id, active) =>
  apiRequest(`/api/admin/checkin-bonus/${id}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });

// ============================================
// HOT CHATS — reusable quick-reply messages
// Base URL: /api/admin/hot-chats
// Auth: ADMIN or STAFF role
// ============================================

/** GET /api/admin/hot-chats — full list incl. disabled (for management UI) */
export const getAllHotChats = () => apiRequest('/api/admin/hot-chats');

/** GET /api/admin/hot-chats/active — active only (for the picker) */
export const getActiveHotChats = () => apiRequest('/api/admin/hot-chats/active');

/** GET /api/admin/hot-chats/category/{category} — active filtered by category */
export const getHotChatsByCategory = (category) =>
  apiRequest(`/api/admin/hot-chats/category/${encodeURIComponent(category)}`);

/** GET /api/admin/hot-chats/{id} — fetch one */
export const getHotChat = (id) => apiRequest(`/api/admin/hot-chats/${id}`);

/**
 * POST /api/admin/hot-chats — create a hot chat
 * @param {{ title: string, content: string, category?: string, sortOrder?: number, active?: boolean }} body
 */
export const createHotChat = (body) =>
  apiRequest('/api/admin/hot-chats', { method: 'POST', body: JSON.stringify(body) });

/** PUT /api/admin/hot-chats/{id} — full update */
export const updateHotChat = (id, body) =>
  apiRequest(`/api/admin/hot-chats/${id}`, { method: 'PUT', body: JSON.stringify(body) });

/** PATCH /api/admin/hot-chats/{id}/active — toggle visibility */
export const setHotChatActive = (id, active) =>
  apiRequest(`/api/admin/hot-chats/${id}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });

/** DELETE /api/admin/hot-chats/{id} — hard delete */
export const deleteHotChat = (id) =>
  apiRequest(`/api/admin/hot-chats/${id}`, { method: 'DELETE' });

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

// ============================================
// COMMISSION RATES MANAGEMENT
// Base URL: /api/admin/commission-rates
// ============================================

/**
 * Get all commission rates
 * GET /api/admin/commission-rates
 *
 * @returns {Promise<Object>} - Array of commission rate objects
 */
export const getAllCommissionRates = () =>
  apiRequest('/api/admin/commission-rates');

/**
 * Get commission rate by ID
 * GET /api/admin/commission-rates/{id}
 *
 * @param {number} id - Commission rate ID
 * @returns {Promise<Object>} - Commission rate object
 */
export const getCommissionRateById = (id) =>
  apiRequest(`/api/admin/commission-rates/${id}`);

/**
 * Update commission rate by ID
 * PUT /api/admin/commission-rates/{id}
 *
 * @param {number} id - Commission rate ID
 * @param {Object} data - Updated rate data (rate, minAmount, maxAmount, description, etc.)
 * @returns {Promise<Object>} - Updated commission rate object
 */
export const updateCommissionRate = (id, data) =>
  apiRequest(`/api/admin/commission-rates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

/**
 * Update commission rate by type
 * PUT /api/admin/commission-rates/type/{type}
 *
 * @param {string} type - Rate type (DEPOSIT, WITHDRAWAL, REFERRAL, GAME_WIN)
 * @param {Object} data - Updated rate data
 * @returns {Promise<Object>} - Updated commission rate object
 */
export const updateCommissionRateByType = (type, data) =>
  apiRequest(`/api/admin/commission-rates/type/${type}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

/**
 * Toggle commission rate active status
 * POST /api/admin/commission-rates/type/{type}/toggle
 *
 * @param {string} type - Rate type (DEPOSIT, WITHDRAWAL, REFERRAL, GAME_WIN)
 * @returns {Promise<Object>} - Updated commission rate object
 */
export const toggleCommissionRateStatus = (type) =>
  apiRequest(`/api/admin/commission-rates/type/${type}/toggle`, {
    method: 'POST',
  });

// Export the base request function for custom calls
export { apiRequest, API_BASE_URL };
