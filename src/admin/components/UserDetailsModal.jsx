import { useState, useEffect } from 'react';
import { FiX, FiUser, FiPhone, FiCalendar, FiCopy, FiCheck, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { formatDateTime } from '../utils/dateUtils';
import {
  getWallet,
  getDepositsForAccount,
  getWithdrawalsForAccount,
  getBetHistory,
  getBetHistoryCount,
  getCommissionEarnings,
  getPendingCommissionTotal,
  getReferralsByPrincipal,
  getReferralByReferred
} from '../../services/apiService';

/**
 * UserDetailsModal Component
 * Shows comprehensive user details with tabbed navigation
 * Displays when user clicks on an Account ID
 */
const UserDetailsModal = ({ user, onClose }) => {
  // Active tab state
  const [activeTab, setActiveTab] = useState('DETAILS');

  // Data states for each tab
  const [loading, setLoading] = useState(false);
  const [walletData, setWalletData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [betHistory, setBetHistory] = useState([]);
  const [betHistoryTotal, setBetHistoryTotal] = useState(0);
  const [betHistoryPage, setBetHistoryPage] = useState(0);
  const [commissions, setCommissions] = useState([]);
  const [pendingCommissionTotal, setPendingCommissionTotal] = useState(0);
  const [referrals, setReferrals] = useState([]);
  const [referredBy, setReferredBy] = useState(null);
  const [commissionFilter, setCommissionFilter] = useState({ status: '', type: '' });
  const [copied, setCopied] = useState(false);

  // Pagination settings
  const BET_HISTORY_LIMIT = 20;

  // Tab definitions
  const tabs = [
    { id: 'TRANSACTION', label: 'TRANSACTION' },
    { id: 'BET HISTORY', label: 'BET HISTORY' },
    { id: 'COMMISSION', label: 'COMMISSION' },
    { id: 'CREDIT', label: 'CREDIT' },
    { id: 'SETTING', label: 'SETTING' },
    { id: 'WALLET', label: 'WALLET' },
    { id: 'CHAT', label: 'CHAT' },
    { id: 'PROBLEM', label: 'PROBLEM' },
    { id: 'DETAILS', label: 'DETAILS' },
    { id: 'GAME', label: 'GAME' },
    { id: 'IP', label: 'IP' },
    { id: 'SIMILARITY', label: 'SIMILARITY' },
    { id: 'USER TAG', label: 'USER TAG' },
    { id: 'LOG', label: 'LOG' },
  ];

  // Copy account ID to clipboard
  const copyAccountId = () => {
    navigator.clipboard.writeText(user.accountId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle bet history pagination
  const handleBetHistoryPageChange = async (newPage) => {
    if (newPage < 0 || newPage >= Math.ceil(betHistoryTotal / BET_HISTORY_LIMIT)) return;

    setLoading(true);
    setBetHistoryPage(newPage);

    try {
      const betResult = await getBetHistory(user.accountId, {
        limit: BET_HISTORY_LIMIT,
        offset: newPage * BET_HISTORY_LIMIT
      });

      if (betResult.success) {
        setBetHistory(Array.isArray(betResult.data) ? betResult.data : []);
      }
    } catch (err) {
      console.error('Error fetching bet history page:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when tab changes
  useEffect(() => {
    const fetchTabData = async () => {
      setLoading(true);

      try {
        switch (activeTab) {
          case 'WALLET':
            const walletResult = await getWallet(user.accountId);
            if (walletResult.success) {
              setWalletData(walletResult.data);
            }
            break;

          case 'TRANSACTION':
            const [depositsResult, withdrawalsResult] = await Promise.all([
              getDepositsForAccount(user.accountId),
              getWithdrawalsForAccount(user.accountId)
            ]);

            const deposits = depositsResult.success ?
              (Array.isArray(depositsResult.data) ? depositsResult.data : []).map(d => ({
                ...d,
                type: 'DEPOSIT'
              })) : [];

            const withdrawals = withdrawalsResult.success ?
              (Array.isArray(withdrawalsResult.data) ? withdrawalsResult.data : []).map(w => ({
                ...w,
                type: 'WITHDRAWAL'
              })) : [];

            const allTx = [...deposits, ...withdrawals].sort((a, b) =>
              new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
            );
            setTransactions(allTx);
            break;

          case 'BET HISTORY':
            // Fetch bet history with pagination and total count
            const [betResult, countResult] = await Promise.all([
              getBetHistory(user.accountId, {
                limit: BET_HISTORY_LIMIT,
                offset: betHistoryPage * BET_HISTORY_LIMIT
              }),
              getBetHistoryCount(user.accountId)
            ]);

            if (betResult.success) {
              setBetHistory(Array.isArray(betResult.data) ? betResult.data : []);
            }
            if (countResult.success) {
              // Count could be a number or object with count property
              const count = typeof countResult.data === 'number'
                ? countResult.data
                : countResult.data?.count || 0;
              setBetHistoryTotal(count);
            }
            break;

          case 'COMMISSION':
            // Fetch commission earnings, pending total, referrals, and referrer
            const [commResult, pendingResult, referralsResult, referredByResult] = await Promise.all([
              getCommissionEarnings(user.accountId, commissionFilter),
              getPendingCommissionTotal(user.accountId),
              getReferralsByPrincipal(user.accountId),
              getReferralByReferred(user.accountId)
            ]);

            if (commResult.success) {
              setCommissions(Array.isArray(commResult.data) ? commResult.data : []);
            }
            if (pendingResult.success) {
              setPendingCommissionTotal(pendingResult.data?.pendingTotal || 0);
            }
            if (referralsResult.success) {
              setReferrals(Array.isArray(referralsResult.data) ? referralsResult.data : []);
            }
            if (referredByResult.success && referredByResult.data) {
              setReferredBy(referredByResult.data);
            }
            break;

          default:
            break;
        }
      } catch (err) {
        console.error('Error fetching tab data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTabData();
  }, [activeTab, user.accountId]);

  // Render tab content based on active tab
  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="tab-loading">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      );
    }

    switch (activeTab) {
      case 'DETAILS':
        return (
          <div className="details-grid">
            <div className="detail-item">
              <label>Account ID</label>
              <span className="mono">{user.accountId}</span>
            </div>
            <div className="detail-item">
              <label>Full Name</label>
              <span>{user.name || '-'}</span>
            </div>
            <div className="detail-item">
              <label>First Name</label>
              <span>{user.firstName || '-'}</span>
            </div>
            <div className="detail-item">
              <label>Last Name</label>
              <span>{user.lastName || '-'}</span>
            </div>
            <div className="detail-item">
              <label>Phone</label>
              <span>{user.mobile || '-'}</span>
            </div>
            <div className="detail-item">
              <label>Email</label>
              <span>{user.email || '-'}</span>
            </div>
            <div className="detail-item">
              <label>Status</label>
              <span className={`status-badge ${user.status?.toLowerCase()}`}>{user.status || 'ACTIVE'}</span>
            </div>
            <div className="detail-item">
              <label>Registered</label>
              <span>{user.date || formatDateTime(user.createdAt)}</span>
            </div>
            <div className="detail-item">
              <label>Bank</label>
              <span>{user.bank || '-'}</span>
            </div>
            <div className="detail-item">
              <label>Bank Account</label>
              <span>{user.bankAccount || '-'}</span>
            </div>
          </div>
        );

      case 'WALLET':
        return (
          <div className="wallet-section">
            <div className="wallet-balance">
              <label>Current Balance</label>
              <span className="balance-amount">
                ${walletData?.balance?.toFixed(2) || user.balance?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="wallet-details">
              <div className="detail-item">
                <label>Wallet ID</label>
                <span className="mono">{walletData?.walletId || '-'}</span>
              </div>
              <div className="detail-item">
                <label>Currency</label>
                <span>{walletData?.currency || 'AUD'}</span>
              </div>
              <div className="detail-item">
                <label>Status</label>
                <span className={`status-badge ${walletData?.status?.toLowerCase() || 'active'}`}>
                  {walletData?.status || 'ACTIVE'}
                </span>
              </div>
            </div>
          </div>
        );

      case 'TRANSACTION':
        return (
          <div className="transactions-section">
            {transactions.length === 0 ? (
              <div className="empty-state">No transactions found</div>
            ) : (
              <table className="data-table compact">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, idx) => (
                    <tr key={tx.depositId || tx.withdrawId || idx}>
                      <td>{formatDateTime(tx.createdAt)}</td>
                      <td>
                        <span className={`type-badge ${tx.type.toLowerCase()}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className={tx.type === 'DEPOSIT' ? 'text-success' : 'text-danger'}>
                        {tx.type === 'DEPOSIT' ? '+' : '-'}${parseFloat(tx.amount || 0).toFixed(2)}
                      </td>
                      <td>
                        <span className={`status-badge ${tx.status?.toLowerCase()}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="mono small">{(tx.depositId || tx.withdrawId || '-').substring(0, 12)}...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );

      case 'BET HISTORY':
        const totalPages = Math.ceil(betHistoryTotal / BET_HISTORY_LIMIT);
        return (
          <div className="bet-history-section">
            {/* Summary stats */}
            <div className="bet-history-stats">
              <span>Total Records: <strong>{betHistoryTotal}</strong></span>
              <span>Showing: <strong>{betHistory.length}</strong> of {betHistoryTotal}</span>
            </div>

            {betHistory.length === 0 ? (
              <div className="empty-state">No bet history found</div>
            ) : (
              <>
                <table className="data-table compact">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Round ID</th>
                      <th>Game</th>
                      <th>Bet</th>
                      <th>Win</th>
                      <th>Balance After</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {betHistory.map((bet, idx) => {
                      const profit = (bet.winAmount || 0) - (bet.betAmount || 0);
                      return (
                        <tr key={bet.roundId || bet.id || idx}>
                          <td>{formatDateTime(bet.createdAt)}</td>
                          <td className="mono small" title={bet.roundId}>{(bet.roundId || '-').substring(0, 12)}...</td>
                          <td>{bet.gameSlug || '-'}</td>
                          <td>${parseFloat(bet.betAmount || 0).toFixed(2)}</td>
                          <td className={bet.winAmount > 0 ? 'text-success' : ''}>
                            ${parseFloat(bet.winAmount || 0).toFixed(2)}
                          </td>
                          <td>${parseFloat(bet.balanceAfter || 0).toFixed(2)}</td>
                          <td>
                            <span className={`status-badge ${bet.status?.toLowerCase()}`}>
                              {bet.status || 'SETTLED'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      className="pagination-btn"
                      onClick={() => handleBetHistoryPageChange(betHistoryPage - 1)}
                      disabled={betHistoryPage === 0}
                    >
                      <FiChevronLeft /> Previous
                    </button>
                    <span className="pagination-info">
                      Page {betHistoryPage + 1} of {totalPages}
                    </span>
                    <button
                      className="pagination-btn"
                      onClick={() => handleBetHistoryPageChange(betHistoryPage + 1)}
                      disabled={betHistoryPage >= totalPages - 1}
                    >
                      Next <FiChevronRight />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 'COMMISSION':
        return (
          <div className="commission-section">
            {/* Summary Cards */}
            <div className="commission-summary">
              <div className="summary-card pending">
                <label>Pending Commission</label>
                <span className="amount">${pendingCommissionTotal.toFixed(2)}</span>
              </div>
              <div className="summary-card referrals">
                <label>Total Referrals</label>
                <span className="count">{referrals.length}</span>
              </div>
              {referredBy && (
                <div className="summary-card referred-by">
                  <label>Referred By</label>
                  <span className="referrer-id">{referredBy.principalAccountId?.substring(0, 15)}...</span>
                </div>
              )}
            </div>

            {/* Filter Controls */}
            <div className="commission-filters">
              <select
                value={commissionFilter.status}
                onChange={(e) => setCommissionFilter({ ...commissionFilter, status: e.target.value })}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="CREDITED">Credited</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <select
                value={commissionFilter.type}
                onChange={(e) => setCommissionFilter({ ...commissionFilter, type: e.target.value })}
                className="filter-select"
              >
                <option value="">All Types</option>
                <option value="DEPOSIT">Deposit</option>
                <option value="PLAY">Play/Bet</option>
              </select>
            </div>

            {/* Referrals Section */}
            {referrals.length > 0 && (
              <div className="referrals-section">
                <h4>Referred Players ({referrals.length})</h4>
                <table className="data-table compact">
                  <thead>
                    <tr>
                      <th>Referred Account</th>
                      <th>Code</th>
                      <th>Deposit Rate</th>
                      <th>Play Rate</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((ref, idx) => (
                      <tr key={ref.id || idx}>
                        <td className="mono small">{ref.referredAccountId?.substring(0, 15)}...</td>
                        <td>{ref.referralCode || '-'}</td>
                        <td>{((ref.depositCommissionRate || 0) * 100).toFixed(1)}%</td>
                        <td>{((ref.playCommissionRate || 0) * 100).toFixed(1)}%</td>
                        <td>
                          <span className={`status-badge ${ref.isActive ? 'active' : 'inactive'}`}>
                            {ref.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Commission Earnings */}
            <div className="earnings-section">
              <h4>Commission Earnings ({commissions.length})</h4>
              {commissions.length === 0 ? (
                <div className="empty-state">No commission earnings found</div>
              ) : (
                <table className="data-table compact">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Referred Account</th>
                      <th>Source Amount</th>
                      <th>Rate</th>
                      <th>Commission</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((comm, idx) => (
                      <tr key={comm.id || idx}>
                        <td>{formatDateTime(comm.createdAt)}</td>
                        <td>
                          <span className={`type-badge ${comm.commissionType?.toLowerCase()}`}>
                            {comm.commissionType || 'PLAY'}
                          </span>
                        </td>
                        <td className="mono small">{comm.referredAccountId?.substring(0, 12)}...</td>
                        <td>${parseFloat(comm.sourceAmount || 0).toFixed(2)}</td>
                        <td>{((comm.commissionRate || 0) * 100).toFixed(1)}%</td>
                        <td className="text-success">+${parseFloat(comm.commissionAmount || 0).toFixed(2)}</td>
                        <td>
                          <span className={`status-badge ${comm.status?.toLowerCase()}`}>
                            {comm.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );

      case 'CREDIT':
        return (
          <div className="credit-section">
            <div className="empty-state">Credit management coming soon</div>
          </div>
        );

      case 'SETTING':
        return (
          <div className="setting-section">
            <div className="empty-state">User settings coming soon</div>
          </div>
        );

      case 'CHAT':
        return (
          <div className="chat-section">
            <div className="empty-state">Chat history coming soon</div>
          </div>
        );

      case 'PROBLEM':
        return (
          <div className="problem-section">
            <div className="empty-state">Problem reports coming soon</div>
          </div>
        );

      case 'GAME':
        return (
          <div className="game-section">
            <div className="empty-state">Game activity coming soon</div>
          </div>
        );

      case 'IP':
        return (
          <div className="ip-section">
            <div className="empty-state">IP history coming soon</div>
          </div>
        );

      case 'SIMILARITY':
        return (
          <div className="similarity-section">
            <div className="empty-state">Similar accounts coming soon</div>
          </div>
        );

      case 'USER TAG':
        return (
          <div className="tag-section">
            <div className="empty-state">User tags coming soon</div>
          </div>
        );

      case 'LOG':
        return (
          <div className="log-section">
            <div className="empty-state">Activity log coming soon</div>
          </div>
        );

      default:
        return <div className="empty-state">Select a tab</div>;
    }
  };

  return (
    <div className="user-details-overlay" onClick={onClose}>
      <div className="user-details-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="user-details-header">
          <div className="user-info">
            <span className="user-name">
              <FiUser className="icon" />
              {user.name || 'Unknown User'}
            </span>
            <span className="user-id" onClick={copyAccountId} title="Click to copy">
              {user.accountId}
              {copied ? <FiCheck className="copy-icon success" /> : <FiCopy className="copy-icon" />}
            </span>
            <span className="user-phone">
              <FiPhone className="icon" />
              {user.mobile || '-'}
            </span>
            <span className="user-datetime">
              <FiCalendar className="icon" />
              {user.date || formatDateTime(user.createdAt)}
            </span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        {/* Divider */}
        <div className="header-divider"></div>

        {/* Tabs */}
        <div className="user-details-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="user-details-content">
          {renderTabContent()}
        </div>
      </div>

      <style>{`
        .user-details-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          backdrop-filter: blur(2px);
        }

        .user-details-modal {
          background: #fff;
          border-radius: 12px;
          width: 100%;
          max-width: 1000px;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
        }

        .user-details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: #fff;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        .user-info .icon {
          margin-right: 6px;
          opacity: 0.7;
        }

        .user-name {
          font-size: 18px;
          font-weight: 600;
          display: flex;
          align-items: center;
        }

        .user-id {
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 13px;
          background: rgba(255, 255, 255, 0.15);
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.2s;
        }

        .user-id:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        .copy-icon {
          width: 14px;
          height: 14px;
          opacity: 0.7;
        }

        .copy-icon.success {
          color: #4ade80;
          opacity: 1;
        }

        .user-phone, .user-datetime {
          font-size: 14px;
          opacity: 0.9;
          display: flex;
          align-items: center;
        }

        .close-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #fff;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .header-divider {
          height: 1px;
          background: #e5e7eb;
        }

        .user-details-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding: 12px 16px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .tab-btn {
          padding: 8px 14px;
          border: none;
          background: #fff;
          color: #374151;
          font-size: 12px;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid #e5e7eb;
        }

        .tab-btn:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        .tab-btn.active {
          background: #1a1a2e;
          color: #fff;
          border-color: #1a1a2e;
        }

        .user-details-content {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
          min-height: 400px;
        }

        .tab-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: #6b7280;
          gap: 12px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top-color: #1a1a2e;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #9ca3af;
          font-size: 14px;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .detail-item label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          font-weight: 500;
        }

        .detail-item span {
          font-size: 15px;
          color: #111827;
        }

        .detail-item .mono {
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 13px;
          background: #f3f4f6;
          padding: 8px 12px;
          border-radius: 6px;
          word-break: break-all;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.active, .status-badge.completed, .status-badge.approved, .status-badge.credited {
          background: #dcfce7;
          color: #166534;
        }

        .status-badge.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .status-badge.inactive, .status-badge.rejected, .status-badge.failed {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-badge.suspended {
          background: #fecaca;
          color: #991b1b;
        }

        .type-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .type-badge.deposit {
          background: #dcfce7;
          color: #166534;
        }

        .type-badge.withdrawal {
          background: #fed7aa;
          color: #9a3412;
        }

        .type-badge.deposit {
          background: #dcfce7;
          color: #166534;
        }

        .type-badge.play {
          background: #e0e7ff;
          color: #3730a3;
        }

        .status-badge.settled {
          background: #dcfce7;
          color: #166534;
        }

        .status-badge.open {
          background: #fef3c7;
          color: #92400e;
        }

        .status-badge.cancelled {
          background: #fee2e2;
          color: #991b1b;
        }

        /* Commission Section Styles */
        .commission-section {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .commission-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }

        .summary-card {
          padding: 20px;
          border-radius: 10px;
          text-align: center;
        }

        .summary-card label {
          display: block;
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .summary-card.pending {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        }

        .summary-card.pending .amount {
          font-size: 28px;
          font-weight: 700;
          color: #92400e;
        }

        .summary-card.referrals {
          background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
        }

        .summary-card.referrals .count {
          font-size: 28px;
          font-weight: 700;
          color: #3730a3;
        }

        .summary-card.referred-by {
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
        }

        .summary-card.referred-by .referrer-id {
          font-size: 14px;
          font-weight: 600;
          color: #166534;
          font-family: 'Monaco', 'Consolas', monospace;
        }

        .commission-filters {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .filter-select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 13px;
          background: #fff;
          min-width: 140px;
        }

        .referrals-section,
        .earnings-section {
          background: #f9fafb;
          padding: 16px;
          border-radius: 8px;
        }

        .referrals-section h4,
        .earnings-section h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #374151;
        }

        .wallet-section {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .wallet-balance {
          text-align: center;
          padding: 32px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 12px;
          color: #fff;
        }

        .wallet-balance label {
          display: block;
          font-size: 14px;
          opacity: 0.8;
          margin-bottom: 8px;
        }

        .balance-amount {
          font-size: 42px;
          font-weight: 700;
        }

        .wallet-details {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }

        .data-table.compact {
          font-size: 13px;
        }

        .data-table.compact th,
        .data-table.compact td {
          padding: 10px 12px;
        }

        .text-success {
          color: #16a34a;
          font-weight: 500;
        }

        .text-danger {
          color: #dc2626;
          font-weight: 500;
        }

        .mono {
          font-family: 'Monaco', 'Consolas', monospace;
        }

        .small {
          font-size: 11px;
        }

        .bet-history-stats {
          display: flex;
          justify-content: space-between;
          padding: 12px 16px;
          background: #f9fafb;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 13px;
          color: #6b7280;
        }

        .bet-history-stats strong {
          color: #111827;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .pagination-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(:disabled) {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-info {
          font-size: 13px;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .user-details-modal {
            max-height: 100vh;
            border-radius: 0;
          }

          .user-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .user-details-tabs {
            padding: 10px;
          }

          .tab-btn {
            padding: 6px 10px;
            font-size: 11px;
          }

          .details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default UserDetailsModal;
