import { useState, useEffect } from 'react';
import { FiPercent, FiDollarSign, FiInbox, FiRefreshCw, FiCreditCard, FiTrendingUp, FiClock, FiEdit2, FiSave, FiX, FiUsers, FiSettings, FiSearch, FiCheck } from 'react-icons/fi';
import { getAllCommissionEarnings, getCommissionStats, creditPendingCommissions, getAllReferrals, updateReferral, getReferralsByPrincipal } from '../../services/apiService';
import UserDetailsModal from '../components/UserDetailsModal';

const Commission = () => {
  const [activeTab, setActiveTab] = useState('earnings'); // 'earnings', 'referrals', 'settings'
  const [earnings, setEarnings] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingTotal: 0,
    creditedTotal: 0,
    depositCommissions: 0,
    playCommissions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [crediting, setCreditig] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Editing state for referrals
  const [editingReferral, setEditingReferral] = useState(null);
  const [editForm, setEditForm] = useState({
    depositCommissionRate: 0,
    depositCommissionMaxCount: 0,
    playCommissionRate: 0,
    playCommissionUntil: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  // Universal/Default commission settings
  const [defaultSettings, setDefaultSettings] = useState(() => {
    const saved = localStorage.getItem('commission_default_settings');
    return saved ? JSON.parse(saved) : {
      depositCommissionRate: 10, // 10%
      depositCommissionMaxCount: 5,
      playCommissionRate: 5, // 5%
      playCommissionUntil: '', // empty = forever
    };
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Search for referrals by account ID
  const [searchAccountId, setSearchAccountId] = useState('');
  const [searching, setSearching] = useState(false);

  // Credit confirmation dialog
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [creditTarget, setCreditTarget] = useState(null); // { accountId, amount, earningId }

  const handleAccountClick = (accountId) => {
    if (accountId && accountId !== '-') {
      setSelectedAccountId(accountId);
      setShowUserModal(true);
    }
  };

  // Save universal/default settings
  const saveDefaultSettings = async () => {
    setSavingSettings(true);
    try {
      // Save to localStorage
      localStorage.setItem('commission_default_settings', JSON.stringify(defaultSettings));

      // Also save to a global config that the site frontend can read
      // This creates/updates a config that will be used when new referrals are created
      const configForFrontend = {
        depositCommissionRate: parseFloat(defaultSettings.depositCommissionRate) / 100,
        depositCommissionMaxCount: parseInt(defaultSettings.depositCommissionMaxCount) || 5,
        playCommissionRate: parseFloat(defaultSettings.playCommissionRate) / 100,
        playCommissionUntil: defaultSettings.playCommissionUntil || null,
      };
      localStorage.setItem('commission_config', JSON.stringify(configForFrontend));

      alert('Default commission settings saved successfully!');
    } catch (err) {
      alert('Error saving settings: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Fetch referrals
  const fetchReferrals = async () => {
    try {
      const result = await getAllReferrals();
      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : (result.data?.content || []);
        setReferrals(data);
      }
    } catch (err) {
      console.warn('Error fetching referrals:', err.message);
    }
  };

  // Search referrals by account ID (principal)
  const searchReferrals = async () => {
    if (!searchAccountId.trim()) {
      fetchReferrals(); // If empty, fetch all
      return;
    }

    setSearching(true);
    try {
      const result = await getReferralsByPrincipal(searchAccountId.trim());
      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : (result.data?.content || []);
        setReferrals(data);
        if (data.length === 0) {
          alert('No referrals found for this account ID');
        }
      } else {
        alert(result.error || 'Failed to search referrals');
      }
    } catch (err) {
      console.warn('Error searching referrals:', err.message);
      alert('Error searching: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  // Start editing a referral
  const startEditReferral = (referral) => {
    setEditingReferral(referral.referralId || referral.id);
    setEditForm({
      depositCommissionRate: (referral.depositCommissionRate || 0) * 100,
      depositCommissionMaxCount: referral.depositCommissionMaxCount || 0,
      playCommissionRate: (referral.playCommissionRate || 0) * 100,
      playCommissionUntil: referral.playCommissionUntil ? referral.playCommissionUntil.split('T')[0] : '',
      isActive: referral.isActive !== false,
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingReferral(null);
    setEditForm({
      depositCommissionRate: 0,
      depositCommissionMaxCount: 0,
      playCommissionRate: 0,
      playCommissionUntil: '',
      isActive: true,
    });
  };

  // Save referral changes
  const saveReferral = async (referralId) => {
    setSaving(true);
    try {
      const result = await updateReferral(referralId, {
        depositCommissionRate: parseFloat(editForm.depositCommissionRate) / 100,
        depositCommissionMaxCount: parseInt(editForm.depositCommissionMaxCount) || 0,
        playCommissionRate: parseFloat(editForm.playCommissionRate) / 100,
        playCommissionUntil: editForm.playCommissionUntil || null,
        isActive: editForm.isActive,
      });

      if (result.success) {
        alert('Commission rates updated successfully!');
        fetchReferrals();
        cancelEdit();
      } else {
        alert(result.error || 'Failed to update commission rates');
      }
    } catch (err) {
      alert('Error updating referral: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      // Fetch earnings - handle errors gracefully
      let earningsData = [];
      try {
        const earningsRes = await getAllCommissionEarnings(params);
        if (earningsRes.success && Array.isArray(earningsRes.data)) {
          earningsData = earningsRes.data;
        } else if (earningsRes.success && earningsRes.data?.earnings) {
          earningsData = earningsRes.data.earnings;
        } else if (earningsRes.success && earningsRes.data?.content) {
          earningsData = earningsRes.data.content;
        }
      } catch (err) {
        console.warn('Commission earnings endpoint not available:', err.message);
      }
      setEarnings(earningsData);

      // Calculate stats from earnings data (since stats endpoint may not exist)
      const calculatedStats = {
        totalEarnings: 0,
        pendingTotal: 0,
        creditedTotal: 0,
        depositCommissions: 0,
        playCommissions: 0,
      };

      earningsData.forEach((e) => {
        const amount = parseFloat(e.commissionAmount || e.amount || 0);
        calculatedStats.totalEarnings += amount;
        if (e.status === 'PENDING') calculatedStats.pendingTotal += amount;
        if (e.status === 'CREDITED') calculatedStats.creditedTotal += amount;
        if (e.type === 'DEPOSIT') calculatedStats.depositCommissions += amount;
        if (e.type === 'PLAY') calculatedStats.playCommissions += amount;
      });

      // Try to get stats from API, fallback to calculated
      try {
        const statsRes = await getCommissionStats();
        if (statsRes.success && statsRes.data) {
          setStats({
            totalEarnings: statsRes.data.totalEarnings || calculatedStats.totalEarnings,
            pendingTotal: statsRes.data.pendingTotal || calculatedStats.pendingTotal,
            creditedTotal: statsRes.data.creditedTotal || calculatedStats.creditedTotal,
            depositCommissions: statsRes.data.depositCommissions || calculatedStats.depositCommissions,
            playCommissions: statsRes.data.playCommissions || calculatedStats.playCommissions,
          });
        } else {
          setStats(calculatedStats);
        }
      } catch (err) {
        console.warn('Commission stats endpoint not available, using calculated:', err.message);
        setStats(calculatedStats);
      }
    } catch (error) {
      console.error('Error fetching commission data:', error);
      setEarnings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchReferrals();
  }, [statusFilter, typeFilter]);

  // Show credit confirmation dialog
  const showCreditConfirmation = (accountId, amount) => {
    setCreditTarget({ accountId, amount });
    setShowCreditDialog(true);
  };

  // Actually credit the commission after confirmation
  const handleCreditCommission = async () => {
    if (!creditTarget?.accountId) return;

    setShowCreditDialog(false);
    setCreditig(creditTarget.accountId);

    try {
      const result = await creditPendingCommissions(creditTarget.accountId);
      if (result.success) {
        alert('Commission credited successfully to user\'s wallet!');
        fetchData();
      } else {
        alert(result.error || 'Failed to credit commission');
      }
    } catch (error) {
      alert('Error crediting commission: ' + error.message);
    } finally {
      setCreditig(null);
      setCreditTarget(null);
    }
  };

  // Cancel credit dialog
  const cancelCreditDialog = () => {
    setShowCreditDialog(false);
    setCreditTarget(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      PENDING: 'badge-warning',
      CREDITED: 'badge-success',
      CANCELLED: 'badge-danger',
    };
    return statusStyles[status] || 'badge-secondary';
  };

  const getTypeBadge = (type) => {
    const typeStyles = {
      DEPOSIT: 'badge-info',
      PLAY: 'badge-primary',
    };
    return typeStyles[type] || 'badge-secondary';
  };

  const statCards = [
    { icon: <FiDollarSign />, label: 'Total Earnings', value: formatCurrency(stats.totalEarnings), color: 'green' },
    { icon: <FiClock />, label: 'Pending', value: formatCurrency(stats.pendingTotal), color: 'yellow' },
    { icon: <FiCreditCard />, label: 'Credited', value: formatCurrency(stats.creditedTotal), color: 'blue' },
    { icon: <FiPercent />, label: 'Deposit Commissions', value: formatCurrency(stats.depositCommissions), color: 'purple' },
    { icon: <FiTrendingUp />, label: 'Play Commissions', value: formatCurrency(stats.playCommissions), color: 'teal' },
  ];

  return (
    <div className="commission-page">
      <div className="page-header">
        <h1 className="page-title">Commission Management</h1>
        <button className="btn btn-primary" onClick={() => { fetchData(); fetchReferrals(); }} disabled={loading}>
          <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className={`stat-icon ${stat.color}`}>{stat.icon}</div>
            <div className="stat-info">
              <h4>{stat.label}</h4>
              <p>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="commission-tabs" style={{ marginBottom: '20px' }}>
        <button
          className={`commission-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <FiSettings /> Default Settings
        </button>
        <button
          className={`commission-tab ${activeTab === 'earnings' ? 'active' : ''}`}
          onClick={() => setActiveTab('earnings')}
        >
          <FiDollarSign /> Commission Earnings
        </button>
        <button
          className={`commission-tab ${activeTab === 'referrals' ? 'active' : ''}`}
          onClick={() => setActiveTab('referrals')}
        >
          <FiUsers /> Referral Rates
        </button>
      </div>

      {/* Universal Default Settings Tab */}
      {activeTab === 'settings' && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <h3 className="card-title">
              <FiSettings style={{ marginRight: '8px' }} />
              Default Commission Settings
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
              These settings apply to all new referrals created on the site
            </p>
          </div>
          <div className="settings-form">
            <div className="settings-grid">
              <div className="setting-card">
                <div className="setting-header">
                  <FiPercent className="setting-icon deposit" />
                  <h4>Deposit Commission Rate</h4>
                </div>
                <p className="setting-description">
                  Percentage earned when referred player makes a deposit
                </p>
                <div className="setting-input-group">
                  <input
                    type="number"
                    value={defaultSettings.depositCommissionRate}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, depositCommissionRate: e.target.value })}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <span className="input-suffix">%</span>
                </div>
              </div>

              <div className="setting-card">
                <div className="setting-header">
                  <FiCreditCard className="setting-icon count" />
                  <h4>Max Deposits for Commission</h4>
                </div>
                <p className="setting-description">
                  Maximum number of deposits eligible for commission
                </p>
                <div className="setting-input-group">
                  <input
                    type="number"
                    value={defaultSettings.depositCommissionMaxCount}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, depositCommissionMaxCount: e.target.value })}
                    min="0"
                    max="100"
                  />
                  <span className="input-suffix">deposits</span>
                </div>
              </div>

              <div className="setting-card">
                <div className="setting-header">
                  <FiTrendingUp className="setting-icon play" />
                  <h4>Play Commission Rate</h4>
                </div>
                <p className="setting-description">
                  Percentage earned when referred player places bets
                </p>
                <div className="setting-input-group">
                  <input
                    type="number"
                    value={defaultSettings.playCommissionRate}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, playCommissionRate: e.target.value })}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <span className="input-suffix">%</span>
                </div>
              </div>

              <div className="setting-card">
                <div className="setting-header">
                  <FiClock className="setting-icon time" />
                  <h4>Play Commission Duration</h4>
                </div>
                <p className="setting-description">
                  End date for play commission (leave empty for forever)
                </p>
                <div className="setting-input-group">
                  <input
                    type="date"
                    value={defaultSettings.playCommissionUntil}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, playCommissionUntil: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="settings-actions">
              <button
                className="btn btn-primary btn-large"
                onClick={saveDefaultSettings}
                disabled={savingSettings}
              >
                <FiSave /> {savingSettings ? 'Saving...' : 'Save Default Settings'}
              </button>
              <p className="settings-note">
                These settings will be used when new referrals are created through the refer-a-friend feature
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Referrals Tab - Edit Commission Rates */}
      {activeTab === 'referrals' && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 className="card-title">Referral Commission Rates</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                Search for a user to edit their commission rates
              </p>
            </div>
            <div className="search-box" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Enter Account ID (e.g., ACC123456789)"
                value={searchAccountId}
                onChange={(e) => setSearchAccountId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchReferrals()}
                className="search-input"
                style={{
                  padding: '10px 14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  width: '280px',
                }}
              />
              <button
                className="btn btn-primary"
                onClick={searchReferrals}
                disabled={searching}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FiSearch /> {searching ? 'Searching...' : 'Search'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => { setSearchAccountId(''); fetchReferrals(); }}
                style={{ padding: '10px 14px' }}
              >
                Clear
              </button>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Referrer</th>
                  <th>Referred</th>
                  <th>Deposit Rate</th>
                  <th>Max Deposits</th>
                  <th>Play Rate</th>
                  <th>Play Until</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {referrals.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                      <FiInbox size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                      <p style={{ margin: 0 }}>No referrals found.</p>
                    </td>
                  </tr>
                ) : (
                  referrals.map((ref, idx) => {
                    const refId = ref.referralId || ref.id;
                    const isEditing = editingReferral === refId;

                    return (
                      <tr key={refId || idx}>
                        <td>
                          <button
                            className="account-link"
                            onClick={() => handleAccountClick(ref.principalAccountId)}
                            title={ref.principalAccountId || ''}
                          >
                            {ref.principalAccountId ? `ACC...${String(ref.principalAccountId).slice(-8)}` : '-'}
                          </button>
                        </td>
                        <td>
                          <button
                            className="account-link"
                            onClick={() => handleAccountClick(ref.referredAccountId)}
                            title={ref.referredAccountId || ''}
                          >
                            {ref.referredAccountId ? `ACC...${String(ref.referredAccountId).slice(-8)}` : '-'}
                          </button>
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="number"
                              className="edit-input"
                              value={editForm.depositCommissionRate}
                              onChange={(e) => setEditForm({ ...editForm, depositCommissionRate: e.target.value })}
                              min="0"
                              max="100"
                              step="0.1"
                              style={{ width: '70px' }}
                            />
                          ) : (
                            <span style={{ fontWeight: 600, color: '#9333ea' }}>
                              {((ref.depositCommissionRate || 0) * 100).toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="number"
                              className="edit-input"
                              value={editForm.depositCommissionMaxCount}
                              onChange={(e) => setEditForm({ ...editForm, depositCommissionMaxCount: e.target.value })}
                              min="0"
                              style={{ width: '60px' }}
                            />
                          ) : (
                            ref.depositCommissionMaxCount || '∞'
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="number"
                              className="edit-input"
                              value={editForm.playCommissionRate}
                              onChange={(e) => setEditForm({ ...editForm, playCommissionRate: e.target.value })}
                              min="0"
                              max="100"
                              step="0.1"
                              style={{ width: '70px' }}
                            />
                          ) : (
                            <span style={{ fontWeight: 600, color: '#0d9488' }}>
                              {((ref.playCommissionRate || 0) * 100).toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="date"
                              className="edit-input"
                              value={editForm.playCommissionUntil}
                              onChange={(e) => setEditForm({ ...editForm, playCommissionUntil: e.target.value })}
                              style={{ width: '130px' }}
                            />
                          ) : (
                            ref.playCommissionUntil ? new Date(ref.playCommissionUntil).toLocaleDateString() : 'Forever'
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <select
                              className="edit-input"
                              value={editForm.isActive ? 'active' : 'inactive'}
                              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'active' })}
                              style={{ width: '90px' }}
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          ) : (
                            <span className={`badge ${ref.isActive !== false ? 'badge-success' : 'badge-danger'}`}>
                              {ref.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                className="btn btn-success"
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                onClick={() => saveReferral(refId)}
                                disabled={saving}
                              >
                                <FiSave /> {saving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                onClick={cancelEdit}
                              >
                                <FiX />
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-primary"
                              style={{ padding: '4px 10px', fontSize: '11px' }}
                              onClick={() => startEditReferral(ref)}
                            >
                              <FiEdit2 /> Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Earnings Tab */}
      {activeTab === 'earnings' && (
        <>
          {/* Filters */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="filters-row">
              <div className="filter-group">
                <label>Status:</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="CREDITED">Credited</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Type:</label>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="">All Types</option>
                  <option value="DEPOSIT">Deposit Commission</option>
                  <option value="PLAY">Play Commission</option>
                </select>
              </div>
            </div>
          </div>

          {/* Commission History Table */}
          <div className="card">
        <div className="card-header">
          <h3 className="card-title">Commission Earnings</h3>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Referrer (Principal)</th>
                <th>Referred Player</th>
                <th>Type</th>
                <th>Source Amount</th>
                <th>Commission Rate</th>
                <th>Commission Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '40px' }}>
                    <FiRefreshCw className="spin" size={24} style={{ marginBottom: '10px' }} />
                    <p style={{ margin: 0, color: '#6b7280' }}>Loading commission data...</p>
                  </td>
                </tr>
              ) : earnings.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <FiInbox size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                    <p style={{ margin: 0 }}>No commission earnings found.</p>
                  </td>
                </tr>
              ) : (
                earnings.map((earning, idx) => (
                  <tr key={earning.id || earning.earningId || idx}>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                      {String(earning.id || earning.earningId || '-').slice(-10)}
                    </td>
                    <td>
                      <button
                        className="account-link"
                        onClick={() => handleAccountClick(earning.principalAccountId)}
                        disabled={!earning.principalAccountId}
                        title={earning.principalAccountId || ''}
                      >
                        {earning.principalAccountId ? `ACC...${String(earning.principalAccountId).slice(-8)}` : '-'}
                      </button>
                    </td>
                    <td>
                      <button
                        className="account-link"
                        onClick={() => handleAccountClick(earning.referredAccountId)}
                        disabled={!earning.referredAccountId}
                        title={earning.referredAccountId || ''}
                      >
                        {earning.referredAccountId ? `ACC...${String(earning.referredAccountId).slice(-8)}` : '-'}
                      </button>
                    </td>
                    <td>
                      <span className={`badge ${getTypeBadge(earning.type)}`}>
                        {earning.type || 'N/A'}
                      </span>
                    </td>
                    <td>{formatCurrency(earning.sourceAmount)}</td>
                    <td>{((earning.commissionRate || 0) * 100).toFixed(1)}%</td>
                    <td style={{ fontWeight: 600, color: '#16a34a' }}>
                      {formatCurrency(earning.commissionAmount || earning.amount)}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(earning.status)}`}>
                        {earning.status || 'UNKNOWN'}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#6b7280' }}>
                      {formatDate(earning.createdAt || earning.earnedAt)}
                    </td>
                    <td>
                      {earning.status === 'PENDING' && (
                        <button
                          className="btn btn-success"
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                          onClick={() => showCreditConfirmation(earning.principalAccountId, earning.commissionAmount || earning.amount)}
                          disabled={crediting === earning.principalAccountId}
                        >
                          {crediting === earning.principalAccountId ? 'Crediting...' : 'Credit'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Credit Confirmation Dialog */}
      {showCreditDialog && creditTarget && (
        <div className="dialog-overlay" onClick={cancelCreditDialog}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-icon">
              <FiCreditCard size={32} />
            </div>
            <h3 className="dialog-title">Confirm Credit Commission</h3>
            <p className="dialog-message">
              Are you sure you want to credit the pending commission to this user's wallet?
            </p>
            <div className="dialog-details">
              <div className="detail-row">
                <span className="detail-label">Account ID:</span>
                <span className="detail-value">{creditTarget.accountId}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Amount:</span>
                <span className="detail-value amount">{formatCurrency(creditTarget.amount)}</span>
              </div>
            </div>
            <p className="dialog-warning">
              This action will transfer the commission amount to the user's wallet balance.
            </p>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={cancelCreditDialog}>
                Cancel
              </button>
              <button className="btn btn-success" onClick={handleCreditCommission}>
                <FiCheck /> Approve & Credit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserModal && selectedAccountId && (
        <UserDetailsModal
          accountId={selectedAccountId}
          onClose={() => {
            setShowUserModal(false);
            setSelectedAccountId(null);
          }}
        />
      )}

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .account-link {
          background: none;
          border: none;
          color: #2563eb;
          font-family: monospace;
          font-size: 11px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .account-link:hover:not(:disabled) {
          background: #eff6ff;
          color: #1d4ed8;
          text-decoration: underline;
        }
        .account-link:disabled {
          color: #9ca3af;
          cursor: default;
        }
        .filters-row {
          display: flex;
          gap: 20px;
          padding: 16px;
          flex-wrap: wrap;
        }
        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .filter-group label {
          font-weight: 500;
          color: #6b7280;
        }
        .filter-group select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          min-width: 150px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }
        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }
        .stat-icon.green { background: #dcfce7; color: #16a34a; }
        .stat-icon.yellow { background: #fef3c7; color: #d97706; }
        .stat-icon.blue { background: #dbeafe; color: #2563eb; }
        .stat-icon.purple { background: #f3e8ff; color: #9333ea; }
        .stat-icon.teal { background: #ccfbf1; color: #0d9488; }
        .stat-info h4 {
          margin: 0;
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
        }
        .stat-info p {
          margin: 4px 0 0;
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }
        .commission-tabs {
          display: flex;
          gap: 8px;
          background: white;
          padding: 8px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .commission-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }
        .commission-tab:hover {
          background: #f3f4f6;
          color: #374151;
        }
        .commission-tab.active {
          background: #3b82f6;
          color: white;
        }
        .edit-input {
          padding: 6px 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 12px;
        }
        .edit-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
        .btn svg {
          width: 14px;
          height: 14px;
        }
        .btn-secondary {
          background: #6b7280;
          color: white;
        }
        .btn-secondary:hover {
          background: #4b5563;
        }
        .settings-form {
          padding: 24px;
        }
        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }
        .setting-card {
          background: #f9fafb;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #e5e7eb;
        }
        .setting-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .setting-header h4 {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: #111827;
        }
        .setting-icon {
          width: 36px;
          height: 36px;
          padding: 8px;
          border-radius: 8px;
        }
        .setting-icon.deposit {
          background: #f3e8ff;
          color: #9333ea;
        }
        .setting-icon.count {
          background: #dbeafe;
          color: #2563eb;
        }
        .setting-icon.play {
          background: #ccfbf1;
          color: #0d9488;
        }
        .setting-icon.time {
          background: #fef3c7;
          color: #d97706;
        }
        .setting-description {
          font-size: 13px;
          color: #6b7280;
          margin: 0 0 16px;
        }
        .setting-input-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .setting-input-group input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }
        .setting-input-group input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }
        .input-suffix {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }
        .settings-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }
        .btn-large {
          padding: 14px 32px;
          font-size: 16px;
        }
        .settings-note {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
        }
        .dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .dialog-box {
          background: white;
          border-radius: 16px;
          padding: 32px;
          max-width: 420px;
          width: 90%;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          animation: slideUp 0.3s ease;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .dialog-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 20px;
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #16a34a;
        }
        .dialog-title {
          margin: 0 0 12px;
          font-size: 20px;
          font-weight: 600;
          color: #111827;
        }
        .dialog-message {
          margin: 0 0 20px;
          font-size: 14px;
          color: #6b7280;
          line-height: 1.5;
        }
        .dialog-details {
          background: #f9fafb;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
        }
        .detail-row:not(:last-child) {
          border-bottom: 1px solid #e5e7eb;
        }
        .detail-label {
          font-size: 13px;
          color: #6b7280;
        }
        .detail-value {
          font-size: 13px;
          font-weight: 600;
          color: #111827;
          font-family: monospace;
        }
        .detail-value.amount {
          color: #16a34a;
          font-size: 16px;
        }
        .dialog-warning {
          font-size: 12px;
          color: #d97706;
          background: #fef3c7;
          padding: 10px 12px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .dialog-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        .dialog-actions .btn {
          padding: 12px 24px;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </div>
  );
};

export default Commission;
