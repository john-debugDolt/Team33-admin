/**
 * Admin Transaction Service
 * Manages transactions across all users for admin panel
 * Backend endpoints are now public (no auth required)
 */

// API base - call api.team33.mx (admin service with JWT auth)
const API_BASE = 'https://api.team33.mx';

// LocalStorage keys for withdrawals (no API yet)
const PENDING_TRANSACTIONS_KEY = 'admin_pending_transactions';
const ALL_TRANSACTIONS_KEY = 'admin_all_transactions';
const USER_CACHE_KEY = 'admin_user_cache';

/**
 * Get headers (no auth required)
 */
const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

/**
 * Get user info cache from localStorage
 */
const getUserCache = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
};

/**
 * Save user info to cache
 */
const saveToUserCache = (accountId, userInfo) => {
  const cache = getUserCache();
  cache[accountId] = {
    ...userInfo,
    cachedAt: Date.now()
  };
  localStorage.setItem(USER_CACHE_KEY, JSON.stringify(cache));
};

/**
 * Look up user info by accountId
 */
const lookupUserInfo = async (accountId) => {
  // Check cache first (valid for 5 minutes)
  const cache = getUserCache();
  const cached = cache[accountId];
  if (cached && (Date.now() - cached.cachedAt) < 300000) {
    return cached;
  }

  // Check local accounts
  const localAccounts = JSON.parse(localStorage.getItem('local_accounts') || '[]');
  const localAccount = localAccounts.find(acc => acc.accountId === accountId);
  if (localAccount) {
    const userInfo = {
      username: localAccount.firstName ? `${localAccount.firstName} ${localAccount.lastName}` : accountId,
      phone: localAccount.phoneNumber || ''
    };
    saveToUserCache(accountId, userInfo);
    return userInfo;
  }

  // Try API lookup
  try {
    const headers = getHeaders();
    const response = await fetch(`${API_BASE}/api/accounts/${accountId}`, { headers });
    if (response.ok) {
      const account = await response.json();
      const userInfo = {
        username: account.firstName ? `${account.firstName} ${account.lastName}` : account.phoneNumber || accountId,
        phone: account.phoneNumber || ''
      };
      saveToUserCache(accountId, userInfo);
      return userInfo;
    }
  } catch (error) {
    console.log('Could not lookup user info for:', accountId);
  }

  return { username: accountId, phone: '' };
};

/**
 * Save pending transactions to localStorage
 */
