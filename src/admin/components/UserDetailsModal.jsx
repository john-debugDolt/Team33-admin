import { useState, useEffect } from 'react';
import { FiX, FiUser, FiPhone, FiCalendar, FiCopy, FiCheck } from 'react-icons/fi';
import { formatDateTime } from '../utils/dateUtils';
import {
  getWallet,
  getDepositsForAccount,
  getWithdrawalsForAccount,
  getBetHistory,
  getCommissionEarnings,
  getReferralsByPrincipal
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
  const [commissions, setCommissions] = useState([]);
  const [copied, setCopied] = useState(false);

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
            const betResult = await getBetHistory(user.accountId, { limit: 50, offset: 0 });
            if (betResult.success) {
              setBetHistory(Array.isArray(betResult.data) ? betResult.data : []);
            }
            break;

          case 'COMMISSION':
            const commResult = await getCommissionEarnings(user.accountId);
            if (commResult.success) {
              setCommissions(Array.isArray(commResult.data) ? commResult.data : []);
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
        return (
          <div className="bet-history-section">
            {betHistory.length === 0 ? (
              <div className="empty-state">No bet history found</div>
            ) : (
              <table className="data-table compact">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Game</th>
                    <th>Bet Amount</th>
                    <th>Win/Loss</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {betHistory.map((bet, idx) => (
                    <tr key={bet.betId || idx}>
                      <td>{formatDateTime(bet.createdAt)}</td>
                      <td>{bet.gameName || bet.gameType || '-'}</td>
                      <td>${parseFloat(bet.betAmount || 0).toFixed(2)}</td>
                      <td className={bet.winAmount > 0 ? 'text-success' : 'text-danger'}>
                        {bet.winAmount > 0 ? '+' : ''}${parseFloat(bet.winAmount || 0).toFixed(2)}
                      </td>
                      <td>
                        <span className={`status-badge ${bet.status?.toLowerCase()}`}>
                          {bet.status || 'COMPLETED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );

      case 'COMMISSION':
        return (
          <div className="commission-section">
            {commissions.length === 0 ? (
              <div className="empty-state">No commission records found</div>
            ) : (
              <table className="data-table compact">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((comm, idx) => (
                    <tr key={comm.commissionId || idx}>
                      <td>{formatDateTime(comm.createdAt)}</td>
                      <td>{comm.type || 'BET'}</td>
                      <td className="text-success">+${parseFloat(comm.amount || 0).toFixed(2)}</td>
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
