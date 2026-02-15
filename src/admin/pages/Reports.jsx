import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrendingUp, FiRefreshCw, FiDownload, FiUsers, FiStar, FiGift, FiCreditCard, FiPercent, FiDollarSign, FiHash, FiAward, FiUserCheck, FiActivity, FiBarChart2, FiMessageSquare, FiList, FiUserPlus, FiChevronRight, FiFileText } from 'react-icons/fi';
import { keycloakService } from '../../services/keycloakService';

// API base URL
const API_BASE = 'https://api.team33.mx';

// Get auth headers for API requests
const getAuthHeaders = () => {
  const token = localStorage.getItem('team33_admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

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
  const navigate = useNavigate();
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

  // Fetch report data from API (requires JWT auth)
  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    const headers = getAuthHeaders();

    try {
      // Try to fetch all deposits and withdrawals first
      const [depositsResponse, withdrawalsResponse] = await Promise.all([
        fetch(`${API_BASE}/api/admin/deposits/all`, { headers }),
        fetch(`${API_BASE}/api/admin/withdrawals/all`, { headers })
      ]);

      const [depositsRes, withdrawalsRes] = await Promise.all([
        depositsResponse.ok ? depositsResponse.json() : [],
        withdrawalsResponse.ok ? withdrawalsResponse.json() : []
      ]);

      let deposits = Array.isArray(depositsRes) ? depositsRes : [];
      let withdrawals = Array.isArray(withdrawalsRes) ? withdrawalsRes : [];

      // Fallback: fetch pending and completed separately if /all doesn't work
      if (deposits.length === 0) {
        const [pending, completed] = await Promise.all([
          fetch(`${API_BASE}/api/admin/deposits/pending`, { headers })
            .then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${API_BASE}/api/admin/deposits/status/COMPLETED`, { headers })
            .then(r => r.ok ? r.json() : []).catch(() => [])
        ]);
        deposits = [...(Array.isArray(pending) ? pending : []), ...(Array.isArray(completed) ? completed : [])];
      }

      if (withdrawals.length === 0) {
        const [pending, completed] = await Promise.all([
          fetch(`${API_BASE}/api/admin/withdrawals/pending`, { headers })
            .then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${API_BASE}/api/admin/withdrawals/status/COMPLETED`, { headers })
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
    // Check authentication on mount
    if (!keycloakService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    fetchReportData();
  }, [displayMode, formData.periodStart, formData.periodEnd, formData.type]);

  // Export to CSV
  const handleExportCSV = () => {
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

  // Export to PDF
  const handleExportPDF = () => {
    if (reportData.length === 0) {
      alert('No data to export');
      return;
    }

    const sectionName = REPORT_SECTIONS.find(s => s.id === activeSection)?.name || 'Report';

    // Create PDF content using HTML and print
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${sectionName} Report - ${formData.periodStart} to ${formData.periodEnd}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { color: #059669; margin-bottom: 5px; }
          .subtitle { color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f9fafb; font-weight: 600; }
          .text-success { color: #059669; }
          .text-danger { color: #dc2626; }
          .totals-row { background: #f0fdf4; font-weight: 600; }
          .summary { display: flex; gap: 30px; margin-bottom: 20px; }
          .summary-item { padding: 15px; background: #f9fafb; border-radius: 8px; }
          .summary-label { font-size: 12px; color: #666; }
          .summary-value { font-size: 24px; font-weight: 700; }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h1>Team33 Casino - ${sectionName} Report</h1>
        <p class="subtitle">Period: ${formData.periodStart} to ${formData.periodEnd} | Display: ${displayMode}</p>

        <div class="summary">
          <div class="summary-item">
            <div class="summary-label">Total Deposits</div>
            <div class="summary-value text-success">$${totals.depositTotal}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Total Withdrawals</div>
            <div class="summary-value text-danger">$${totals.withdrawTotal}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Net Profit</div>
            <div class="summary-value ${parseFloat(totals.net) >= 0 ? 'text-success' : 'text-danger'}">$${totals.net}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Deposit Count</th>
              <th>Deposit Total</th>
              <th>Withdraw Count</th>
              <th>Withdraw Total</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.map(row => `
              <tr>
                <td><strong>${row.date}</strong></td>
                <td>${row.depositCount}</td>
                <td class="text-success">$${row.depositTotal}</td>
                <td>${row.withdrawCount}</td>
                <td class="text-danger">$${row.withdrawTotal}</td>
                <td class="${parseFloat(row.net) >= 0 ? 'text-success' : 'text-danger'}"><strong>$${row.net}</strong></td>
              </tr>
            `).join('')}
            <tr class="totals-row">
              <td><strong>TOTAL</strong></td>
              <td>${totals.depositCount}</td>
              <td class="text-success">$${totals.depositTotal}</td>
              <td>${totals.withdrawCount}</td>
              <td class="text-danger">$${totals.withdrawTotal}</td>
              <td class="${parseFloat(totals.net) >= 0 ? 'text-success' : 'text-danger'}"><strong>$${totals.net}</strong></td>
            </tr>
          </tbody>
        </table>

        <p style="margin-top: 30px; font-size: 12px; color: #999;">
          Generated on ${new Date().toLocaleString()} | Team33 Admin Panel
        </p>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
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
    <div className="reports-page">
      {/* Page Header */}
      <div className="page-header">
        <h2 className="page-title">
          <FiTrendingUp style={{ marginRight: '10px' }} />
          Reports
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
            <FiDownload /> CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleExportPDF}>
            <FiFileText /> PDF
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="report-tabs">
        {REPORT_SECTIONS.slice(0, 8).map((section) => (
          <button
            key={section.id}
            className={`report-tab ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            <section.icon style={{ marginRight: '6px' }} />
            {section.name}
          </button>
        ))}
        <select
          className="form-select report-more-select"
          value={REPORT_SECTIONS.slice(8).find(s => s.id === activeSection) ? activeSection : ''}
          onChange={(e) => e.target.value && setActiveSection(e.target.value)}
        >
          <option value="">More Reports...</option>
          {REPORT_SECTIONS.slice(8).map((section) => (
            <option key={section.id} value={section.id}>{section.name}</option>
          ))}
        </select>
      </div>

      {/* Main Content */}
      <div className="reports-content">

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
        .reports-page {
          padding: 0;
        }
        .report-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
          padding: 12px;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          align-items: center;
        }
        .report-tab {
          display: flex;
          align-items: center;
          padding: 8px 14px;
          border: 1px solid #e5e7eb;
          background: #fff;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          color: #4b5563;
          transition: all 0.15s;
        }
        .report-tab:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }
        .report-tab.active {
          background: #059669;
          color: #fff;
          border-color: #059669;
        }
        .report-more-select {
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 13px;
          color: #4b5563;
          background: #fff;
          cursor: pointer;
        }
        .reports-content {
          padding: 0;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .report-tabs {
            padding: 8px;
          }
          .report-tab {
            padding: 6px 10px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default Reports;
