/**
 * Bonus Service for Admin Panel
 * Handles all bonus-related API calls to the admin service
 */

import adminApiService from './adminApiService';

// Bonus types enum - matches backend BonusType enum
export const BONUS_TYPES = {
  FIRST_DEPOSIT: 'FIRST_DEPOSIT',
  RELOAD: 'RELOAD',
  REFERRAL: 'REFERRAL',
  CASHBACK: 'CASHBACK',
  FREE_SPIN: 'FREE_SPIN',
  LOYALTY: 'LOYALTY',
  PROMOTIONAL: 'PROMOTIONAL',
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED'
};

// Claim status enum - matches backend ClaimStatus enum
// Based on official docs: CLAIMED → ACTIVE → COMPLETING → COMPLETED
// Also: EXPIRED, FORFEITED, PAID, CANCELLED
export const CLAIM_STATUS = {
  PENDING: 'PENDING',
  CLAIMED: 'CLAIMED',
  ACTIVE: 'ACTIVE',
  CREDITED: 'CREDITED',
  COMPLETING: 'COMPLETING',
  COMPLETED: 'COMPLETED',
  EXPIRED: 'EXPIRED',
  FORFEITED: 'FORFEITED',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED'
};

// Human-readable labels for bonus types
export const BONUS_TYPE_LABELS = {
  FIRST_DEPOSIT: 'First Deposit',
  RELOAD: 'Reload Bonus',
  REFERRAL: 'Referral Bonus',
  CASHBACK: 'Cashback',
  FREE_SPIN: 'Free Spins',
  LOYALTY: 'Loyalty/VIP',
  PROMOTIONAL: 'Promotional',
  PERCENTAGE: 'Percentage',
  FIXED: 'Fixed Amount'
};

// Human-readable labels for claim status
export const CLAIM_STATUS_LABELS = {
  PENDING: 'Pending',
  CLAIMED: 'Claimed',
  ACTIVE: 'Active',
  CREDITED: 'Credited',
  COMPLETING: 'Completing',
  COMPLETED: 'Completed',
  EXPIRED: 'Expired',
  FORFEITED: 'Forfeited',
  PAID: 'Paid',
  CANCELLED: 'Cancelled'
};

class BonusService {
  /**
   * Get all bonuses
   * GET /api/admin/bonuses
   */
  async getAllBonuses() {
    return adminApiService.get('/bonuses');
  }

  /**
   * Get bonus by ID
   * GET /api/admin/bonuses/{bonusId}
   */
  async getBonusById(bonusId) {
    return adminApiService.get(`/bonuses/${bonusId}`);
  }

  /**
   * Get bonus by code
   * GET /api/admin/bonuses/code/{bonusCode}
   */
  async getBonusByCode(bonusCode) {
    return adminApiService.get(`/bonuses/code/${bonusCode}`);
  }

