import { useState, useEffect } from 'react';
import { FiPercent, FiDollarSign, FiInbox, FiRefreshCw, FiCreditCard, FiTrendingUp, FiClock } from 'react-icons/fi';
import { getAllCommissionEarnings, getCommissionStats, creditPendingCommissions } from '../../services/apiService';

const Commission = () => {
  const [earnings, setEarnings] = useState([]);
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
  }, [statusFilter, typeFilter]);

  const handleCreditCommission = async (accountId) => {
    if (!accountId) return;
    setCreditig(accountId);
    try {
      const result = await creditPendingCommissions(accountId);
      if (result.success) {
        alert('Commission credited successfully!');
        fetchData();
      } else {
        alert(result.error || 'Failed to credit commission');
      }
    } catch (error) {
      alert('Error crediting commission: ' + error.message);
    } finally {
      setCreditig(null);
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
        <button className="btn btn-primary" onClick={fetchData} disabled={loading}>
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
                    <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                      {String(earning.principalAccountId || '-').slice(-12)}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                      {String(earning.referredAccountId || '-').slice(-12)}
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
                          onClick={() => handleCreditCommission(earning.principalAccountId)}
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
      `}</style>
    </div>
  );
};

export default Commission;