const savePendingTransactions = (transactions) => {
  try {
    localStorage.setItem(PENDING_TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error('Error saving pending transactions:', error);
  }
};

/**
 * Get all transactions history from localStorage
 */
const getAllTransactionsHistory = () => {
  try {
    const stored = localStorage.getItem(ALL_TRANSACTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading all transactions:', error);
    return [];
  }
};

/**
 * Save all transactions history to localStorage
 */
const saveAllTransactionsHistory = (transactions) => {
  try {
    localStorage.setItem(ALL_TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error('Error saving all transactions:', error);
  }
};

/**
 * Admin Transaction Service
 */
export const transactionService = {
  /**
   * Get all transactions (deposits and withdrawals from API)
   */
  async getAllTransactions(filters = {}) {
    let allTransactions = [];
    let apiDeposits = [];
    let apiWithdrawals = [];

    try {
      const headers = getHeaders();

      // Fetch deposits from API based on status filter
      if (filters.status === 'APPROVED' || filters.status === 'COMPLETED') {
        const response = await fetch(`${API_BASE}/api/admin/deposits/status/COMPLETED`, { headers });
        if (response.ok) apiDeposits = await response.json();
      } else if (filters.status === 'REJECTED') {
        const response = await fetch(`${API_BASE}/api/admin/deposits/status/REJECTED`, { headers });
        if (response.ok) apiDeposits = await response.json();
      } else if (filters.status === 'ALL' || !filters.status) {
        const [pending, completed, rejected] = await Promise.all([
          fetch(`${API_BASE}/api/admin/deposits/pending`, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${API_BASE}/api/admin/deposits/status/COMPLETED`, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${API_BASE}/api/admin/deposits/status/REJECTED`, { headers }).then(r => r.ok ? r.json() : []).catch(() => [])
        ]);
        apiDeposits = [...pending, ...completed, ...rejected];
      } else {
        const response = await fetch(`${API_BASE}/api/admin/deposits/pending`, { headers });
        if (response.ok) apiDeposits = await response.json();
      }

      // Transform API deposits
      const deposits = await Promise.all(apiDeposits.map(async (d) => {
        const userInfo = await lookupUserInfo(d.accountId);
        return {
          id: d.depositId,
          accountId: d.accountId,
          username: userInfo.username,
          phone: userInfo.phone,
          type: 'DEPOSIT',
          amount: d.amount,
          status: d.status === 'PENDING_REVIEW' ? 'PENDING' : d.status,
          originalStatus: d.status,
          createdAt: d.createdAt,
          completedAt: d.completedAt,
          walletId: d.walletId,
          currency: d.currency || 'AUD'
        };
      }));

      allTransactions = [...deposits];

    } catch (error) {
      console.error('Error fetching deposits from API:', error);
    }

    // Fetch withdrawals from API
    try {
      const headers = getHeaders();

      if (filters.status === 'APPROVED' || filters.status === 'COMPLETED') {
        const response = await fetch(`${API_BASE}/api/admin/withdrawals/status/COMPLETED`, { headers });
        if (response.ok) apiWithdrawals = await response.json();
      } else if (filters.status === 'REJECTED') {
        const response = await fetch(`${API_BASE}/api/admin/withdrawals/status/REJECTED`, { headers });
        if (response.ok) apiWithdrawals = await response.json();
      } else if (filters.status === 'ALL' || !filters.status) {
        const [pending, completed, rejected] = await Promise.all([
          fetch(`${API_BASE}/api/admin/withdrawals/pending`, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${API_BASE}/api/admin/withdrawals/status/COMPLETED`, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${API_BASE}/api/admin/withdrawals/status/REJECTED`, { headers }).then(r => r.ok ? r.json() : []).catch(() => [])
        ]);
        apiWithdrawals = [...pending, ...completed, ...rejected];
      } else {
        const response = await fetch(`${API_BASE}/api/admin/withdrawals/pending`, { headers });
        if (response.ok) apiWithdrawals = await response.json();
      }

      // Transform API withdrawals
      const withdrawals = await Promise.all(apiWithdrawals.map(async (w) => {
        const userInfo = await lookupUserInfo(w.accountId);
        const rawId = w.withdrawId || w.withdrawalId || w.requestId || w.id;
        const withdrawId = rawId && !String(rawId).startsWith('WD') && !String(rawId).startsWith('WTH')
          ? `WD${rawId}`
          : String(rawId);
        return {
          id: withdrawId,
          originalId: rawId,
          accountId: w.accountId,
          username: userInfo.username,
          phone: userInfo.phone,
          type: 'WITHDRAWAL',
          amount: w.amount,
          status: w.status === 'PENDING_REVIEW' ? 'PENDING' : w.status,
          originalStatus: w.status,
          createdAt: w.createdAt,
          completedAt: w.completedAt,
          bank: w.bankName || 'Bank Transfer',
          bankAccount: w.accountNumber,
          bsb: w.bsb,
          payId: w.payId,
          accountHolderName: w.accountHolderName,
          currency: w.currency || 'AUD'
        };
      }));

      allTransactions = [...allTransactions, ...withdrawals];

    } catch (error) {
      console.error('Error fetching withdrawals from API:', error);
    }

    // Apply additional filters
    if (filters.type && filters.type !== 'ALL') {
      allTransactions = allTransactions.filter(tx =>
        tx.type.toUpperCase() === filters.type.toUpperCase()
      );
    }

    if (filters.customer) {
      const search = filters.customer.toLowerCase();
      allTransactions = allTransactions.filter(tx =>
        tx.accountId?.toLowerCase().includes(search) ||
        tx.username?.toLowerCase().includes(search) ||
        tx.phone?.toLowerCase().includes(search)
      );
    }

    if (filters.id) {
      const search = filters.id.toLowerCase();
      allTransactions = allTransactions.filter(tx =>
        tx.id.toLowerCase().includes(search)
      );
    }

    if (filters.dateStart) {
      const startDate = new Date(filters.dateStart);
      allTransactions = allTransactions.filter(tx =>
        new Date(tx.createdAt) >= startDate
      );
    }

    if (filters.dateEnd) {
      const endDate = new Date(filters.dateEnd);
      endDate.setHours(23, 59, 59, 999);
      allTransactions = allTransactions.filter(tx =>
        new Date(tx.createdAt) <= endDate
      );
    }

    // Sort by date (newest first)
    allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Calculate stats
    const stats = {
      total: allTransactions.length,
      pendingCount: allTransactions.filter(tx => tx.status === 'PENDING' || tx.status === 'PENDING_REVIEW').length,
      approvedCount: allTransactions.filter(tx => tx.status === 'APPROVED' || tx.status === 'COMPLETED').length,
      rejectedCount: allTransactions.filter(tx => tx.status === 'REJECTED').length,
      totalAmount: allTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0),
      pendingAmount: allTransactions
        .filter(tx => tx.status === 'PENDING' || tx.status === 'PENDING_REVIEW')
        .reduce((sum, tx) => sum + (tx.amount || 0), 0)
    };

    return {
      success: true,
      transactions: allTransactions,
      stats
    };
  },

  /**
   * Get deposit statistics from API
   */
  async getStats() {
    try {
      const headers = getHeaders();
      const response = await fetch(`${API_BASE}/api/admin/deposits/stats`, { headers });

      if (response.ok) {
        const stats = await response.json();
        return {
          success: true,
          stats: {
            pending: stats.pending || 0,
            pendingReview: stats.pendingReview || 0,
            approved: stats.approved || 0,
            rejected: stats.rejected || 0,
            completed: stats.completed || 0
          }
        };
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }

    return { success: false, error: 'Failed to fetch stats' };
  },

  /**
   * Approve a transaction (deposit or withdrawal)
   */
  async approveTransaction(transactionId, adminNotes = '', txInfo = null) {
    const headers = getHeaders();

    // Check if it's a deposit (starts with DEP)
    if (transactionId.startsWith('DEP')) {
      try {
        const response = await fetch(`${API_BASE}/api/admin/deposits/${transactionId}/approve`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            adminId: 'admin1',
            adminNotes: adminNotes || 'Approved via admin panel'
          })
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            depositId: transactionId,
            status: data.status,
            message: data.message || 'Deposit approved and credited to wallet'
          };
        } else {
          const errorText = await response.text();
          let errorMessage = `Error ${response.status}: `;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage += errorJson.message || errorJson.error || JSON.stringify(errorJson);
          } catch {
            errorMessage += errorText || 'Failed to approve deposit';
          }
          return { success: false, error: errorMessage };
        }
      } catch (error) {
        return { success: false, error: `Network error: ${error.message}` };
      }
    }

    // Check if it's a withdrawal
    if (transactionId.startsWith('WD') || transactionId.startsWith('WTH')) {
      try {
        let apiId = txInfo?.originalId || transactionId;
        if (apiId.startsWith('WD') && !txInfo?.originalId) {
          apiId = transactionId.replace(/^WD/, '');
        }

        const response = await fetch(`${API_BASE}/api/admin/withdrawals/${apiId}/approve`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            adminId: 'admin1',
            adminNotes: adminNotes || 'Approved via admin panel'
          })
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            withdrawId: transactionId,
            status: data.status,
            message: data.message || 'Withdrawal approved and processed'
          };
        } else {
          const errorText = await response.text();
          let errorMessage = `Error ${response.status}: `;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage += errorJson.message || errorJson.error || JSON.stringify(errorJson);
          } catch {
            errorMessage += errorText || 'Failed to approve withdrawal';
          }
          return { success: false, error: errorMessage };
        }
      } catch (error) {
        return { success: false, error: `Network error: ${error.message}` };
      }
    }

    return { success: false, error: 'Unknown transaction type' };
  },

  /**
   * Reject a transaction (deposit or withdrawal)
   */
  async rejectTransaction(transactionId, reason = '', originalId = null) {
    const headers = getHeaders();

    // Check if it's a deposit
    if (transactionId.startsWith('DEP')) {
      try {
        const response = await fetch(`${API_BASE}/api/admin/deposits/${transactionId}/reject`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            adminId: 'admin1',
            adminNotes: reason || 'Rejected via admin panel'
          })
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            depositId: transactionId,
            status: data.status,
            message: data.message || 'Deposit rejected'
          };
        } else {
          const error = await response.json().catch(() => ({}));
          return { success: false, error: error.message || 'Failed to reject deposit' };
        }
      } catch (error) {
        return { success: false, error: 'Network error while rejecting deposit' };
      }
    }

    // Check if it's a withdrawal
    if (transactionId.startsWith('WD') || transactionId.startsWith('WTH')) {
      try {
        let apiId = originalId || transactionId;
        if (apiId.startsWith('WD') && !originalId) {
          apiId = transactionId.replace(/^WD/, '');
        }
        const response = await fetch(`${API_BASE}/api/admin/withdrawals/${apiId}/reject`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            adminId: 'admin1',
            adminNotes: reason || 'Rejected via admin panel'
          })
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            withdrawId: transactionId,
            status: data.status,
            message: data.message || 'Withdrawal rejected'
          };
        } else {
          const error = await response.json().catch(() => ({}));
          return { success: false, error: error.message || 'Failed to reject withdrawal' };
        }
      } catch (error) {
        return { success: false, error: 'Network error while rejecting withdrawal' };
      }
    }

    return { success: false, error: 'Unknown transaction type' };
  },

  /**
   * Get a single deposit by ID
   */
  async getDeposit(depositId) {
    try {
      const headers = getHeaders();
      const response = await fetch(`${API_BASE}/api/admin/deposits/${depositId}`, { headers });

      if (response.ok) {
        const deposit = await response.json();
        return {
          success: true,
          deposit: {
            id: deposit.depositId,
            accountId: deposit.accountId,
            amount: deposit.amount,
            status: deposit.status,
            createdAt: deposit.createdAt,
            completedAt: deposit.completedAt,
            walletId: deposit.walletId
          }
        };
      }
    } catch (error) {
      console.error('Error fetching deposit:', error);
    }

    return { success: false, error: 'Deposit not found' };
  },

  /**
   * Get deposits by account ID
   */
  async getDepositsByAccount(accountId) {
    try {
      const headers = getHeaders();
      const response = await fetch(`${API_BASE}/api/admin/deposits/account/${accountId}`, { headers });

      if (response.ok) {
        const deposits = await response.json();
        return {
          success: true,
          deposits: deposits.map(d => ({
            id: d.depositId,
            accountId: d.accountId,
            amount: d.amount,
            status: d.status,
            createdAt: d.createdAt
          }))
        };
      }
    } catch (error) {
      console.error('Error fetching deposits by account:', error);
    }

    return { success: false, error: 'Failed to fetch deposits' };
  }
};

export default transactionService;
