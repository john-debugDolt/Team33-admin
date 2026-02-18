import { useState, useEffect, useCallback } from 'react';
import {
  FiPlus, FiRefreshCw, FiEdit2, FiTrash2, FiCheck, FiX,
  FiGift, FiDollarSign, FiPercent, FiUsers,
  FiToggleLeft, FiToggleRight, FiSearch,
  FiCreditCard, FiAward
} from 'react-icons/fi';
import bonusService, {
  BONUS_TYPE_LABELS,
  CLAIM_STATUS_LABELS
} from '../../services/bonusService';

const Rebate = () => {
  // State for bonuses list
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for filters
  const [filterActive, setFilterActive] = useState('all'); // 'all', 'active', 'inactive'
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // State for modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showClaimsModal, setShowClaimsModal] = useState(false);
  const [showDirectCreditModal, setShowDirectCreditModal] = useState(false);
  const [selectedBonus, setSelectedBonus] = useState(null);
  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);

  // State for form
  const [formData, setFormData] = useState({
    bonusCode: '',
    displayName: '',
    description: '',
    bonusType: 'PERCENTAGE',
    bonusValue: 0,
    maxBonusAmount: null,
    minDeposit: 0,
    turnoverMultiplier: 1,
    maxClaims: null,
    isActive: true,
    requiresCode: false
  });

  // State for direct credit form
  const [directCreditData, setDirectCreditData] = useState({
    accountId: '',
    bonusAmount: 0,
    turnoverMultiplier: 0,
    reason: '',
    reference: ''
  });

  // State for operations
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Fetch bonuses on mount
  const fetchBonuses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let result;
      if (filterActive === 'all' && !filterType) {
        result = await bonusService.getAllBonuses();
      } else {
        const filters = {};
        if (filterActive !== 'all') {
          filters.isActive = filterActive === 'active';
        }
        if (filterType) {
          filters.bonusType = filterType;
        }
        result = await bonusService.filterBonuses(filters);
      }

      if (result.success) {
        setBonuses(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch bonuses');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch bonuses');
    } finally {
      setLoading(false);
    }
  }, [filterActive, filterType]);

  useEffect(() => {
    fetchBonuses();
  }, [fetchBonuses]);

  // Filter bonuses by search query
  const filteredBonuses = bonuses.filter(bonus => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      bonus.bonusCode?.toLowerCase().includes(query) ||
      bonus.displayName?.toLowerCase().includes(query) ||
      bonus.description?.toLowerCase().includes(query)
    );
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      bonusCode: '',
      displayName: '',
      description: '',
      bonusType: 'PERCENTAGE',
      bonusValue: 0,
      maxBonusAmount: null,
      minDeposit: 0,
      turnoverMultiplier: 1,
      maxClaims: null,
      isActive: true,
      requiresCode: false
    });
  };

  // Open create modal
  const handleCreateClick = () => {
    resetForm();
    // Generate a unique bonus code
    setFormData(prev => ({
      ...prev,
      bonusCode: bonusService.generateBonusCode()
    }));
    setShowCreateModal(true);
  };

  // Open edit modal
  const handleEditClick = (bonus) => {
    setSelectedBonus(bonus);
    setFormData({
      bonusCode: bonus.bonusCode,
      displayName: bonus.displayName,
      description: bonus.description || '',
      bonusType: bonus.bonusType,
      bonusValue: bonus.bonusValue || 0,
      maxBonusAmount: bonus.maxBonusAmount,
      minDeposit: bonus.minDeposit || 0,
      turnoverMultiplier: bonus.turnoverMultiplier || 1,
      maxClaims: bonus.maxClaims,
      isActive: bonus.isActive,
      requiresCode: bonus.requiresCode || false
    });
    setShowEditModal(true);
  };

  // Handle create bonus
  const handleCreate = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await bonusService.createBonus(formData);
      if (result.success) {
        setMessage({ type: 'success', text: 'Bonus created successfully!' });
        setShowCreateModal(false);
        resetForm();
        fetchBonuses();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to create bonus' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create bonus' });
    } finally {
      setSaving(false);
    }
  };

  // Handle update bonus
  const handleUpdate = async () => {
    if (!selectedBonus) return;
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await bonusService.updateBonus(selectedBonus.id, formData);
      if (result.success) {
        setMessage({ type: 'success', text: 'Bonus updated successfully!' });
        setShowEditModal(false);
        setSelectedBonus(null);
        fetchBonuses();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update bonus' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update bonus' });
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active status
  const handleToggleActive = async (bonus) => {
    try {
      const result = bonus.isActive
        ? await bonusService.deactivateBonus(bonus.id)
        : await bonusService.activateBonus(bonus.id);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `Bonus ${bonus.isActive ? 'deactivated' : 'activated'} successfully!`
        });
        fetchBonuses();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to toggle status' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to toggle status' });
    }
  };

  // Handle delete bonus
  const handleDelete = async (bonus) => {
    if (!confirm(`Are you sure you want to delete "${bonus.displayName}"?`)) return;

    try {
      const result = await bonusService.deleteBonus(bonus.id);
      if (result.success) {
        setMessage({ type: 'success', text: 'Bonus deleted successfully!' });
        fetchBonuses();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to delete bonus' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete bonus' });
    }
  };

  // Handle view claims
  const handleViewClaims = async (bonus) => {
    setSelectedBonus(bonus);
    setClaimsLoading(true);
    setShowClaimsModal(true);
    try {
      const result = await bonusService.getClaimsByBonus(bonus.id);
      if (result.success) {
        setClaims(result.data || []);
      } else {
        setClaims([]);
      }
    } catch (err) {
      setClaims([]);
    } finally {
      setClaimsLoading(false);
    }
  };

  // Handle direct credit
  const handleDirectCredit = async () => {
    if (!directCreditData.accountId || !directCreditData.bonusAmount || !directCreditData.reason) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await bonusService.creditDirectBonus(directCreditData);
      if (result.success) {
        setMessage({ type: 'success', text: result.data?.message || 'Bonus credited successfully!' });
        setShowDirectCreditModal(false);
        setDirectCreditData({
          accountId: '',
          bonusAmount: 0,
          turnoverMultiplier: 0,
          reason: '',
          reference: ''
        });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to credit bonus' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to credit bonus' });
    } finally {
      setSaving(false);
    }
  };

  // Clear message after 5 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="rebate-page">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">
          <FiGift style={{ marginRight: '10px' }} />
          Bonus Management
        </h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => setShowDirectCreditModal(true)}>
            <FiCreditCard /> Direct Credit
          </button>
          <button className="btn btn-primary" onClick={handleCreateClick}>
            <FiPlus /> Create Bonus
          </button>
        </div>
      </div>

      {/* Message Alert */}
      {message.text && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '20px' }}>
          {message.type === 'success' ? <FiCheck /> : <FiX />}
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div className="form-group" style={{ flex: '1', minWidth: '200px', marginBottom: 0 }}>
              <div style={{ position: 'relative' }}>
                <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search bonuses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="form-group" style={{ minWidth: '150px', marginBottom: 0 }}>
              <select
                className="form-input"
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="form-group" style={{ minWidth: '150px', marginBottom: 0 }}>
              <select
                className="form-input"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All Types</option>
                {Object.entries(BONUS_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button className="btn btn-secondary" onClick={fetchBonuses} disabled={loading}>
              <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Bonuses Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <FiAward style={{ marginRight: '8px' }} />
            Bonuses ({filteredBonuses.length})
          </h3>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Type</th>
                <th>Value</th>
                <th>Min Deposit</th>
                <th>Turnover</th>
                <th>Claims</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                    <FiRefreshCw className="spin" size={24} />
                    <p style={{ margin: '10px 0 0', color: '#6b7280' }}>Loading bonuses...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
                    <FiX size={24} />
                    <p style={{ margin: '10px 0 0' }}>{error}</p>
                  </td>
                </tr>
              ) : filteredBonuses.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <FiGift size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                    <p style={{ margin: 0 }}>No bonuses found.</p>
                  </td>
                </tr>
              ) : (
                filteredBonuses.map((bonus) => (
                  <tr key={bonus.id}>
                    <td>
                      <code style={{
                        background: 'rgba(99, 102, 241, 0.1)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {bonus.bonusCode}
                      </code>
                    </td>
                    <td>
                      <strong>{bonus.displayName}</strong>
                      {bonus.description && (
                        <small style={{ display: 'block', color: '#6b7280', fontSize: '11px' }}>
                          {bonus.description.substring(0, 50)}...
                        </small>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${bonus.bonusType === 'PERCENTAGE' ? 'primary' : 'secondary'}`}>
                        {bonus.bonusType === 'PERCENTAGE' ? <FiPercent size={12} /> : <FiDollarSign size={12} />}
                        {BONUS_TYPE_LABELS[bonus.bonusType] || bonus.bonusType}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600', color: '#10b981' }}>
                      {bonus.bonusType === 'PERCENTAGE'
                        ? `${bonus.bonusValue}%`
                        : `$${bonus.bonusValue?.toFixed(2) || '0.00'}`}
                      {bonus.maxBonusAmount && (
                        <small style={{ display: 'block', color: '#6b7280' }}>
                          Max: ${bonus.maxBonusAmount}
                        </small>
                      )}
                    </td>
                    <td>${bonus.minDeposit?.toFixed(2) || '0.00'}</td>
                    <td>{bonus.turnoverMultiplier}x</td>
                    <td>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleViewClaims(bonus)}
                        style={{ fontSize: '12px' }}
                      >
                        <FiUsers size={12} />
                        {bonus.claimsCount || 0}
                        {bonus.maxClaims && ` / ${bonus.maxClaims}`}
                      </button>
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${bonus.isActive ? 'btn-success' : 'btn-secondary'}`}
                        onClick={() => handleToggleActive(bonus)}
                        title={bonus.isActive ? 'Click to deactivate' : 'Click to activate'}
                        style={{ minWidth: '80px' }}
                      >
                        {bonus.isActive ? <FiToggleRight /> : <FiToggleLeft />}
                        {bonus.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleEditClick(bonus)}
                          title="Edit"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(bonus)}
                          title="Delete"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{showCreateModal ? 'Create New Bonus' : 'Edit Bonus'}</h3>
              <button className="modal-close" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                {/* Bonus Code */}
                <div className="form-group">
                  <label className="form-label">Bonus Code *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.bonusCode}
                    onChange={(e) => setFormData({ ...formData, bonusCode: e.target.value.toUpperCase() })}
                    placeholder="e.g., WELCOME50"
                  />
                </div>

                {/* Display Name */}
                <div className="form-group">
                  <label className="form-label">Display Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="e.g., Welcome Bonus"
                  />
                </div>

                {/* Description */}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the bonus..."
                    rows={2}
                  />
                </div>

                {/* Bonus Type */}
                <div className="form-group">
                  <label className="form-label">Bonus Type *</label>
                  <select
                    className="form-input"
                    value={formData.bonusType}
                    onChange={(e) => setFormData({ ...formData, bonusType: e.target.value })}
                  >
                    {Object.entries(BONUS_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Bonus Value */}
                <div className="form-group">
                  <label className="form-label">
                    {formData.bonusType === 'PERCENTAGE' ? 'Percentage (%)' : 'Fixed Amount ($)'}
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.bonusValue}
                    onChange={(e) => setFormData({ ...formData, bonusValue: Number(e.target.value) })}
                    min="0"
                    step={formData.bonusType === 'PERCENTAGE' ? '1' : '0.01'}
                  />
                </div>

                {/* Max Bonus Amount */}
                <div className="form-group">
                  <label className="form-label">Max Bonus Amount ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.maxBonusAmount || ''}
                    onChange={(e) => setFormData({ ...formData, maxBonusAmount: e.target.value ? Number(e.target.value) : null })}
                    min="0"
                    step="0.01"
                    placeholder="Leave empty for unlimited"
                  />
                </div>

                {/* Min Deposit */}
                <div className="form-group">
                  <label className="form-label">Min Deposit ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.minDeposit}
                    onChange={(e) => setFormData({ ...formData, minDeposit: Number(e.target.value) })}
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Turnover Multiplier */}
                <div className="form-group">
                  <label className="form-label">Turnover Multiplier</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.turnoverMultiplier}
                    onChange={(e) => setFormData({ ...formData, turnoverMultiplier: Number(e.target.value) })}
                    min="0"
                    step="0.1"
                  />
                </div>

                {/* Max Claims */}
                <div className="form-group">
                  <label className="form-label">Max Claims</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.maxClaims || ''}
                    onChange={(e) => setFormData({ ...formData, maxClaims: e.target.value ? Number(e.target.value) : null })}
                    min="0"
                    placeholder="Leave empty for unlimited"
                  />
                </div>

                {/* Checkboxes */}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      />
                      Active
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.requiresCode}
                        onChange={(e) => setFormData({ ...formData, requiresCode: e.target.checked })}
                      />
                      Requires Code Entry
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={showCreateModal ? handleCreate : handleUpdate}
                disabled={saving || !formData.bonusCode || !formData.displayName}
              >
                {saving ? <FiRefreshCw className="spin" /> : <FiCheck />}
                {showCreateModal ? 'Create Bonus' : 'Update Bonus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claims Modal */}
      {showClaimsModal && (
        <div className="modal-overlay" onClick={() => setShowClaimsModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3>Claims for: {selectedBonus?.displayName}</h3>
              <button className="modal-close" onClick={() => setShowClaimsModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {claimsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <FiRefreshCw className="spin" size={24} />
                  <p>Loading claims...</p>
                </div>
              ) : claims.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <FiUsers size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                  <p>No claims for this bonus yet.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Account ID</th>
                      <th>Deposit Amount</th>
                      <th>Bonus Amount</th>
                      <th>Turnover Required</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((claim) => (
                      <tr key={claim.id}>
                        <td><code style={{ fontSize: '11px' }}>{claim.accountId}</code></td>
                        <td>${claim.depositAmount?.toFixed(2) || '0.00'}</td>
                        <td style={{ color: '#10b981', fontWeight: '600' }}>
                          ${claim.bonusAmount?.toFixed(2) || '0.00'}
                        </td>
                        <td>${claim.turnoverRequired?.toFixed(2) || '0.00'}</td>
                        <td>
                          <span className={`badge badge-${
                            claim.status === 'CREDITED' ? 'success' :
                            claim.status === 'COMPLETED' ? 'primary' :
                            claim.status === 'PENDING' ? 'warning' : 'secondary'
                          }`}>
                            {CLAIM_STATUS_LABELS[claim.status] || claim.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px' }}>
                          {claim.createdAt ? new Date(claim.createdAt).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowClaimsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Credit Modal */}
      {showDirectCreditModal && (
        <div className="modal-overlay" onClick={() => setShowDirectCreditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3><FiCreditCard style={{ marginRight: '8px' }} /> Direct Bonus Credit</h3>
              <button className="modal-close" onClick={() => setShowDirectCreditModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
                Credit bonus directly to a user&apos;s wallet without requiring a deposit.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Account ID *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={directCreditData.accountId}
                    onChange={(e) => setDirectCreditData({ ...directCreditData, accountId: e.target.value })}
                    placeholder="e.g., ACC283930606797066240"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bonus Amount ($) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={directCreditData.bonusAmount}
                    onChange={(e) => setDirectCreditData({ ...directCreditData, bonusAmount: Number(e.target.value) })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Turnover Multiplier (optional)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={directCreditData.turnoverMultiplier}
                    onChange={(e) => setDirectCreditData({ ...directCreditData, turnoverMultiplier: Number(e.target.value) })}
                    min="0"
                    step="0.1"
                    placeholder="0 for no requirement"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reason *</label>
                  <textarea
                    className="form-input"
                    value={directCreditData.reason}
                    onChange={(e) => setDirectCreditData({ ...directCreditData, reason: e.target.value })}
                    placeholder="e.g., VIP loyalty reward"
                    rows={2}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reference (optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={directCreditData.reference}
                    onChange={(e) => setDirectCreditData({ ...directCreditData, reference: e.target.value })}
                    placeholder="Auto-generated if empty"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDirectCreditModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleDirectCredit}
                disabled={saving || !directCreditData.accountId || !directCreditData.bonusAmount || !directCreditData.reason}
              >
                {saving ? <FiRefreshCw className="spin" /> : <FiDollarSign />}
                Credit Bonus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for spin animation */}
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
        }
        .alert-success {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .alert-error {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }
        .badge-primary {
          background: rgba(99, 102, 241, 0.15);
          color: #6366f1;
        }
        .badge-secondary {
          background: rgba(107, 114, 128, 0.15);
          color: #6b7280;
        }
        .badge-success {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }
        .badge-warning {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }
        .btn-success {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .btn-success:hover {
          background: rgba(16, 185, 129, 0.25);
        }
        .btn-danger {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .btn-danger:hover {
          background: rgba(239, 68, 68, 0.25);
        }
      `}</style>
    </div>
  );
};

export default Rebate;
