import { useState, useEffect } from 'react';
import { FiTrendingUp, FiRefreshCw, FiDownload, FiUsers, FiStar, FiGift, FiCreditCard, FiPercent, FiDollarSign, FiHash, FiAward, FiUserCheck, FiActivity, FiBarChart2, FiMessageSquare, FiList, FiUserPlus, FiChevronRight } from 'react-icons/fi';

const API_KEY = 'team33-admin-secret-key-2024';

// Report sections/sub-pages
const REPORT_SECTIONS = [
  { id: 'transactions', name: 'Transactions', icon: FiTrendingUp },
  { id: 'customer', name: 'Customer', icon: FiUsers },
  { id: 'top-customer', name: 'Top Customer', icon: FiStar },
  { id: 'promotion', name: 'Promotion', icon: FiGift },
  { id: 'bank', name: 'Bank', icon: FiCreditCard },
  { id: 'commission', name: 'Commission', icon: FiPercent },
  { id: 'payment-gateway', name: 'Payment Gateway', icon: FiDollarSign },
  { id: 'rebate', name: 'Rebate', icon: FiPercent },
  { id: 'manual-other', name: 'Manual / Other', icon: FiHash },
  { id: 'lucky-number', name: 'Lucky Number', icon: FiHash },
  { id: 'lucky-draw-4d', name: 'Lucky Draw 4D', icon: FiAward },
  { id: 'staff', name: 'Staff', icon: FiUserCheck },
  { id: 'activity-log', name: 'Activity Log', icon: FiActivity },
  { id: 'game-winlose', name: 'Game WinLose', icon: FiBarChart2 },
  { id: 'feedback', name: 'Feedback', icon: FiMessageSquare },
  { id: 'leaderboard', name: 'Leaderboard', icon: FiList },
  { id: 'top-referrer', name: 'Top Referrer', icon: FiUserPlus },
];

