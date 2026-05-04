import { useState, useEffect, Fragment } from 'react';
import { FiX, FiUser, FiPhone, FiCalendar, FiCopy, FiCheck, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { formatDateTime } from '../utils/dateUtils';
import {
  getWallet,
  getDepositsForAccount,
  getWithdrawalsForAccount,
  getBetHistory,
  getBetHistoryCount,
  getBetHistoryProviders,
  getBetHistoryByProvider,
  getBetHistoryByProviderCount,
  getBetHistorySummary,
  getTransferHistoryByProvider,
  getTransferHistorySummary,
  getCommissionEarnings,
  getPendingCommissionTotal,
  getReferralsByPrincipal,
  getReferralByReferred,
  getChatsForAccount,
  getChatMessages,
  getAccountIp,
  getAccountDetails,
  creditPendingCommissions
} from '../../services/apiService';

/**
 * UserDetailsModal Component
 * Shows comprehensive user details with tabbed navigation
 * Displays when user clicks on an Account ID
 *
 * Props:
 * - user: Full user object (optional if accountId is provided)
 * - accountId: Account ID string (optional if user is provided)
 * - onClose: Function to close the modal
 */
const UserDetailsModal = ({ user: userProp, accountId: accountIdProp, onClose }) => {
  // Active tab state
  const [activeTab, setActiveTab] = useState('DETAILS');

  // User state - can be passed as prop or fetched
  const [user, setUser] = useState(userProp || null);
  const [userLoading, setUserLoading] = useState(!userProp && !!accountIdProp);

  // Data states for each tab
  const [loading, setLoading] = useState(false);

  // Fetch user details if only accountId is provided
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (userProp) {
        setUser(userProp);
        setUserLoading(false);
        return;
      }

      if (!accountIdProp) {
        setUserLoading(false);
        return;
      }

      setUserLoading(true);
      try {
        const result = await getAccountDetails(accountIdProp);
        if (result.success && result.data) {
          setUser(result.data);
        } else {
          // Create minimal user object from accountId
          setUser({
            accountId: accountIdProp,
            firstName: 'Unknown',
            lastName: 'User',
            email: '-',
            phone: '-',
          });
        }
      } catch (err) {
        console.error('Error fetching user details:', err);
        // Create minimal user object from accountId
        setUser({
          accountId: accountIdProp,
          firstName: 'Unknown',
          lastName: 'User',
          email: '-',
          phone: '-',
        });
      } finally {
        setUserLoading(false);
      }
    };

    fetchUserDetails();
  }, [userProp, accountIdProp]);

  const [walletData, setWalletData] = useState(null);
  const [transactions, setTransactions] = useState([]);

  // ===== Bet History v2 (admin-service) =====
  const [betProviders, setBetProviders] = useState([]); // ['richgaming','uuslot',...]
  const [betProvider, setBetProvider] = useState('');   // selected provider, '' = overview
  const [betSummary, setBetSummary] = useState(null);   // /summary/{accountId} response
  const [betRows, setBetRows] = useState([]);           // raw callback rows for selected provider
  const [betRowsTotal, setBetRowsTotal] = useState(0);
  const [betFilterCallback, setBetFilterCallback] = useState(''); // BET / RESULT / ROLLBACK / ...
  const [betFilterStatus, setBetFilterStatus] = useState('');     // COMPLETED / PENDING / FAILED
  const [betViewMode, setBetViewMode] = useState('rounds');       // 'rounds' or 'raw'
  const [betExpandedId, setBetExpandedId] = useState(null);
  const [betPage, setBetPage] = useState(0);
  const [transferRows, setTransferRows] = useState({ jdb: [], scr888h5: [] }); // for transfer-wallet section

  // Legacy state still used by the old wallet-service fetch (kept until removed)
  const [betHistory, setBetHistory] = useState([]);
  const [betHistoryTotal, setBetHistoryTotal] = useState(0);
  const [betHistoryPage, setBetHistoryPage] = useState(0);
  const [commissions, setCommissions] = useState([]);
  const [pendingCommissionTotal, setPendingCommissionTotal] = useState(0);
  const [pendingCommissions, setPendingCommissions] = useState([]);
  const [creditingCommission, setCreditingCommission] = useState(false);
  const [showCreditConfirm, setShowCreditConfirm] = useState(false);
  const [referrals, setReferrals] = useState([]);
  const [referredBy, setReferredBy] = useState(null);
  const [commissionFilter, setCommissionFilter] = useState({ status: '', type: '' });
  const [copied, setCopied] = useState(false);

  // Chat state
  const [chatSessions, setChatSessions] = useState([]);
  const [selectedChatSession, setSelectedChatSession] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // IP state
  const [ipData, setIpData] = useState(null);
  const [accountDetails, setAccountDetails] = useState(null);

  // Logs state (combined view)
  const [logs, setLogs] = useState([]);

  // Pagination settings
  const BET_HISTORY_LIMIT = 20;
  const BET_SUMMARY_LIMIT = 5;
  const TRANSFER_WALLET_PROVIDERS = ['jdb', 'scr888h5'];

  // Pair raw BET → RESULT callbacks into rounds (per backend integration guide §3)
  const pairRoundsFromCallbacks = (rows) => {
    const bets = new Map();
    const results = new Map();
    rows.forEach((r) => {
      if (r.callbackType === 'BET') bets.set(r.providerTxId, r);
      else if (r.callbackType === 'RESULT' && r.relatedTxId) results.set(r.relatedTxId, r);
    });

    return [...bets.values()]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .map((bet) => {
        const result = results.get(bet.providerTxId) || null;
        const betAmt = Number(bet.amount) || 0;
        const winAmt = result ? (Number(result.amount) || 0) : 0;
        return {
          roundId: bet.providerTxId,
          playedAt: bet.createdAt,
          bet: betAmt,
          win: winAmt,
          netPL: winAmt - betAmt,
          balanceBefore: Number(bet.balanceBefore) || 0,
          balanceAfter: result ? (Number(result.balanceAfter) || 0) : (Number(bet.balanceAfter) || 0),
          outcome: winAmt > betAmt ? 'win' : winAmt > 0 ? 'partial' : 'loss',
          settled: Boolean(result),
          status: bet.status,
          betRow: bet,
          resultRow: result,
        };
      });
  };

  const fmtMoney = (n) => `$${(Number(n) || 0).toFixed(2)}`;
  const shortId = (id, n = 12) => (id ? String(id).slice(0, n) + (String(id).length > n ? '…' : '') : '-');

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

  // Load messages for a selected chat session
  const loadChatMessages = async (session) => {
    setSelectedChatSession(session);
    setLoadingMessages(true);
    setChatMessages([]);

    try {
      const result = await getChatMessages(session.sessionId || session.id);
      if (result.success) {
        setChatMessages(Array.isArray(result.data) ? result.data : []);
      }
    } catch (err) {
      console.error('Error loading chat messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Fetch data when tab changes
  useEffect(() => {
    const fetchTabData = async () => {
      // Don't fetch if user is not loaded yet
      if (!user || !user.accountId) {
        return;
      }

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

          case 'BET HISTORY': {
            // Load provider list once, summary always; per-provider rows only when one is selected.
            const tasks = [];

            if (betProviders.length === 0) {
              tasks.push(
                getBetHistoryProviders().then((r) => {
                  if (r.success) setBetProviders(r.data?.providers || []);
                })
              );
            }

            // Cross-provider snapshot (drives the Overview header + per-provider totals)
            tasks.push(
              getBetHistorySummary(user.accountId, {
                limit: BET_SUMMARY_LIMIT,
                ...(betFilterCallback ? { callbackType: betFilterCallback } : {}),
                ...(betFilterStatus ? { status: betFilterStatus } : {}),
              }).then((r) => {
                if (r.success) setBetSummary(r.data || null);
              })
            );

            // Transfer-wallet snapshot in parallel
            tasks.push(
              getTransferHistorySummary(user.accountId, { limit: BET_SUMMARY_LIMIT }).then((r) => {
                if (r.success && r.data) {
                  setTransferRows({
                    jdb: r.data.jdb?.rows || [],
                    scr888h5: r.data.scr888h5?.rows || [],
                  });
                }
              })
            );

            // Selected provider — paginated rows + count
            if (betProvider) {
              const isTransfer = TRANSFER_WALLET_PROVIDERS.includes(betProvider);
              const filterParams = {
                ...(betFilterStatus ? { status: betFilterStatus } : {}),
                ...(!isTransfer && betFilterCallback ? { callbackType: betFilterCallback } : {}),
                limit: BET_HISTORY_LIMIT,
                offset: betPage * BET_HISTORY_LIMIT,
              };

              const listFn = isTransfer ? getTransferHistoryByProvider : getBetHistoryByProvider;
              const countFn = isTransfer
                ? null // transfer-history count endpoint exists per provider but is not strictly needed for the snapshot view
                : getBetHistoryByProviderCount;

              tasks.push(
                listFn(betProvider, user.accountId, filterParams).then((r) => {
                  setBetRows(r.success && Array.isArray(r.data) ? r.data : []);
                })
              );

              if (countFn) {
                const countParams = {
                  ...(betFilterStatus ? { status: betFilterStatus } : {}),
                  ...(betFilterCallback ? { callbackType: betFilterCallback } : {}),
                };
                tasks.push(
                  countFn(betProvider, user.accountId, countParams).then((r) => {
                    setBetRowsTotal(r.success ? (r.data?.count ?? 0) : 0);
                  })
                );
              } else {
                setBetRowsTotal(0);
              }
            } else {
              // Overview-only view — clear per-provider rows
              setBetRows([]);
              setBetRowsTotal(0);
            }

            await Promise.all(tasks);
            break;
          }

          case 'COMMISSION':
            // Fetch commission earnings, pending total, referrals, and referrer
            // Note: getReferralByReferred returns 404 if user wasn't referred - this is expected
            console.log('[COMMISSION] Fetching for account:', user.accountId, 'with filter:', commissionFilter);
            const [commResult, pendingResult, referralsResult] = await Promise.all([
              getCommissionEarnings(user.accountId, {}), // Don't pass filter to get ALL earnings
              getPendingCommissionTotal(user.accountId),
              getReferralsByPrincipal(user.accountId)
            ]);

            // Fetch referrer separately to handle 404 gracefully (user may not have a referrer)
            const referredByResult = await getReferralByReferred(user.accountId).catch(() => ({ success: false }));

            console.log('[COMMISSION] Raw API response:', commResult);
            if (commResult.success) {
              // Handle different API response structures
              let earningsData = commResult.data;
              console.log('[COMMISSION] commResult.data type:', typeof earningsData, earningsData);
              // If data is an object with earnings array, extract it
              if (earningsData && !Array.isArray(earningsData) && earningsData.earnings) {
                earningsData = earningsData.earnings;
              }
              // If data is an object with content array (paginated), extract it
              if (earningsData && !Array.isArray(earningsData) && earningsData.content) {
                earningsData = earningsData.content;
              }
              // If data is an object with data array, extract it
              if (earningsData && !Array.isArray(earningsData) && earningsData.data) {
                earningsData = earningsData.data;
              }
              console.log('[COMMISSION] Earnings data:', earningsData);
              setCommissions(Array.isArray(earningsData) ? earningsData : []);
            } else {
              console.log('[COMMISSION] API call failed:', commResult.error);
            }
            if (pendingResult.success) {
              // Handle different response structures for pending total
              const pendingData = pendingResult.data;
              const pendingAmount = pendingData?.pendingTotal ?? pendingData?.total ?? pendingData ?? 0;
              console.log('[COMMISSION] Pending total:', pendingAmount);
              setPendingCommissionTotal(typeof pendingAmount === 'number' ? pendingAmount : 0);
            }
            if (referralsResult.success) {
              let referralsData = referralsResult.data;
              if (referralsData && !Array.isArray(referralsData) && referralsData.referrals) {
                referralsData = referralsData.referrals;
              }
              setReferrals(Array.isArray(referralsData) ? referralsData : []);
            }
            if (referredByResult.success && referredByResult.data) {
              setReferredBy(referredByResult.data);
            } else {
              setReferredBy(null); // User was not referred by anyone
            }
            break;

          case 'CREDIT':
            // Fetch all commission earnings for this user then filter to PENDING
            console.log('[CREDIT] Fetching commissions for:', user.accountId);
            const creditCommResult = await getCommissionEarnings(user.accountId, {});
            const creditPendingResult = await getPendingCommissionTotal(user.accountId);

            console.log('[CREDIT] Commission result:', creditCommResult);
            console.log('[CREDIT] Pending result:', creditPendingResult);

            if (creditCommResult.success) {
              const allCommissions = Array.isArray(creditCommResult.data) ? creditCommResult.data : [];
              // Filter only PENDING commissions
              const pending = allCommissions.filter(c => c.status === 'PENDING');
              console.log('[CREDIT] Pending commissions:', pending);
              setPendingCommissions(pending);
            }
            if (creditPendingResult.success) {
              const pendingTotal = creditPendingResult.data?.pendingTotal ?? creditPendingResult.data ?? 0;
              console.log('[CREDIT] Pending total:', pendingTotal);
              setPendingCommissionTotal(typeof pendingTotal === 'number' ? pendingTotal : 0);
            }
            break;

          case 'CHAT':
            // Fetch chat sessions for this account
            const chatResult = await getChatsForAccount(user.accountId);
            if (chatResult.success) {
              setChatSessions(Array.isArray(chatResult.data) ? chatResult.data : []);
            }
            break;

          case 'IP':
            // Fetch IP and account details
            const [ipResult, detailsResult] = await Promise.all([
              getAccountIp(user.accountId),
              getAccountDetails(user.accountId)
            ]);

            if (ipResult.success) {
              setIpData(ipResult.data);
            }
            if (detailsResult.success) {
              setAccountDetails(detailsResult.data);
            }
            break;

          case 'LOG':
            // Fetch all data for combined log view
            const [logDeposits, logWithdrawals, logBets, logChats] = await Promise.all([
              getDepositsForAccount(user.accountId),
              getWithdrawalsForAccount(user.accountId),
              getBetHistory(user.accountId, { limit: 50, offset: 0 }),
              getChatsForAccount(user.accountId)
            ]);

            const allLogs = [];

            // Add deposits
            if (logDeposits.success && Array.isArray(logDeposits.data)) {
              logDeposits.data.forEach(d => {
                allLogs.push({
                  type: 'DEPOSIT',
                  date: d.createdAt,
                  description: `Deposit of $${parseFloat(d.amount || 0).toFixed(2)}`,
                  status: d.status,
                  id: d.depositId,
                  amount: d.amount
                });
              });
            }

            // Add withdrawals
            if (logWithdrawals.success && Array.isArray(logWithdrawals.data)) {
              logWithdrawals.data.forEach(w => {
                allLogs.push({
                  type: 'WITHDRAWAL',
                  date: w.createdAt,
                  description: `Withdrawal of $${parseFloat(w.amount || 0).toFixed(2)}`,
                  status: w.status,
                  id: w.withdrawId,
                  amount: w.amount
                });
              });
            }

            // Add bet history
            if (logBets.success && Array.isArray(logBets.data)) {
              logBets.data.forEach(b => {
                const profit = (b.winAmount || 0) - (b.betAmount || 0);
                allLogs.push({
                  type: 'BET',
                  date: b.createdAt,
                  description: `${b.gameSlug || 'Game'} - Bet: $${parseFloat(b.betAmount || 0).toFixed(2)}, Win: $${parseFloat(b.winAmount || 0).toFixed(2)}`,
                  status: b.status,
                  id: b.roundId,
                  profit: profit
                });
              });
            }

            // Add chats
            if (logChats.success && Array.isArray(logChats.data)) {
              logChats.data.forEach(c => {
                allLogs.push({
                  type: 'CHAT',
                  date: c.createdAt || c.startedAt,
                  description: `Chat session ${c.status === 'CLOSED' ? 'closed' : 'started'}`,
                  status: c.status,
                  id: c.sessionId
                });
              });
            }

            // Sort by date (newest first)
            allLogs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
            setLogs(allLogs);
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
  }, [activeTab, user?.accountId, betProvider, betFilterCallback, betFilterStatus, betPage]);

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

      case 'BET HISTORY': {
        const isTransfer = TRANSFER_WALLET_PROVIDERS.includes(betProvider);
        const totalPages = Math.max(1, Math.ceil(betRowsTotal / BET_HISTORY_LIMIT));
        const grandTotal = betSummary?.grandTotal ?? 0;
        const overviewProviders = betProviders.filter((p) => betSummary?.[p]);
        const rounds = !isTransfer && betViewMode === 'rounds' ? pairRoundsFromCallbacks(betRows) : [];
        const transferHasRows = transferRows.jdb.length > 0 || transferRows.scr888h5.length > 0;

        const renderRawRow = (row) => {
          const isExpanded = betExpandedId === row.id;
          const failedClass = row.status === 'FAILED' ? 'row-failed' : '';
          const reversal = row.callbackType === 'ROLLBACK' || row.callbackType === 'CANCEL_BETNSETTLE';
          return (
            <Fragment key={row.id}>
              <tr
                className={`bh-row ${failedClass} ${reversal ? 'row-reversal' : ''}`}
                onClick={() => setBetExpandedId(isExpanded ? null : row.id)}
              >
                <td>{formatDateTime(row.createdAt)}</td>
                <td><span className={`bh-cb-badge cb-${row.callbackType?.toLowerCase()}`}>{row.callbackType}</span></td>
                <td className="mono small" title={row.providerTxId}>{shortId(row.providerTxId)}</td>
                <td className="mono small" title={row.relatedTxId || ''}>{row.relatedTxId ? shortId(row.relatedTxId) : '-'}</td>
                <td>{fmtMoney(row.amount)}</td>
                <td>{fmtMoney(row.balanceBefore)} → {fmtMoney(row.balanceAfter)}</td>
                <td>
                  <span className={`status-badge ${row.status?.toLowerCase()}`} title={row.lastError || ''}>
                    {row.status === 'COMPLETED' ? '✓' : row.status === 'PENDING' ? '⏳' : '✗'} {row.status}
                  </span>
                </td>
              </tr>
              {isExpanded && (
                <tr className="bh-row-detail">
                  <td colSpan={7}>
                    <div className="bh-detail-grid">
                      <div><label>Internal ID</label><span className="mono">{row.id}</span></div>
                      <div><label>Wallet Tx ID</label><span className="mono">{row.walletTxId ?? '—'}</span></div>
                      <div><label>Response</label><span>{row.responseStatus} · {row.responseDescription}</span></div>
                      <div><label>Updated</label><span>{formatDateTime(row.updatedAt)}</span></div>
                      {row.lastError && (
                        <div className="bh-detail-error"><label>Last Error</label><span>{row.lastError}</span></div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        };

        const renderTransferRow = (row) => (
          <tr key={row.id} className={`bh-row ${row.status === 'FAILED' ? 'row-failed' : ''}`}>
            <td>{formatDateTime(row.createdAt)}</td>
            <td>
              <span className={`bh-cb-badge cb-${(row.direction || '').toLowerCase()}`}>
                {row.direction === 'DEPOSIT' ? '↗ DEPOSIT' : row.direction === 'WITHDRAW' ? '↙ WITHDRAW' : row.direction}
              </span>
            </td>
            <td className="mono small">{shortId(row.providerTxId || row.id)}</td>
            <td>{fmtMoney(row.amount)}</td>
            <td>{fmtMoney(row.balanceBefore)} → {fmtMoney(row.balanceAfter)}</td>
            <td>
              <span className={`status-badge ${row.status?.toLowerCase()}`} title={row.lastError || ''}>
                {row.status}
              </span>
            </td>
          </tr>
        );

        return (
          <div className="bet-history-section bh-v2">
            {/* ===== Overview header — provider chips + grand total ===== */}
            <div className="bh-overview">
              <div className="bh-overview-header">
                <div>
                  <h3>Activity Overview</h3>
                  <span className="bh-grand">{grandTotal.toLocaleString()} callbacks across all providers</span>
                </div>
                <div className="bh-overview-actions">
                  <select
                    className="bh-select"
                    value={betFilterCallback}
                    onChange={(e) => { setBetFilterCallback(e.target.value); setBetPage(0); }}
                  >
                    <option value="">All event types</option>
                    <option value="BET">BET</option>
                    <option value="RESULT">RESULT</option>
                    <option value="ROLLBACK">ROLLBACK</option>
                    <option value="BONUS">BONUS</option>
                    <option value="JACKPOT">JACKPOT</option>
                    <option value="BETNSETTLE">BETNSETTLE</option>
                    <option value="CANCEL_BETNSETTLE">CANCEL_BETNSETTLE</option>
                  </select>
                  <select
                    className="bh-select"
                    value={betFilterStatus}
                    onChange={(e) => { setBetFilterStatus(e.target.value); setBetPage(0); }}
                  >
                    <option value="">All statuses</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PENDING">Pending</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>
              </div>

              <div className="bh-provider-grid">
                {overviewProviders.map((p) => {
                  const total = betSummary[p]?.total ?? 0;
                  const isActive = betProvider === p;
                  return (
                    <button
                      key={p}
                      className={`bh-provider-chip ${total === 0 ? 'empty' : ''} ${isActive ? 'active' : ''}`}
                      onClick={() => { setBetProvider(isActive ? '' : p); setBetPage(0); setBetExpandedId(null); }}
                    >
                      <span className="bh-chip-name">{p}</span>
                      <span className="bh-chip-count">{total.toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>

              {/* Transfer-wallet section */}
              {transferHasRows && (
                <div className="bh-transfer-strip">
                  <span className="bh-transfer-label">Transfer wallets:</span>
                  <button
                    className={`bh-provider-chip ${transferRows.jdb.length === 0 ? 'empty' : ''} ${betProvider === 'jdb' ? 'active' : ''}`}
                    onClick={() => { setBetProvider(betProvider === 'jdb' ? '' : 'jdb'); setBetPage(0); }}
                  >
                    <span className="bh-chip-name">jdb</span>
                    <span className="bh-chip-count">{transferRows.jdb.length}+</span>
                  </button>
                  <button
                    className={`bh-provider-chip ${transferRows.scr888h5.length === 0 ? 'empty' : ''} ${betProvider === 'scr888h5' ? 'active' : ''}`}
                    onClick={() => { setBetProvider(betProvider === 'scr888h5' ? '' : 'scr888h5'); setBetPage(0); }}
                  >
                    <span className="bh-chip-name">scr888h5</span>
                    <span className="bh-chip-count">{transferRows.scr888h5.length}+</span>
                  </button>
                </div>
              )}
            </div>

            {/* ===== Per-provider detail ===== */}
            {!betProvider ? (
              <div className="empty-state">Select a provider above to see their bet ledger.</div>
            ) : (
              <div className="bh-detail">
                <div className="bh-detail-header">
                  <h3>
                    <span className="bh-provider-name">{betProvider}</span>
                    <span className="bh-detail-count">{betRowsTotal.toLocaleString()} {isTransfer ? 'transfers' : 'callbacks'}</span>
                  </h3>
                  {!isTransfer && (
                    <div className="bh-view-toggle">
                      <button
                        className={`bh-toggle-btn ${betViewMode === 'rounds' ? 'active' : ''}`}
                        onClick={() => setBetViewMode('rounds')}
                      >
                        Rounds
                      </button>
                      <button
                        className={`bh-toggle-btn ${betViewMode === 'raw' ? 'active' : ''}`}
                        onClick={() => setBetViewMode('raw')}
                      >
                        Raw callbacks
                      </button>
                    </div>
                  )}
                </div>

                {betRows.length === 0 ? (
                  <div className="empty-state">No {isTransfer ? 'transfers' : 'callbacks'} for this provider with the current filters.</div>
                ) : isTransfer ? (
                  <table className="data-table compact bh-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Direction</th>
                        <th>Tx ID</th>
                        <th>Amount</th>
                        <th>Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>{betRows.map(renderTransferRow)}</tbody>
                  </table>
                ) : betViewMode === 'rounds' ? (
                  <table className="data-table compact bh-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Round ID</th>
                        <th>Bet</th>
                        <th>Win</th>
                        <th>P/L</th>
                        <th>Balance</th>
                        <th>Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rounds.map((r) => {
                        const isBigWin = r.win > r.bet * 5 && r.bet > 0;
                        const plClass = r.netPL > 0 ? 'text-success' : r.netPL < 0 ? 'text-danger' : '';
                        return (
                          <tr key={r.roundId} className={!r.settled ? 'row-pending' : ''}>
                            <td>{formatDateTime(r.playedAt)}</td>
                            <td className="mono small" title={r.roundId}>{shortId(r.roundId)}</td>
                            <td>{fmtMoney(r.bet)}</td>
                            <td className={r.win > 0 ? 'text-success' : ''}>
                              {fmtMoney(r.win)} {isBigWin && <span title="Big win!">🎰</span>}
                            </td>
                            <td className={plClass}>{r.netPL >= 0 ? '+' : ''}{fmtMoney(r.netPL)}</td>
                            <td className="bh-balance">{fmtMoney(r.balanceBefore)} → {fmtMoney(r.balanceAfter)}</td>
                            <td>
                              <span className={`bh-outcome out-${r.outcome}`}>
                                {r.settled ? r.outcome : 'pending'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table className="data-table compact bh-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Type</th>
                        <th>Tx ID</th>
                        <th>Related</th>
                        <th>Amount</th>
                        <th>Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>{betRows.map(renderRawRow)}</tbody>
                  </table>
                )}

                {/* Pagination */}
                {!isTransfer && totalPages > 1 && (
                  <div className="pagination">
                    <button
                      className="pagination-btn"
                      onClick={() => setBetPage(Math.max(0, betPage - 1))}
                      disabled={betPage === 0}
                    >
                      <FiChevronLeft /> Previous
                    </button>
                    <span className="pagination-info">
                      Page {betPage + 1} of {totalPages}
                    </span>
                    <button
                      className="pagination-btn"
                      onClick={() => setBetPage(betPage + 1)}
                      disabled={betPage >= totalPages - 1}
                    >
                      Next <FiChevronRight />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      case 'COMMISSION':
        // Calculate totals from commission data - handle both commissionAmount and amount field names
        const getCommAmount = (c) => parseFloat(c.commissionAmount || c.amount || 0);
        const totalEarnings = commissions.reduce((sum, c) => sum + getCommAmount(c), 0);
        const creditedTotal = commissions.filter(c => c.status === 'CREDITED').reduce((sum, c) => sum + getCommAmount(c), 0);
        const depositCommissions = commissions.filter(c => (c.commissionType || c.type) === 'DEPOSIT').reduce((sum, c) => sum + getCommAmount(c), 0);
        const playCommissions = commissions.filter(c => (c.commissionType || c.type) === 'PLAY').reduce((sum, c) => sum + getCommAmount(c), 0);

        return (
          <div className="commission-section">
            {/* Enhanced Summary Cards */}
            <div className="commission-summary-grid">
              <div className="summary-card total">
                <div className="card-icon">💰</div>
                <div className="card-content">
                  <label>Total Earnings</label>
                  <span className="amount">${totalEarnings.toFixed(2)}</span>
                </div>
              </div>
              <div className="summary-card pending">
                <div className="card-icon">⏳</div>
                <div className="card-content">
                  <label>Pending</label>
                  <span className="amount">${pendingCommissionTotal.toFixed(2)}</span>
                </div>
              </div>
              <div className="summary-card credited">
                <div className="card-icon">✅</div>
                <div className="card-content">
                  <label>Credited</label>
                  <span className="amount">${creditedTotal.toFixed(2)}</span>
                </div>
              </div>
              <div className="summary-card referrals">
                <div className="card-icon">👥</div>
                <div className="card-content">
                  <label>Total Referrals</label>
                  <span className="count">{referrals.length}</span>
                </div>
              </div>
              <div className="summary-card deposit-comm">
                <div className="card-icon">📥</div>
                <div className="card-content">
                  <label>Deposit Commission</label>
                  <span className="amount">${depositCommissions.toFixed(2)}</span>
                </div>
              </div>
              <div className="summary-card play-comm">
                <div className="card-icon">🎮</div>
                <div className="card-content">
                  <label>Play Commission</label>
                  <span className="amount">${playCommissions.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Referred By Info */}
            {referredBy && (
              <div className="referred-by-section">
                <h4>📌 Referred By</h4>
                <div className="referred-by-card">
                  <div className="referred-by-row">
                    <label>Referrer Account ID:</label>
                    <span className="mono">{referredBy.principalAccountId}</span>
                  </div>
                  <div className="referred-by-row">
                    <label>Referral Code Used:</label>
                    <span>{referredBy.referralCode || 'N/A'}</span>
                  </div>
                  <div className="referred-by-row">
                    <label>Deposit Rate:</label>
                    <span>{((referredBy.depositCommissionRate || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="referred-by-row">
                    <label>Play Rate:</label>
                    <span>{((referredBy.playCommissionRate || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="referred-by-row">
                    <label>Since:</label>
                    <span>{formatDateTime(referredBy.createdAt)}</span>
                  </div>
                </div>
              </div>
            )}

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

            {/* Referrals Section - Enhanced */}
            {referrals.length > 0 && (
              <div className="referrals-section">
                <h4>👥 Referred Players ({referrals.length})</h4>
                <table className="data-table compact">
                  <thead>
                    <tr>
                      <th>Referred Account ID</th>
                      <th>Referral Code</th>
                      <th>Deposit Rate</th>
                      <th>Max Deposits</th>
                      <th>Play Rate</th>
                      <th>Play Until</th>
                      <th>Created</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((ref, idx) => (
                      <tr key={ref.id || idx}>
                        <td className="mono" style={{fontSize: '11px'}}>{ref.referredAccountId}</td>
                        <td><code style={{background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px'}}>{ref.referralCode || '-'}</code></td>
                        <td style={{fontWeight: 600, color: '#16a34a'}}>{((ref.depositCommissionRate || 0) * 100).toFixed(1)}%</td>
                        <td>{ref.depositCommissionMaxCount || 1}</td>
                        <td style={{fontWeight: 600, color: '#2563eb'}}>{((ref.playCommissionRate || 0) * 100).toFixed(2)}%</td>
                        <td>{ref.playCommissionUntil ? formatDateTime(ref.playCommissionUntil) : 'Forever'}</td>
                        <td style={{fontSize: '11px', color: '#6b7280'}}>{formatDateTime(ref.createdAt)}</td>
                        <td>
                          <span className={`status-badge ${ref.isActive !== false ? 'active' : 'inactive'}`}>
                            {ref.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Commission Earnings - Enhanced */}
            <div className="earnings-section">
              <h4>💵 Commission Earnings ({commissions.length})</h4>
              {commissions.length === 0 ? (
                <div className="empty-state">No commission earnings found</div>
              ) : (
                <table className="data-table compact">
                  <thead>
                    <tr>
                      <th>Earning ID</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Referred Account</th>
                      <th>Source Txn</th>
                      <th>Source Amount</th>
                      <th>Rate</th>
                      <th>Commission</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((comm, idx) => (
                      <tr key={comm.id || comm.earningId || idx}>
                        <td className="mono" style={{fontSize: '10px', color: '#6b7280'}}>{String(comm.id || comm.earningId || '').slice(-12)}</td>
                        <td style={{fontSize: '11px'}}>{formatDateTime(comm.createdAt || comm.earnedAt)}</td>
                        <td>
                          <span className={`type-badge ${(comm.commissionType || comm.type || 'PLAY').toLowerCase()}`}>
                            {comm.commissionType || comm.type || 'PLAY'}
                          </span>
                        </td>
                        <td className="mono" style={{fontSize: '10px'}}>{comm.referredAccountId}</td>
                        <td className="mono" style={{fontSize: '10px', color: '#6b7280'}}>{String(comm.sourceTransactionId || comm.sourceReference || comm.transactionId || '-').slice(-10)}</td>
                        <td>${parseFloat(comm.sourceAmount || 0).toFixed(2)}</td>
                        <td style={{fontWeight: 500}}>{((comm.commissionRate || 0) * 100).toFixed(2)}%</td>
                        <td style={{fontWeight: 700, color: '#16a34a'}}>+${parseFloat(comm.commissionAmount || comm.amount || 0).toFixed(2)}</td>
                        <td>
                          <span className={`status-badge ${(comm.status || '').toLowerCase()}`}>
                            {comm.status || 'UNKNOWN'}
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
        const handleCreditAll = async () => {
          if (!user?.accountId) return;
          setShowCreditConfirm(false);
          setCreditingCommission(true);
          try {
            const result = await creditPendingCommissions(user.accountId);
            if (result.success) {
              alert('All pending commissions credited successfully!');
              // Refresh the pending commissions
              const refreshResult = await getCommissionEarnings(user.accountId, { status: 'PENDING' });
              if (refreshResult.success) {
                const allComm = Array.isArray(refreshResult.data) ? refreshResult.data : [];
                setPendingCommissions(allComm.filter(c => c.status === 'PENDING'));
              }
              const pendingRefresh = await getPendingCommissionTotal(user.accountId);
              if (pendingRefresh.success) {
                setPendingCommissionTotal(pendingRefresh.data?.pendingTotal || 0);
              }
            } else {
              alert(result.error || 'Failed to credit commissions');
            }
          } catch (err) {
            alert('Error crediting commissions: ' + err.message);
          } finally {
            setCreditingCommission(false);
          }
        };

        return (
          <div className="credit-section">
            {/* Pending Commission Summary */}
            <div className="credit-summary-card">
              <div className="credit-summary-header">
                <div className="credit-icon">💰</div>
                <div className="credit-info">
                  <h3>Pending Commission</h3>
                  <p className="credit-amount">${pendingCommissionTotal.toFixed(2)}</p>
                </div>
              </div>
              {pendingCommissions.length > 0 && (
                <button
                  className="credit-all-btn"
                  onClick={() => setShowCreditConfirm(true)}
                  disabled={creditingCommission}
                >
                  {creditingCommission ? 'Processing...' : `Credit All (${pendingCommissions.length} pending)`}
                </button>
              )}
            </div>

            {/* Confirmation Dialog */}
            {showCreditConfirm && (
              <div className="credit-confirm-overlay" onClick={() => setShowCreditConfirm(false)}>
                <div className="credit-confirm-dialog" onClick={(e) => e.stopPropagation()}>
                  <div className="confirm-icon">⚠️</div>
                  <h4>Confirm Credit Commission</h4>
                  <p>Are you sure you want to credit <strong>${pendingCommissionTotal.toFixed(2)}</strong> to this user's wallet?</p>
                  <p className="confirm-warning">This action will transfer all pending commissions to the user's wallet balance.</p>
                  <div className="confirm-actions">
                    <button className="btn-cancel" onClick={() => setShowCreditConfirm(false)}>Cancel</button>
                    <button className="btn-confirm" onClick={handleCreditAll}>Approve & Credit</button>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Commissions Table */}
            <div className="credit-table-section">
              <h4>Pending Commission Earnings ({pendingCommissions.length})</h4>
              {pendingCommissions.length === 0 ? (
                <div className="empty-state">No pending commissions for this user</div>
              ) : (
                <table className="credit-table">
                  <thead>
                    <tr>
                      <th>Earning ID</th>
                      <th>Type</th>
                      <th>From Account</th>
                      <th>Source Amount</th>
                      <th>Rate</th>
                      <th>Commission</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingCommissions.map((comm, idx) => (
                      <tr key={comm.earningId || comm.id || idx}>
                        <td className="mono">{String(comm.earningId || comm.id || '-').slice(-10)}</td>
                        <td>
                          <span className={`type-badge ${(comm.commissionType || comm.type || '').toLowerCase()}`}>
                            {comm.commissionType || comm.type || 'N/A'}
                          </span>
                        </td>
                        <td className="mono">{comm.referredAccountId ? `...${comm.referredAccountId.slice(-8)}` : '-'}</td>
                        <td>${parseFloat(comm.sourceAmount || 0).toFixed(2)}</td>
                        <td>{((comm.commissionRate || 0) * 100).toFixed(1)}%</td>
                        <td className="amount-cell">${parseFloat(comm.commissionAmount || 0).toFixed(2)}</td>
                        <td className="date-cell">{comm.createdAt ? new Date(comm.createdAt).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
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
            {/* Chat Sessions List */}
            <div className="chat-layout">
              <div className="chat-sessions-list">
                <h4>Chat Sessions ({chatSessions.length})</h4>
                {chatSessions.length === 0 ? (
                  <div className="empty-state small">No chat sessions found</div>
                ) : (
                  <div className="sessions-container">
                    {chatSessions.map((session, idx) => (
                      <div
                        key={session.sessionId || session.id || idx}
                        className={`session-item ${selectedChatSession?.sessionId === session.sessionId || selectedChatSession?.id === session.id ? 'active' : ''}`}
                        onClick={() => loadChatMessages(session)}
                      >
                        <div className="session-info">
                          <span className="session-id">#{(session.sessionId || session.id || '-').substring(0, 8)}...</span>
                          <span className={`session-status status-badge ${session.status?.toLowerCase()}`}>
                            {session.status || 'UNKNOWN'}
                          </span>
                        </div>
                        <div className="session-meta">
                          <span className="session-date">{formatDateTime(session.createdAt || session.startedAt)}</span>
                          {session.agentId && <span className="session-agent">Agent: {session.agentId.substring(0, 8)}...</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat Messages View */}
              <div className="chat-messages-view">
                {!selectedChatSession ? (
                  <div className="empty-state">Select a chat session to view messages</div>
                ) : loadingMessages ? (
                  <div className="tab-loading">
                    <div className="spinner"></div>
                    <span>Loading messages...</span>
                  </div>
                ) : (
                  <>
                    <div className="messages-header">
                      <span>Session: {selectedChatSession.sessionId || selectedChatSession.id}</span>
                      <span className={`status-badge ${selectedChatSession.status?.toLowerCase()}`}>
                        {selectedChatSession.status}
                      </span>
                    </div>
                    <div className="messages-container">
                      {chatMessages.length === 0 ? (
                        <div className="empty-state small">No messages in this session</div>
                      ) : (
                        chatMessages.map((msg, idx) => (
                          <div
                            key={msg.messageId || msg.id || idx}
                            className={`message-bubble ${msg.senderType === 'AGENT' || msg.isAgent ? 'agent' : 'user'}`}
                          >
                            <div className="message-sender">
                              {msg.senderType === 'AGENT' || msg.isAgent ? 'Support Agent' : 'User'}
                            </div>
                            <div className="message-content">{msg.content || msg.message}</div>
                            <div className="message-time">{formatDateTime(msg.createdAt || msg.timestamp)}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
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
        // Check if we have any IP data to display
        const hasIpData = ipData || accountDetails;
        const currentIp = ipData?.currentIp || ipData?.ip || ipData?.lastIp || accountDetails?.lastIp || accountDetails?.ip;

        return (
          <div className="ip-section">
            {!hasIpData ? (
              <div className="empty-state">No IP data available for this account</div>
            ) : (
              <>
                {/* IP Information */}
                <div className="ip-info-grid">
                  <div className="ip-card primary">
                    <label>Current IP Address</label>
                    <span className="ip-value">{currentIp || 'Not recorded'}</span>
                  </div>
                  <div className="ip-card">
                    <label>Registration IP</label>
                    <span className="ip-value">{ipData?.registrationIp || accountDetails?.registrationIp || '-'}</span>
                  </div>
                  <div className="ip-card">
                    <label>Last Login IP</label>
                    <span className="ip-value">{ipData?.lastLoginIp || accountDetails?.lastLoginIp || currentIp || '-'}</span>
                  </div>
                  <div className="ip-card">
                    <label>Country</label>
                    <span>{ipData?.country || accountDetails?.country || '-'}</span>
                  </div>
                  <div className="ip-card">
                    <label>City</label>
                    <span>{ipData?.city || accountDetails?.city || '-'}</span>
                  </div>
                  <div className="ip-card">
                    <label>ISP</label>
                    <span>{ipData?.isp || '-'}</span>
                  </div>
                </div>

                {/* IP History Table */}
                {(ipData?.history || ipData?.ipHistory || ipData?.loginHistory) && (
                  <div className="ip-history-section">
                    <h4>IP History</h4>
                    <table className="data-table compact">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>IP Address</th>
                          <th>Location</th>
                          <th>Device</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(ipData?.history || ipData?.ipHistory || ipData?.loginHistory || []).map((entry, idx) => (
                          <tr key={idx}>
                            <td>{formatDateTime(entry.timestamp || entry.createdAt || entry.loginAt)}</td>
                            <td className="mono">{entry.ip || entry.ipAddress}</td>
                            <td>{entry.location || `${entry.city || ''} ${entry.country || ''}`.trim() || '-'}</td>
                            <td>{entry.device || entry.userAgent || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Account Details if available */}
                {accountDetails && (
                  <div className="account-details-section">
                    <h4>Account Details</h4>
                    <div className="details-grid">
                      <div className="detail-item">
                        <label>Last Login</label>
                        <span>{formatDateTime(accountDetails.lastLoginAt || accountDetails.lastLogin) || '-'}</span>
                      </div>
                      <div className="detail-item">
                        <label>Login Count</label>
                        <span>{accountDetails.loginCount || accountDetails.totalLogins || 0}</span>
                      </div>
                      <div className="detail-item">
                        <label>Device Type</label>
                        <span>{accountDetails.deviceType || accountDetails.device || '-'}</span>
                      </div>
                      <div className="detail-item">
                        <label>Browser</label>
                        <span>{accountDetails.browser || accountDetails.userAgent || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
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
            <div className="log-stats">
              <span>Total Activity: <strong>{logs.length}</strong></span>
              <div className="log-legend">
                <span className="legend-item deposit">Deposits</span>
                <span className="legend-item withdrawal">Withdrawals</span>
                <span className="legend-item bet">Bets</span>
                <span className="legend-item chat">Chats</span>
              </div>
            </div>

            {logs.length === 0 ? (
              <div className="empty-state">No activity logs found</div>
            ) : (
              <div className="log-timeline">
                {logs.map((log, idx) => (
                  <div key={log.id || idx} className={`log-entry ${log.type.toLowerCase()}`}>
                    <div className="log-icon">
                      {log.type === 'DEPOSIT' && '💰'}
                      {log.type === 'WITHDRAWAL' && '💸'}
                      {log.type === 'BET' && '🎰'}
                      {log.type === 'CHAT' && '💬'}
                    </div>
                    <div className="log-content">
                      <div className="log-header">
                        <span className={`log-type type-badge ${log.type.toLowerCase()}`}>{log.type}</span>
                        <span className="log-date">{formatDateTime(log.date)}</span>
                      </div>
                      <div className="log-description">{log.description}</div>
                      <div className="log-meta">
                        {log.status && (
                          <span className={`status-badge ${log.status?.toLowerCase()}`}>{log.status}</span>
                        )}
                        {log.amount && log.type !== 'BET' && (
                          <span className={log.type === 'DEPOSIT' ? 'text-success' : 'text-danger'}>
                            {log.type === 'DEPOSIT' ? '+' : '-'}${parseFloat(log.amount || 0).toFixed(2)}
                          </span>
                        )}
                        {log.profit !== undefined && log.type === 'BET' && (
                          <span className={log.profit >= 0 ? 'text-success' : 'text-danger'}>
                            {log.profit >= 0 ? '+' : ''}${log.profit.toFixed(2)}
                          </span>
                        )}
                        <span className="log-id mono small">{(log.id || '-').substring(0, 12)}...</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return <div className="empty-state">Select a tab</div>;
    }
  };

  // Show loading state while fetching user
  if (userLoading || !user) {
    return (
      <div className="user-details-overlay" onClick={onClose}>
        <div className="user-details-modal" onClick={(e) => e.stopPropagation()}>
          <div className="user-details-header">
            <div className="user-info">
              <span className="user-name">
                <FiUser className="icon" />
                Loading user details...
              </span>
            </div>
            <button className="close-btn" onClick={onClose}>
              <FiX size={24} />
            </button>
          </div>
          <div className="user-details-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
            <div className="loading-spinner"></div>
          </div>
        </div>
        <style>{`
          .user-details-overlay {
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
          }
          .user-details-modal {
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 1200px;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          }
          .user-details-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: #f8f9fa;
          }
          .user-info { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
          .user-name { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 16px; }
          .close-btn { background: none; border: none; cursor: pointer; color: #6b7280; padding: 4px; }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e5e7eb;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="user-details-overlay" onClick={onClose}>
      <div className="user-details-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="user-details-header">
          <div className="user-info">
            <span className="user-name">
              <FiUser className="icon" />
              {user.name || user.firstName || 'Unknown User'}
            </span>
            <span className="user-id" onClick={copyAccountId} title="Click to copy">
              {user.accountId}
              {copied ? <FiCheck className="copy-icon success" /> : <FiCopy className="copy-icon" />}
            </span>
            <span className="user-phone">
              <FiPhone className="icon" />
              {user.mobile || user.phone || '-'}
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

        /* CHAT Section Styles */
        .chat-section {
          height: 100%;
        }

        .chat-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 20px;
          height: 400px;
        }

        .chat-sessions-list {
          background: #f9fafb;
          border-radius: 8px;
          padding: 16px;
          overflow-y: auto;
        }

        .chat-sessions-list h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #374151;
        }

        .sessions-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .session-item {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .session-item:hover {
          border-color: #d1d5db;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .session-item.active {
          border-color: #1a1a2e;
          background: #f3f4f6;
        }

        .session-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .session-id {
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 12px;
          color: #374151;
        }

        .session-status {
          font-size: 10px;
        }

        .session-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 11px;
          color: #6b7280;
        }

        .chat-messages-view {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .messages-header {
          padding: 12px 16px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .message-bubble {
          max-width: 70%;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
        }

        .message-bubble.user {
          background: #e0e7ff;
          align-self: flex-start;
          border-bottom-left-radius: 4px;
        }

        .message-bubble.agent {
          background: #dcfce7;
          align-self: flex-end;
          border-bottom-right-radius: 4px;
        }

        .message-sender {
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          margin-bottom: 4px;
        }

        .message-content {
          color: #111827;
          line-height: 1.4;
        }

        .message-time {
          font-size: 10px;
          color: #9ca3af;
          margin-top: 6px;
          text-align: right;
        }

        .empty-state.small {
          padding: 30px 10px;
          font-size: 12px;
        }

        /* IP Section Styles */
        .ip-section {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .ip-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }

        .ip-card {
          background: #f9fafb;
          padding: 16px;
          border-radius: 8px;
          text-align: center;
        }

        .ip-card.primary {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: #fff;
        }

        .ip-card label {
          display: block;
          font-size: 11px;
          color: #6b7280;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .ip-card.primary label {
          color: rgba(255, 255, 255, 0.7);
        }

        .ip-value {
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 14px;
          font-weight: 600;
        }

        .ip-card.primary .ip-value {
          font-size: 18px;
          color: #fff;
        }

        .ip-history-section,
        .account-details-section {
          background: #f9fafb;
          padding: 16px;
          border-radius: 8px;
        }

        .ip-history-section h4,
        .account-details-section h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #374151;
        }

        /* LOG Section Styles */
        .log-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .log-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f9fafb;
          border-radius: 8px;
          font-size: 13px;
          color: #6b7280;
        }

        .log-stats strong {
          color: #111827;
        }

        .log-legend {
          display: flex;
          gap: 12px;
        }

        .legend-item {
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .legend-item.deposit {
          background: #dcfce7;
          color: #166534;
        }

        .legend-item.withdrawal {
          background: #fed7aa;
          color: #9a3412;
        }

        .legend-item.bet {
          background: #e0e7ff;
          color: #3730a3;
        }

        .legend-item.chat {
          background: #fef3c7;
          color: #92400e;
        }

        .log-timeline {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .log-entry {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .log-entry:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .log-entry.deposit {
          border-left: 4px solid #16a34a;
        }

        .log-entry.withdrawal {
          border-left: 4px solid #ea580c;
        }

        .log-entry.bet {
          border-left: 4px solid #4f46e5;
        }

        .log-entry.chat {
          border-left: 4px solid #d97706;
        }

        .log-icon {
          font-size: 24px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .log-content {
          flex: 1;
          min-width: 0;
        }

        .log-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .log-type {
          font-size: 10px;
        }

        .type-badge.bet {
          background: #e0e7ff;
          color: #3730a3;
        }

        .type-badge.chat {
          background: #fef3c7;
          color: #92400e;
        }

        .log-date {
          font-size: 12px;
          color: #6b7280;
        }

        .log-description {
          font-size: 14px;
          color: #111827;
          margin-bottom: 8px;
        }

        .log-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .log-id {
          color: #9ca3af;
        }

        .status-badge.closed {
          background: #e5e7eb;
          color: #374151;
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

          .chat-layout {
            grid-template-columns: 1fr;
            height: auto;
          }

          .chat-sessions-list {
            max-height: 200px;
          }

          .chat-messages-view {
            min-height: 300px;
          }

          .ip-info-grid {
            grid-template-columns: 1fr;
          }

          .log-stats {
            flex-direction: column;
            gap: 8px;
          }

          .log-legend {
            flex-wrap: wrap;
          }

          .message-bubble {
            max-width: 85%;
          }
        }

        /* Commission Section Enhanced Styles */
        .commission-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .commission-summary-grid .summary-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .commission-summary-grid .card-icon {
          font-size: 24px;
        }

        .commission-summary-grid .card-content {
          display: flex;
          flex-direction: column;
        }

        .commission-summary-grid .card-content label {
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 2px;
        }

        .commission-summary-grid .card-content .amount {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
        }

        .commission-summary-grid .card-content .count {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }

        .commission-summary-grid .summary-card.total {
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          border-color: #86efac;
        }

        .commission-summary-grid .summary-card.pending {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-color: #fcd34d;
        }

        .commission-summary-grid .summary-card.credited {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-color: #93c5fd;
        }

        .referred-by-section {
          margin-bottom: 20px;
        }

        .referred-by-section h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #374151;
        }

        .referred-by-card {
          background: linear-gradient(135deg, #fef3c7 0%, #fff7ed 100%);
          border: 1px solid #fed7aa;
          border-radius: 10px;
          padding: 16px;
        }

        .referred-by-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }

        .referred-by-row:last-child {
          border-bottom: none;
        }

        .referred-by-row label {
          color: #78716c;
          font-size: 13px;
        }

        .referred-by-row span {
          font-weight: 500;
          color: #1c1917;
        }

        .referred-by-row span.mono {
          font-family: 'Monaco', monospace;
          font-size: 11px;
        }

        .referrals-section, .earnings-section {
          margin-bottom: 24px;
        }

        .referrals-section h4, .earnings-section h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #374151;
        }

        .commission-filters {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .commission-filters .filter-select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 13px;
          min-width: 130px;
        }

        /* CREDIT Tab Styles */
        .credit-section {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .credit-summary-card {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 12px;
          padding: 24px;
          color: #fff;
        }

        .credit-summary-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .credit-icon {
          font-size: 40px;
        }

        .credit-info h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 500;
          opacity: 0.8;
        }

        .credit-amount {
          font-size: 36px;
          font-weight: 700;
          color: #4ade80;
          margin: 4px 0 0;
        }

        .credit-all-btn {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .credit-all-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(22, 163, 74, 0.4);
        }

        .credit-all-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Credit Confirmation Dialog */
        .credit-confirm-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          backdrop-filter: blur(4px);
        }

        .credit-confirm-dialog {
          background: #fff;
          border-radius: 16px;
          padding: 32px;
          max-width: 420px;
          width: 90%;
          text-align: center;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
        }

        .confirm-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .credit-confirm-dialog h4 {
          margin: 0 0 12px;
          font-size: 20px;
          color: #111827;
        }

        .credit-confirm-dialog p {
          margin: 0 0 8px;
          color: #4b5563;
          font-size: 15px;
          line-height: 1.5;
        }

        .confirm-warning {
          color: #92400e !important;
          background: #fef3c7;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px !important;
          margin-top: 12px !important;
        }

        .confirm-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .btn-cancel {
          flex: 1;
          padding: 12px 20px;
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel:hover {
          background: #e5e7eb;
        }

        .btn-confirm {
          flex: 1;
          padding: 12px 20px;
          background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-confirm:hover {
          box-shadow: 0 4px 12px rgba(22, 163, 74, 0.4);
        }

        /* Credit Table Section */
        .credit-table-section {
          background: #f9fafb;
          padding: 20px;
          border-radius: 12px;
        }

        .credit-table-section h4 {
          margin: 0 0 16px;
          font-size: 15px;
          color: #374151;
        }

        .credit-table {
          width: 100%;
          border-collapse: collapse;
          background: #fff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .credit-table th {
          background: #f3f4f6;
          padding: 12px 14px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e5e7eb;
        }

        .credit-table td {
          padding: 12px 14px;
          font-size: 13px;
          color: #374151;
          border-bottom: 1px solid #f3f4f6;
        }

        .credit-table tr:last-child td {
          border-bottom: none;
        }

        .credit-table tr:hover {
          background: #f9fafb;
        }

        .credit-table .mono {
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 11px;
          color: #6b7280;
        }

        .credit-table .amount-cell {
          font-weight: 600;
          color: #16a34a;
        }

        .credit-table .date-cell {
          font-size: 12px;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .credit-summary-header {
            flex-direction: column;
            text-align: center;
          }

          .credit-amount {
            font-size: 28px;
          }

          .confirm-actions {
            flex-direction: column;
          }

          .credit-table {
            font-size: 12px;
          }

          .credit-table th,
          .credit-table td {
            padding: 8px 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default UserDetailsModal;