  /**
   * Filter bonuses
   * GET /api/admin/bonuses/filter?isActive=true&bonusType=FIRST_DEPOSIT
   */
  async filterBonuses(filters = {}) {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) {
      params.append('isActive', filters.isActive);
    }
    if (filters.bonusType) {
      params.append('bonusType', filters.bonusType);
    }
    const query = params.toString();
    return adminApiService.get(`/bonuses/filter${query ? `?${query}` : ''}`);
  }

  /**
   * Create a new bonus
   * POST /api/admin/bonuses
   * Based on official docs: CreateBonusRequest includes bonusPercentage, fixedAmount, etc.
   */
  async createBonus(bonusData) {
    // The UI treats PERCENTAGE as a % rate and every other type as a fixed
    // amount (see Rebate.jsx form label). Mirror that here so non-PERCENTAGE
    // bonuses still carry their value — otherwise the backend receives null.
    const value = bonusData.bonusValue != null ? Number(bonusData.bonusValue) : undefined;
    const isPercentage = bonusData.bonusType === 'PERCENTAGE';
    const payload = {
      bonusCode: bonusData.bonusCode,
      name: bonusData.name || bonusData.displayName,
      description: bonusData.description,
      bonusType: bonusData.bonusType,
      bonusValue: value,
      bonusPercentage: isPercentage ? value : undefined,
      fixedAmount: !isPercentage ? value : undefined,
      maxBonusAmount: bonusData.maxBonusAmount,
      minDeposit: bonusData.minDeposit,
      turnoverMultiplier: bonusData.turnoverMultiplier,
      maxUsageCount: bonusData.maxClaims,
      isActive: bonusData.isActive !== false,
      requiresCode: bonusData.requiresCode || false,
      startDate: bonusData.startDate,
      endDate: bonusData.endDate
    };

    // Remove undefined values
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) delete payload[key];
    });

    return adminApiService.post('/bonuses', payload);
  }

  /**
   * Update an existing bonus
   * PUT /api/admin/bonuses/{bonusId}
   */
  async updateBonus(bonusId, bonusData) {
    const value = bonusData.bonusValue != null ? Number(bonusData.bonusValue) : undefined;
    const isPercentage = bonusData.bonusType === 'PERCENTAGE';
    const payload = {
      bonusCode: bonusData.bonusCode,
      name: bonusData.name || bonusData.displayName,
      description: bonusData.description,
      bonusType: bonusData.bonusType,
      bonusValue: value,
      bonusPercentage: isPercentage ? value : undefined,
      fixedAmount: !isPercentage ? value : undefined,
      maxBonusAmount: bonusData.maxBonusAmount,
      minDeposit: bonusData.minDeposit,
      turnoverMultiplier: bonusData.turnoverMultiplier,
      maxUsageCount: bonusData.maxClaims,
      isActive: bonusData.isActive,
      requiresCode: bonusData.requiresCode,
      startDate: bonusData.startDate,
      endDate: bonusData.endDate
    };

    // Remove undefined values
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) delete payload[key];
    });

    return adminApiService.put(`/bonuses/${bonusId}`, payload);
  }

  /**
   * Activate a bonus
   * POST /api/admin/bonuses/{bonusId}/activate
   */
  async activateBonus(bonusId) {
    return adminApiService.post(`/bonuses/${bonusId}/activate`, {});
  }

  /**
   * Deactivate a bonus
   * POST /api/admin/bonuses/{bonusId}/deactivate
   */
  async deactivateBonus(bonusId) {
    return adminApiService.post(`/bonuses/${bonusId}/deactivate`, {});
  }

  /**
   * Delete (soft delete) a bonus
   * DELETE /api/admin/bonuses/{bonusId}
   */
  async deleteBonus(bonusId) {
    return adminApiService.delete(`/bonuses/${bonusId}`);
  }

  /**
   * Get claims for a specific bonus
   * GET /api/admin/bonuses/{bonusId}/claims
   */
  async getClaimsByBonus(bonusId) {
    return adminApiService.get(`/bonuses/${bonusId}/claims`);
  }

  /**
   * Get claims for a specific account
   * GET /api/admin/bonuses/claims/account/{accountId}
   */
  async getClaimsByAccount(accountId) {
    return adminApiService.get(`/bonuses/claims/account/${accountId}`);
  }

  /**
   * Credit bonus directly to a user's wallet
   * POST /api/admin/bonuses/credit-direct
   *
   * Per official docs:
   * - Creates a SYSTEM_DIRECT_CREDIT placeholder bonus if not exists
   * - Credits bonus_balance in wallet
   * - Creates BonusClaim record for audit
   * - turnoverRequired = bonusAmount × turnoverMultiplier
   */
  async creditDirectBonus(creditData) {
    const payload = {
      accountId: creditData.accountId,
      bonusAmount: Number(creditData.bonusAmount),
      // Default 1x turnover per docs, 0 means no wagering requirement
      turnoverMultiplier: creditData.turnoverMultiplier !== undefined
        ? Number(creditData.turnoverMultiplier)
        : 1,
      reason: creditData.reason,
      // Auto-generate reference if not provided
      reference: creditData.reference || `DC-${Date.now()}`
    };

    return adminApiService.post('/bonuses/credit-direct', payload);
  }

  /**
   * Generate a unique bonus code
   */
  generateBonusCode(prefix = 'BONUS') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Format bonus for display
   */
  formatBonusForDisplay(bonus) {
    return {
      ...bonus,
      typeLabel: BONUS_TYPE_LABELS[bonus.bonusType] || bonus.bonusType,
      valueDisplay: bonus.bonusType === 'PERCENTAGE'
        ? `${bonus.bonusValue}%`
        : `$${bonus.bonusValue?.toFixed(2) || '0.00'}`,
      statusLabel: bonus.isActive ? 'Active' : 'Inactive',
      claimsDisplay: bonus.maxClaims
        ? `${bonus.claimsCount || 0} / ${bonus.maxClaims}`
        : `${bonus.claimsCount || 0} / Unlimited`
    };
  }

  /**
   * Format claim for display
   */
  formatClaimForDisplay(claim) {
    return {
      ...claim,
      statusLabel: CLAIM_STATUS_LABELS[claim.status] || claim.status,
      bonusAmountDisplay: `$${claim.bonusAmount?.toFixed(2) || '0.00'}`,
      turnoverDisplay: `$${claim.turnoverRequired?.toFixed(2) || '0.00'}`,
      dateDisplay: claim.createdAt
        ? new Date(claim.createdAt).toLocaleString()
        : '-'
    };
  }
}

export const bonusService = new BonusService();
export default bonusService;