const Reports = () => {
  const [activeSection, setActiveSection] = useState('transactions');
  const [displayMode, setDisplayMode] = useState('Daily');
  const [formData, setFormData] = useState({
    periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
    type: 'All'
  });

  const [reportData, setReportData] = useState([]);
  const [totals, setTotals] = useState({
    depositCount: 0,
    depositTotal: '0.00',
    withdrawCount: 0,
    withdrawTotal: '0.00',
    net: '0.00'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Customer report data
  const [customerData, setCustomerData] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);

  // Fetch report data from API
  const fetchReportData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [depositsRes, withdrawalsRes] = await Promise.all([
        fetch('/api/admin/deposits/all', { headers: { 'X-API-Key': API_KEY } })
          .then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/admin/withdrawals/all', { headers: { 'X-API-Key': API_KEY } })
          .then(r => r.ok ? r.json() : []).catch(() => [])
      ]);

      let deposits = Array.isArray(depositsRes) ? depositsRes : [];
      let withdrawals = Array.isArray(withdrawalsRes) ? withdrawalsRes : [];

      if (deposits.length === 0) {
        const [pending, completed] = await Promise.all([
          fetch('/api/admin/deposits/pending', { headers: { 'X-API-Key': API_KEY } })
            .then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/api/admin/deposits/status/COMPLETED', { headers: { 'X-API-Key': API_KEY } })
            .then(r => r.ok ? r.json() : []).catch(() => [])
        ]);
        deposits = [...(Array.isArray(pending) ? pending : []), ...(Array.isArray(completed) ? completed : [])];
      }

      if (withdrawals.length === 0) {
        const [pending, completed] = await Promise.all([
          fetch('/api/admin/withdrawals/pending', { headers: { 'X-API-Key': API_KEY } })
            .then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/api/admin/withdrawals/status/COMPLETED', { headers: { 'X-API-Key': API_KEY } })
            .then(r => r.ok ? r.json() : []).catch(() => [])
        ]);
        withdrawals = [...(Array.isArray(pending) ? pending : []), ...(Array.isArray(completed) ? completed : [])];
      }

      // Filter by date range
      const startDate = new Date(formData.periodStart);
      const endDate = new Date(formData.periodEnd);
      endDate.setHours(23, 59, 59, 999);

      deposits = deposits.filter(d => {
        const date = new Date(d.createdAt);
        return date >= startDate && date <= endDate;
      });

      withdrawals = withdrawals.filter(w => {
        const date = new Date(w.createdAt);
        return date >= startDate && date <= endDate;
      });

      // Filter by type
      if (formData.type === 'Deposit') {
        withdrawals = [];
      } else if (formData.type === 'Withdraw') {
        deposits = [];
      }

      // Group by date based on display mode
      const groupedData = {};

      const getGroupKey = (dateStr) => {
        const date = new Date(dateStr);
        if (displayMode === 'Daily') {
          return date.toISOString().split('T')[0];
        } else if (displayMode === 'Monthly') {
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else {
          return `${date.getFullYear()}`;
        }
      };

      // Process deposits
      deposits.forEach(d => {
        const key = getGroupKey(d.createdAt);
        if (!groupedData[key]) {
          groupedData[key] = { depositCount: 0, depositTotal: 0, withdrawCount: 0, withdrawTotal: 0 };
        }
        if (d.status === 'COMPLETED' || d.status === 'APPROVED') {
          groupedData[key].depositCount++;
          groupedData[key].depositTotal += parseFloat(d.amount) || 0;
        }
      });

      // Process withdrawals
      withdrawals.forEach(w => {
        const key = getGroupKey(w.createdAt);
        if (!groupedData[key]) {
          groupedData[key] = { depositCount: 0, depositTotal: 0, withdrawCount: 0, withdrawTotal: 0 };
        }
        if (w.status === 'COMPLETED' || w.status === 'APPROVED') {
          groupedData[key].withdrawCount++;
          groupedData[key].withdrawTotal += parseFloat(w.amount) || 0;
        }
      });

      // Convert to array and sort
      const reportArray = Object.entries(groupedData)
        .map(([date, data]) => ({
          date,
          depositCount: data.depositCount,
          depositTotal: data.depositTotal.toFixed(2),
          withdrawCount: data.withdrawCount,
          withdrawTotal: data.withdrawTotal.toFixed(2),
          net: (data.depositTotal - data.withdrawTotal).toFixed(2)
        }))
        .sort((a, b) => b.date.localeCompare(a.date));

      setReportData(reportArray);

      // Calculate totals
      const totalDeposits = reportArray.reduce((sum, row) => sum + parseFloat(row.depositTotal), 0);
      const totalWithdrawals = reportArray.reduce((sum, row) => sum + parseFloat(row.withdrawTotal), 0);

      setTotals({
        depositCount: reportArray.reduce((sum, row) => sum + row.depositCount, 0),
        depositTotal: totalDeposits.toFixed(2),
        withdrawCount: reportArray.reduce((sum, row) => sum + row.withdrawCount, 0),
        withdrawTotal: totalWithdrawals.toFixed(2),
        net: (totalDeposits - totalWithdrawals).toFixed(2)
      });

      // Generate customer report data
      const customerStats = {};
      [...deposits, ...withdrawals].forEach(tx => {
        const accountId = tx.accountId;
        if (!customerStats[accountId]) {
          customerStats[accountId] = { accountId, deposits: 0, withdrawals: 0, depositCount: 0, withdrawCount: 0 };
        }
        if (tx.depositId) {
          customerStats[accountId].deposits += parseFloat(tx.amount) || 0;
          customerStats[accountId].depositCount++;
        } else {
          customerStats[accountId].withdrawals += parseFloat(tx.amount) || 0;
          customerStats[accountId].withdrawCount++;
        }
      });

      const customerArray = Object.values(customerStats).map(c => ({
        ...c,
        total: c.deposits - c.withdrawals,
        totalTransactions: c.depositCount + c.withdrawCount
      }));

      setCustomerData(customerArray);
      setTopCustomers(customerArray.sort((a, b) => b.deposits - a.deposits).slice(0, 10));

    } catch (err) {
      console.error('Error fetching report data:', err);
      setError('Failed to load report data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when displayMode or date range changes
  useEffect(() => {
    fetchReportData();
  }, [displayMode, formData.periodStart, formData.periodEnd, formData.type]);

  const handleExport = () => {
    if (reportData.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Date', 'Deposit Count', 'Deposit Total', 'Withdraw Count', 'Withdraw Total', 'Net'];
    const csvRows = [
      headers.join(','),
      ...reportData.map(row => [row.date, row.depositCount, row.depositTotal, row.withdrawCount, row.withdrawTotal, row.net].join(',')),
      ['TOTAL', totals.depositCount, totals.depositTotal, totals.withdrawCount, totals.withdrawTotal, totals.net].join(',')
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSection}-report-${formData.periodStart}-to-${formData.periodEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render different sections
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'transactions':
        return renderTransactionReport();
      case 'customer':
        return renderCustomerReport();
      case 'top-customer':
        return renderTopCustomerReport();
      default:
        return renderPlaceholderReport();
    }
  };

  const renderTransactionReport = () => (
    <>
      {/* Summary Stats */}
      <div className="quick-stats" style={{ marginBottom: '20px' }}>
        <div className="quick-stat">
          <span className="quick-stat-label">Total Deposits</span>
          <span className="quick-stat-value text-success">${totals.depositTotal}</span>
        </div>
        <div className="quick-stat">
          <span className="quick-stat-label">Total Withdrawals</span>
          <span className="quick-stat-value text-danger">${totals.withdrawTotal}</span>
        </div>
        <div className="quick-stat">
          <span className="quick-stat-label">Net Profit</span>
          <span className={`quick-stat-value ${parseFloat(totals.net) >= 0 ? 'text-success' : 'text-danger'}`}>
            ${totals.net}
          </span>
        </div>
      </div>

      {/* Report Table */}
      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>DEPOSIT COUNT</th>
                <th>DEPOSIT TOTAL</th>
                <th>WITHDRAW COUNT</th>
                <th>WITHDRAW TOTAL</th>
                <th>NET</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>
              ) : reportData.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>No data found</td></tr>
              ) : (
                <>
                  {reportData.map((row, idx) => (
                    <tr key={idx}>
                      <td><strong>{row.date}</strong></td>
                      <td>{row.depositCount}</td>
                      <td className="text-success">${row.depositTotal}</td>
                      <td>{row.withdrawCount}</td>
                      <td className="text-danger">${row.withdrawTotal}</td>
                      <td><strong className={parseFloat(row.net) >= 0 ? 'text-success' : 'text-danger'}>${row.net}</strong></td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f9fafb', fontWeight: '600' }}>
                    <td><strong>TOTAL</strong></td>
                    <td>{totals.depositCount}</td>
                    <td className="text-success">${totals.depositTotal}</td>
                    <td>{totals.withdrawCount}</td>
                    <td className="text-danger">${totals.withdrawTotal}</td>
                    <td><strong className={parseFloat(totals.net) >= 0 ? 'text-success' : 'text-danger'}>${totals.net}</strong></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderCustomerReport = () => (
    <div className="card">
      <div className="card-header"><h3>Customer Transaction Report</h3></div>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Account ID</th>
              <th>Deposits</th>
              <th>Withdrawals</th>
              <th>Net</th>
              <th>Total Transactions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>
            ) : customerData.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>No customer data found</td></tr>
            ) : (
              customerData.slice(0, 50).map((customer, idx) => (
                <tr key={idx}>
                  <td><code style={{ fontSize: '11px' }}>{customer.accountId?.substring(0, 20)}...</code></td>
                  <td className="text-success">${customer.deposits.toFixed(2)}</td>
                  <td className="text-danger">${customer.withdrawals.toFixed(2)}</td>
                  <td className={customer.total >= 0 ? 'text-success' : 'text-danger'}>${customer.total.toFixed(2)}</td>
                  <td>{customer.totalTransactions}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTopCustomerReport = () => (
    <div className="card">
      <div className="card-header"><h3>Top 10 Customers by Deposits</h3></div>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Account ID</th>
              <th>Total Deposits</th>
              <th>Deposit Count</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>
            ) : topCustomers.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>No data found</td></tr>
            ) : (
              topCustomers.map((customer, idx) => (
                <tr key={idx}>
                  <td><strong>{idx + 1}</strong></td>
                  <td><code style={{ fontSize: '11px' }}>{customer.accountId?.substring(0, 20)}...</code></td>
                  <td className="text-success" style={{ fontWeight: '600' }}>${customer.deposits.toFixed(2)}</td>
                  <td>{customer.depositCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPlaceholderReport = () => {
    const section = REPORT_SECTIONS.find(s => s.id === activeSection);
    return (
      <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
        <section.icon size={48} style={{ color: '#ccc', marginBottom: '16px' }} />
        <h3 style={{ margin: '0 0 8px', color: '#666' }}>{section?.name} Report</h3>
        <p style={{ color: '#999', margin: 0 }}>This report section is under development.</p>
      </div>
    );
  };

  return (
    <div className="reports-layout">
      {/* Sidebar */}
      <div className="reports-sidebar">
        <div className="sidebar-header">
          <FiTrendingUp /> Reports
        </div>
        <nav className="sidebar-nav">
          {REPORT_SECTIONS.map((section) => (
            <button
              key={section.id}
              className={`sidebar-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              <section.icon className="sidebar-icon" />
              <span>{section.name}</span>
              <FiChevronRight className="sidebar-arrow" />
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="reports-content">
        <div className="page-header">
          <h2 className="page-title">
            <FiTrendingUp style={{ marginRight: '10px' }} />
            {REPORT_SECTIONS.find(s => s.id === activeSection)?.name} Report
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <FiDownload /> Export
          </button>
        </div>

        {/* Filter Form */}
        <div className="filter-section">
          <div className="form-row">
            <span className="form-label">Period</span>
            <div className="form-input-group">
              <input
                type="date"
                className="form-input"
                value={formData.periodStart}
                onChange={(e) => setFormData({...formData, periodStart: e.target.value})}
              />
              <input
                type="date"
                className="form-input"
                value={formData.periodEnd}
                onChange={(e) => setFormData({...formData, periodEnd: e.target.value})}
              />
            </div>
          </div>

          <div className="form-row">
            <span className="form-label">Display</span>
            <div className="btn-group">
              {['Daily', 'Monthly', 'Yearly'].map((mode) => (
                <button
                  key={mode}
                  className={`btn-toggle ${displayMode === mode ? 'active' : ''}`}
                  onClick={() => setDisplayMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <span className="form-label">Type</span>
            <select
              className="form-select"
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <option>All</option>
              <option>Deposit</option>
              <option>Withdraw</option>
            </select>
          </div>

          <div className="action-bar" style={{ marginTop: '15px', marginBottom: 0 }}>
            <button className="btn btn-secondary" onClick={fetchReportData} disabled={loading}>
              <FiRefreshCw className={loading ? 'spin' : ''} /> {loading ? 'Loading...' : 'Recalculate'}
            </button>
          </div>
        </div>

        {error && (
          <div className="card" style={{ padding: '20px', background: '#fee', color: '#c00', marginBottom: '20px' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {renderSectionContent()}
      </div>

      <style>{`
        .reports-layout {
          display: flex;
          gap: 0;
          min-height: calc(100vh - 120px);
          margin: -20px;
        }
        .reports-sidebar {
          width: 220px;
          background: #fff;
          border-right: 1px solid #e5e7eb;
          flex-shrink: 0;
        }
        .sidebar-header {
          padding: 16px 20px;
          font-weight: 600;
          font-size: 15px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #374151;
        }
        .sidebar-nav {
          padding: 8px 0;
        }
        .sidebar-item {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 10px 16px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 13px;
          color: #4b5563;
          text-align: left;
          transition: all 0.15s;
        }
        .sidebar-item:hover {
          background: #f3f4f6;
        }
        .sidebar-item.active {
          background: #ecfdf5;
          color: #059669;
          font-weight: 500;
        }
        .sidebar-icon {
          width: 16px;
          height: 16px;
          margin-right: 10px;
          flex-shrink: 0;
        }
        .sidebar-item span {
          flex: 1;
        }
        .sidebar-arrow {
          width: 14px;
          height: 14px;
          opacity: 0.4;
        }
        .sidebar-item.active .sidebar-arrow {
          opacity: 1;
        }
        .reports-content {
          flex: 1;
          padding: 20px;
          overflow-x: auto;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .reports-layout {
            flex-direction: column;
          }
          .reports-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid #e5e7eb;
          }
          .sidebar-nav {
            display: flex;
            flex-wrap: wrap;
            padding: 8px;
            gap: 4px;
          }
          .sidebar-item {
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
          }
          .sidebar-arrow {
            display: none;
          }
          .reports-content {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default Reports;
