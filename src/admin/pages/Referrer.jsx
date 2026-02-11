import { useState, useEffect } from 'react';
import { FiSearch, FiUsers, FiDollarSign, FiUserPlus, FiInbox, FiRefreshCw, FiEdit2, FiEye, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { getAllReferrals, getCommissionStats, updateReferral, getCommissionEarnings, getPendingCommissionTotal } from '../../services/apiService';

const Referrer = () => {
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState({
    totalReferrers: 0,
    totalReferrals: 0,
    totalCommissionPaid: 0,
    pendingCommissions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    depositCommissionRate: 0.1,
    depositCommissionMaxCount: 1,
    playCommissionRate: 0.01,
    playCommissionUntil: null,
    isActive: true,
  });
  const [updating, setUpdating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const [referralsRes, statsRes] = await Promise.all([
        getAllReferrals(params),
        getCommissionStats(),
      ]);

      if (referralsRes.success && Array.isArray(referralsRes.data)) {
        setReferrals(referralsRes.data);
      } else if (referralsRes.success && referralsRes.data?.referrals) {
        setReferrals(referralsRes.data.referrals);
      } else {
        setReferrals([]);
      }

      if (statsRes.success && statsRes.data) {
        // Calculate unique referrers
        const uniqueReferrers = new Set(
          (referralsRes.data || []).map(r => r.principalAccountId)
        ).size;

        setStats({
          totalReferrers: statsRes.data.totalReferrers || uniqueReferrers || 0,
          totalReferrals: statsRes.data.totalReferrals || (referralsRes.data?.length || 0),
          totalCommissionPaid: statsRes.data.creditedTotal || statsRes.data.totalCommissionPaid || 0,
          pendingCommissions: statsRes.data.pendingTotal || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const filteredReferrals = referrals.filter(ref => {
    const searchLower = searchTerm.toLowerCase();
    const matchSearch =
      ref.principalAccountId?.toLowerCase().includes(searchLower) ||
      ref.referredAccountId?.toLowerCase().includes(searchLower) ||
      ref.referralCode?.toLowerCase().includes(searchLower);
    return matchSearch;
  });

  const handleEditClick = (referral) => {
    setSelectedReferral(referral);
    setEditForm({
      depositCommissionRate: referral.depositCommissionRate || 0.1,
      depositCommissionMaxCount: referral.depositCommissionMaxCount || 1,
      playCommissionRate: referral.playCommissionRate || 0.01,
      playCommissionUntil: referral.playCommissionUntil || '',
      isActive: referral.isActive !== false,
    });
    setShowEditModal(true);
  };

  const handleUpdateReferral = async () => {
    if (!selectedReferral) return;
    setUpdating(true);

    try {
      const result = await updateReferral(selectedReferral.id || selectedReferral.referralId, {
        depositCommissionRate: parseFloat(editForm.depositCommissionRate),
        depositCommissionMaxCount: parseInt(editForm.depositCommissionMaxCount),
        playCommissionRate: parseFloat(editForm.playCommissionRate),
        playCommissionUntil: editForm.playCommissionUntil || null,
        isActive: editForm.isActive,
      });

      if (result.success) {
        alert('Referral updated successfully!');
        setShowEditModal(false);
        fetchData();
      } else {
        alert(result.error || 'Failed to update referral');
      }
    } catch (error) {
      alert('Error updating referral: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPercent = (rate) => {
    return ((rate || 0) * 100).toFixed(1) + '%';
  };

  const statCards = [
    { icon: <FiUsers />, label: 'Total Referrers', value: stats.totalReferrers.toLocaleString(), color: 'blue' },
    { icon: <FiUserPlus />, label: 'Total Referrals', value: stats.totalReferrals.toLocaleString(), color: 'green' },
    { icon: <FiDollarSign />, label: 'Commission Paid', value: formatCurrency(stats.totalCommissionPaid), color: 'gold' },
    { icon: <FiDollarSign />, label: 'Pending Commissions', value: formatCurrency(stats.pendingCommissions), color: 'orange' },
  ];

  return (
    <div className="referrer-page">
      <div className="page-header">
        <h1 className="page-title">Referrer Management</h1>
        <button className="btn btn-primary" onClick={fetchData} disabled={loading}>
          <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats */}
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

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="filters-row">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by account ID or referral code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Status:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Referral Relationships</h3>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Referrer (Principal)</th>
                <th>Referred Player</th>
                <th>Referral Code</th>
                <th>Deposit Rate</th>
                <th>Play Rate</th>
                <th>Max Deposits</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '40px' }}>
                    <FiRefreshCw className="spin" size={24} style={{ marginBottom: '10px' }} />
                    <p style={{ margin: 0, color: '#6b7280' }}>Loading referral data...</p>
                  </td>
                </tr>
              ) : filteredReferrals.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <FiInbox size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                    <p style={{ margin: 0 }}>No referrals found.</p>
                  </td>
                </tr>
              ) : (
                filteredReferrals.map((ref) => (
                  <tr key={ref.id || ref.referralId}>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                      {(ref.id || ref.referralId || '').slice(-10)}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                      {ref.principalAccountId?.slice(-12) || '-'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                      {ref.referredAccountId?.slice(-12) || '-'}
                    </td>
                    <td>
                      <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                        {ref.referralCode || '-'}
                      </code>
                    </td>
                    <td style={{ fontWeight: 500 }}>{formatPercent(ref.depositCommissionRate)}</td>
                    <td style={{ fontWeight: 500 }}>{formatPercent(ref.playCommissionRate)}</td>
                    <td style={{ textAlign: 'center' }}>{ref.depositCommissionMaxCount || 1}</td>
                    <td>
                      <span className={`badge ${ref.isActive !== false ? 'badge-success' : 'badge-danger'}`}>
                        {ref.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#6b7280' }}>
                      {formatDate(ref.createdAt)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => handleEditClick(ref)}
                          title="Edit Referral Config"
                        >
                          <FiEdit2 size={12} />
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

      {/* Edit Modal */}
      {showEditModal && selectedReferral && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Referral Configuration</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Deposit Commission Rate</label>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    value={(editForm.depositCommissionRate * 100).toFixed(1)}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      depositCommissionRate: parseFloat(e.target.value) / 100
                    })}
                    step="0.5"
                    min="0"
                    max="100"
                  />
                  <span>%</span>
                </div>
                <small>Commission rate for deposits (default: 10%)</small>
              </div>

              <div className="form-group">
                <label>Max Deposit Count</label>
                <input
                  type="number"
                  value={editForm.depositCommissionMaxCount}
                  onChange={(e) => setEditForm({
                    ...editForm,
                    depositCommissionMaxCount: parseInt(e.target.value)
                  })}
                  min="1"
                  max="100"
                />
                <small>Number of deposits eligible for commission</small>
              </div>

              <div className="form-group">
                <label>Play Commission Rate</label>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    value={(editForm.playCommissionRate * 100).toFixed(2)}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      playCommissionRate: parseFloat(e.target.value) / 100
                    })}
                    step="0.1"
                    min="0"
                    max="100"
                  />
                  <span>%</span>
                </div>
                <small>Commission rate for bets/plays (default: 1%)</small>
              </div>

              <div className="form-group">
                <label>Play Commission Until</label>
                <input
                  type="date"
                  value={editForm.playCommissionUntil || ''}
                  onChange={(e) => setEditForm({
                    ...editForm,
                    playCommissionUntil: e.target.value
                  })}
                />
                <small>Leave empty for unlimited duration</small>
              </div>

              <div className="form-group">
                <label>Status</label>
                <div className="toggle-switch" onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}>
                  {editForm.isActive ? (
                    <FiToggleRight size={32} color="#16a34a" />
                  ) : (
                    <FiToggleLeft size={32} color="#dc2626" />
                  )}
                  <span>{editForm.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleUpdateReferral} disabled={updating}>
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .filters-row {
          display: flex;
          gap: 20px;
          padding: 16px;
          flex-wrap: wrap;
          align-items: center;
        }
        .search-box {
          position: relative;
          flex: 1;
          min-width: 250px;
        }
        .search-box .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }
        .search-box input {
          width: 100%;
          padding: 10px 12px 10px 40px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
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
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          min-width: 120px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
        .stat-icon.blue { background: #dbeafe; color: #2563eb; }
        .stat-icon.green { background: #dcfce7; color: #16a34a; }
        .stat-icon.gold { background: #fef3c7; color: #d97706; }
        .stat-icon.orange { background: #ffedd5; color: #ea580c; }
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
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        .modal-header h3 {
          margin: 0;
          font-size: 18px;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
        }
        .modal-body {
          padding: 20px;
        }
        .modal-body .form-group {
          margin-bottom: 20px;
        }
        .modal-body .form-group label {
          display: block;
          font-weight: 500;
          margin-bottom: 6px;
          color: #374151;
        }
        .modal-body .form-group input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }
        .modal-body .form-group small {
          display: block;
          margin-top: 4px;
          color: #9ca3af;
          font-size: 12px;
        }
        .input-with-suffix {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .input-with-suffix input {
          flex: 1;
        }
        .input-with-suffix span {
          font-weight: 500;
          color: #6b7280;
        }
        .toggle-switch {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        .toggle-switch span {
          font-weight: 500;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid #e5e7eb;
        }
      `}</style>
    </div>
  );
};

export default Referrer;
