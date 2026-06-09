import { useState, useEffect } from 'react';
import { FiSearch, FiInbox, FiCheck, FiX, FiClock, FiRefreshCw, FiEye, FiCreditCard } from 'react-icons/fi';
import { transactionService } from '../services/transactionService';
import { attachBankToWithdrawal, getBanksByStatus } from '../../services/apiService';
import { formatDateTime } from '../utils/dateUtils';

const Transactions = () => {
  const [formData, setFormData] = useState({
    id: '',
    customer: '',
    type: 'ALL',
    dateStart: '',
    dateEnd: '',
    amountMin: '',
    amountMax: '',
    status: 'PENDING'
  });

  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    totalAmount: 0,
    pendingAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [modalMode, setModalMode] = useState('view'); // 'view' or 'reject'
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [withdrawalDetails, setWithdrawalDetails] = useState(null);
  // Attach-bank UI state for withdrawals — admin records which house bank
  // the payout was made from so the per-bank ledger surfaces it.
  const [activeBanks, setActiveBanks] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [attachingBank, setAttachingBank] = useState(false);

  // Fetch transactions
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const result = await transactionService.getAllTransactions(formData);
      if (result.success) {
        setTransactions(result.transactions);
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchTransactions();
  };

  // Handle approve
  const handleApprove = async (transaction) => {
    if (!confirm(`Approve ${transaction.type} of $${transaction.amount.toLocaleString()} for ${transaction.username}?`)) {
      return;
    }

    setProcessing(transaction.id);
    try {
      // Pass transaction info to avoid extra API call
      const result = await transactionService.approveTransaction(transaction.id, '', {
        accountId: transaction.accountId,
        amount: transaction.amount,
        originalId: transaction.originalId // For withdrawals with prefixed IDs
      });
      if (result.success) {
        fetchTransactions();
        alert('Transaction approved successfully!');
      } else {
        alert('Failed to approve: ' + result.error);
      }
    } catch (error) {
      alert('Error approving transaction');
    } finally {
      setProcessing(null);
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!selectedTransaction) return;

    setProcessing(selectedTransaction.id);
    try {
      const result = await transactionService.rejectTransaction(selectedTransaction.id, rejectReason, selectedTransaction.originalId);
      if (result.success) {
        setShowModal(false);
        setSelectedTransaction(null);
        setRejectReason('');
        fetchTransactions();
        alert('Transaction rejected');
      } else {
        alert('Failed to reject: ' + result.error);
      }
    } catch (error) {
      alert('Error rejecting transaction');
    } finally {
      setProcessing(null);
    }
  };

  // Open reject modal
  const openRejectModal = (transaction) => {
    setSelectedTransaction(transaction);
    setRejectReason('');
    setModalMode('reject');
    setWithdrawalDetails(null);
    setShowModal(true);
  };

  // View transaction details (click on ID)
  const viewTransactionDetails = async (transaction) => {
    setSelectedTransaction(transaction);
    setModalMode('view');
    setShowModal(true);
    setWithdrawalDetails(null);
    setSelectedBankId('');

    // Fetch full details for withdrawals
    if (transaction.type === 'WITHDRAWAL') {
      setLoadingDetails(true);
      try {
        // Withdrawal details + active-bank list run in parallel — both are
        // needed by the Attach Bank section in the modal.
        const [details, banksResult] = await Promise.all([
          transactionService.getWithdrawalDetails(transaction.originalId || transaction.id),
          activeBanks.length === 0 ? getBanksByStatus('ACTIVE') : Promise.resolve(null),
        ]);
        if (details.success) {
          setWithdrawalDetails(details.withdrawal);
          // Pre-select whatever bank was previously attached so the admin
          // can see at a glance which one it is, and re-submitting is a no-op.
          if (details.withdrawal?.bankId) setSelectedBankId(String(details.withdrawal.bankId));
        }
        if (banksResult?.success) {
          setActiveBanks(Array.isArray(banksResult.data) ? banksResult.data : []);
        }
      } catch (error) {
        console.error('Error fetching withdrawal details:', error);
      }
      setLoadingDetails(false);
    }
  };

  // Attach (or re-attach) an internal house bank to the displayed withdrawal.
  // Hits POST /api/admin/withdrawals/{withdrawId}/attach-bank — backend
  // snapshots payId (fallback accountNumber) onto the row as bankIdentifier
  // so a later bank rename/delete doesn't rewrite history.
  const handleAttachBank = async () => {
    if (!selectedBankId) return;
    const withdrawId = withdrawalDetails?.withdrawId
      || selectedTransaction?.originalId
      || selectedTransaction?.id;
    if (!withdrawId) return;
    setAttachingBank(true);
    const result = await attachBankToWithdrawal(withdrawId, Number(selectedBankId));
    setAttachingBank(false);
    if (result.success) {
      setWithdrawalDetails(result.data); // updated WithdrawResponse incl. bankId + bankIdentifier
      alert('Bank attached to withdrawal');
    } else {
      alert(result.error || 'Failed to attach bank');
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
      case 'COMPLETED':
        return <span className="badge badge-success"><FiCheck style={{ marginRight: '4px' }} />Approved</span>;
      case 'REJECTED':
        return <span className="badge badge-danger"><FiX style={{ marginRight: '4px' }} />Rejected</span>;
      case 'PENDING':
      default:
        return <span className="badge badge-warning"><FiClock style={{ marginRight: '4px' }} />Pending</span>;
    }
  };

  // Format date - use utility function
  const formatDate = (dateString) => formatDateTime(dateString);

  return (
    <div className="content-inner">
      {/* Search Form */}
      <div className="filter-section">
        <form onSubmit={handleSearch}>
          <div className="form-row">
            <span className="form-label">ID</span>
            <input
              type="text"
              className="form-input"
              placeholder="Search by Transaction ID"
              value={formData.id}
              onChange={(e) => setFormData({...formData, id: e.target.value})}
            />
          </div>
          <div className="form-row">
            <span className="form-label">Customer</span>
            <input
              type="text"
              className="form-input"
              placeholder="Search by Customer ID / Phone"
              value={formData.customer}
              onChange={(e) => setFormData({...formData, customer: e.target.value})}
            />
          </div>
          <div className="form-row">
            <span className="form-label">Type</span>
            <select
              className="form-select"
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <option value="ALL">All Types</option>
              <option value="DEPOSIT">Deposit</option>
              <option value="WITHDRAWAL">Withdrawal</option>
            </select>
          </div>
          <div className="form-row">
            <span className="form-label">Date</span>
            <div className="form-input-group">
              <input
                type="date"
                className="form-input"
                value={formData.dateStart}
                onChange={(e) => setFormData({...formData, dateStart: e.target.value})}
              />
              <input
                type="date"
                className="form-input"
                value={formData.dateEnd}
                onChange={(e) => setFormData({...formData, dateEnd: e.target.value})}
              />
            </div>
          </div>
          <div className="form-row">
            <span className="form-label">Amount</span>
            <div className="form-input-group">
              <input
                type="text"
                className="form-input"
                placeholder="Min amount"
                value={formData.amountMin}
                onChange={(e) => setFormData({...formData, amountMin: e.target.value})}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Max amount"
                value={formData.amountMax}
                onChange={(e) => setFormData({...formData, amountMax: e.target.value})}
              />
            </div>
          </div>
          <div className="form-row">
            <span className="form-label">Status</span>
            <select
              className="form-select"
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ALL">All Status</option>
            </select>
          </div>

          <button type="submit" className="btn-search-full" disabled={loading}>
            {loading ? (
              <><FiRefreshCw style={{ marginRight: '6px', animation: 'spin 1s linear infinite' }} /> Loading...</>
            ) : (
              <><FiSearch style={{ marginRight: '6px' }} /> SEARCH</>
            )}
          </button>
        </form>
      </div>

      {/* Stats */}
      <div className="action-bar">
        <div className="quick-stats">
          <div className="quick-stat">
            <span className="quick-stat-label">Total:</span>
            <span className="quick-stat-value">{stats.total}</span>
          </div>
          <div className="quick-stat">
            <span className="quick-stat-label">Pending:</span>
            <span className="quick-stat-value text-warning">{stats.pendingCount}</span>
          </div>
          <div className="quick-stat">
            <span className="quick-stat-label">Approved:</span>
            <span className="quick-stat-value text-success">{stats.approvedCount}</span>
          </div>
          <div className="quick-stat">
            <span className="quick-stat-label">Pending Amount:</span>
            <span className="quick-stat-value text-warning">${stats.pendingAmount?.toLocaleString() || 0}</span>
          </div>
        </div>
        <button onClick={fetchTransactions} className="btn btn-secondary btn-sm">
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {/* Transactions Table */}
      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Bank</th>
                <th>Date/Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="empty-state">
                    <FiRefreshCw className="empty-state-icon" style={{ animation: 'spin 1s linear infinite' }} />
                    <p className="empty-state-text">Loading transactions...</p>
                  </td>
                </tr>
              ) : transactions.length > 0 ? (
                transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <strong
                        style={{
                          fontSize: '11px',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                        onClick={() => viewTransactionDetails(tx)}
                      >
                        {tx.id}
                      </strong>
                    </td>
                    <td>
                      <div>
                        <strong>{tx.username || tx.accountId}</strong>
                        {tx.phone && <div style={{ fontSize: '11px', color: '#666' }}>{tx.phone}</div>}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${tx.type === 'DEPOSIT' ? 'badge-success' : 'badge-warning'}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td><strong>${tx.amount?.toLocaleString() || 0}</strong></td>
                    <td>
                      {tx.type === 'WITHDRAWAL' ? (
                        <div>
                          {tx.bank && tx.bank !== 'N/A' && (
                            <span className="badge badge-info">{tx.bank}</span>
                          )}
                          {tx.payId && (
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                              PayID: {tx.payId}
                            </div>
                          )}
                          {tx.bsb && tx.bankAccount && (
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                              {tx.bsb} / {tx.bankAccount}
                            </div>
                          )}
                          {!tx.bank && !tx.payId && !tx.bsb && (
                            <span style={{ color: '#999' }}>-</span>
                          )}
                        </div>
                      ) : tx.bank && tx.bank !== 'N/A' ? (
                        <span className="badge badge-info">{tx.bank}</span>
                      ) : (
                        <span style={{ color: '#999' }}>-</span>
                      )}
                    </td>
                    <td className="text-muted" style={{ fontSize: '12px' }}>{formatDate(tx.createdAt)}</td>
                    <td>{getStatusBadge(tx.status)}</td>
                    <td>
                      <div className="action-btns">
                        <button
                          className="action-btn view"
                          onClick={() => viewTransactionDetails(tx)}
                          title="Show full transaction details"
                        >
                          <FiEye /> Details
                        </button>
                        {tx.status === 'PENDING' && (
                          <>
                            <button
                              className="action-btn approve"
                              onClick={() => handleApprove(tx)}
                              disabled={processing === tx.id}
                            >
                              {processing === tx.id ? <FiRefreshCw className="spin" /> : <><FiCheck /> Approve</>}
                            </button>
                            <button
                              className="action-btn reject"
                              onClick={() => openRejectModal(tx)}
                              disabled={processing === tx.id}
                            >
                              <FiX /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="empty-state">
                    <FiInbox className="empty-state-icon" />
                    <p className="empty-state-text">No transactions found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for View/Reject */}
      {showModal && selectedTransaction && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '0',
            width: '90%',
            maxWidth: '550px',
            maxHeight: '85vh',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #eee',
              background: selectedTransaction.type === 'WITHDRAWAL' ? '#fef3c7' : '#d1fae5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>
                  {modalMode === 'reject' ? 'Reject Transaction' : `${selectedTransaction.type} Details`}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                  {selectedTransaction.id}
                </p>
              </div>
              <span style={{
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                background: selectedTransaction.type === 'WITHDRAWAL' ? '#f59e0b' : '#10b981',
                color: '#fff'
              }}>
                {selectedTransaction.type}
              </span>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
              {loadingDetails ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <FiRefreshCw style={{ animation: 'spin 1s linear infinite', fontSize: '24px', color: '#6b7280' }} />
                  <p style={{ marginTop: '12px', color: '#6b7280' }}>Loading details...</p>
                </div>
              ) : (
                <>
                  {/* Amount Section */}
                  <div style={{
                    background: '#f9fafb',
                    borderRadius: '10px',
                    padding: '20px',
                    marginBottom: '20px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Amount</p>
                    <p style={{
                      margin: '8px 0 0',
                      fontSize: '32px',
                      fontWeight: '700',
                      color: selectedTransaction.type === 'WITHDRAWAL' ? '#f59e0b' : '#10b981'
                    }}>
                      ${(withdrawalDetails?.amount || selectedTransaction.amount)?.toLocaleString()}
                    </p>
                    <p style={{ margin: '8px 0 0' }}>{getStatusBadge(withdrawalDetails?.status || selectedTransaction.status)}</p>
                  </div>

                  {/* Customer Info */}
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14px', color: '#374151', marginBottom: '12px', fontWeight: '600' }}>
                      Customer Information
                    </h4>
                    <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px' }}>
                      <div className="detail-row">
                        <span>Account ID</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{selectedTransaction.accountId}</span>
                      </div>
                      <div className="detail-row">
                        <span>Name</span>
                        <span>{withdrawalDetails?.accountHolderName || selectedTransaction.username || selectedTransaction.accountId}</span>
                      </div>
                      {selectedTransaction.phone && (
                        <div className="detail-row">
                          <span>Phone</span>
                          <span>{selectedTransaction.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bank Details for Withdrawals */}
                  {selectedTransaction.type === 'WITHDRAWAL' && (
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '14px', color: '#374151', marginBottom: '12px', fontWeight: '600' }}>
                        Bank Details (For Processing)
                      </h4>
                      <div style={{ background: '#fef3c7', borderRadius: '8px', padding: '16px', border: '1px solid #fcd34d' }}>
                        <div className="detail-row">
                          <span>Bank Name</span>
                          <span style={{ fontWeight: '600', fontSize: '14px' }}>
                            {withdrawalDetails?.bankName || selectedTransaction.bank || 'N/A'}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span>Account Holder</span>
                          <span style={{ fontWeight: '600', fontSize: '14px' }}>
                            {withdrawalDetails?.accountHolderName || selectedTransaction.accountHolderName || 'N/A'}
                          </span>
                        </div>

                        {/* BSB - prefer original transaction data (unmasked) */}
                        {(selectedTransaction.bsb || withdrawalDetails?.maskedBsb) && (
                          <div className="detail-row">
                            <span>BSB</span>
                            <span style={{
                              fontFamily: 'monospace',
                              fontWeight: '700',
                              fontSize: '16px',
                              color: '#1f2937',
                              background: '#fff',
                              padding: '4px 8px',
                              borderRadius: '4px'
                            }}>
                              {selectedTransaction.bsb || withdrawalDetails?.maskedBsb}
                            </span>
                          </div>
                        )}

                        {/* Account Number - prefer original transaction data (unmasked) */}
                        {(selectedTransaction.bankAccount || withdrawalDetails?.maskedAccountNumber) && (
                          <div className="detail-row">
                            <span>Account Number</span>
                            <span style={{
                              fontFamily: 'monospace',
                              fontWeight: '700',
                              fontSize: '16px',
                              color: '#1f2937',
                              background: '#fff',
                              padding: '4px 8px',
                              borderRadius: '4px'
                            }}>
                              {selectedTransaction.bankAccount || withdrawalDetails?.maskedAccountNumber}
                            </span>
                          </div>
                        )}

                        {/* PayID - prefer original transaction data (unmasked) */}
                        {(selectedTransaction.payId || withdrawalDetails?.maskedPayId) && (
                          <div className="detail-row">
                            <span>PayID</span>
                            <span style={{
                              fontFamily: 'monospace',
                              fontWeight: '700',
                              fontSize: '16px',
                              color: '#2563eb',
                              background: '#fff',
                              padding: '4px 8px',
                              borderRadius: '4px'
                            }}>
                              {selectedTransaction.payId || withdrawalDetails?.maskedPayId}
                            </span>
                          </div>
                        )}

                        {/* Show warning if data appears masked */}
                        {(withdrawalDetails?.maskedBsb?.includes('*') ||
                          withdrawalDetails?.maskedAccountNumber?.includes('*') ||
                          (withdrawalDetails?.maskedPayId?.includes('*') && !selectedTransaction.payId)) && (
                          <div style={{
                            marginTop: '12px',
                            padding: '10px',
                            background: '#fef2f2',
                            borderRadius: '6px',
                            border: '1px solid #fecaca',
                            fontSize: '12px',
                            color: '#b91c1c'
                          }}>
                            ⚠️ Some bank details are masked. Contact backend team to enable full admin access.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Balance Info */}
                  {withdrawalDetails && (withdrawalDetails.balanceBefore != null || withdrawalDetails.balanceAfter != null) && (
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '14px', color: '#374151', marginBottom: '12px', fontWeight: '600' }}>
                        Balance Impact
                      </h4>
                      <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px' }}>
                        {withdrawalDetails.balanceBefore != null && (
                          <div className="detail-row">
                            <span>Balance Before</span>
                            <span>${withdrawalDetails.balanceBefore?.toLocaleString()}</span>
                          </div>
                        )}
                        {withdrawalDetails.balanceAfter != null && (
                          <div className="detail-row">
                            <span>Balance After</span>
                            <span>${withdrawalDetails.balanceAfter?.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14px', color: '#374151', marginBottom: '12px', fontWeight: '600' }}>
                      Timeline
                    </h4>
                    <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px' }}>
                      <div className="detail-row">
                        <span>Created</span>
                        <span>{formatDate(withdrawalDetails?.createdAt || selectedTransaction.createdAt)}</span>
                      </div>
                      {(withdrawalDetails?.reviewedAt || selectedTransaction.processedAt) && (
                        <div className="detail-row">
                          <span>Reviewed</span>
                          <span>{formatDate(withdrawalDetails?.reviewedAt || selectedTransaction.processedAt)}</span>
                        </div>
                      )}
                      {withdrawalDetails?.completedAt && (
                        <div className="detail-row">
                          <span>Completed</span>
                          <span>{formatDate(withdrawalDetails.completedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Notes */}
                  {(withdrawalDetails?.adminNotes || withdrawalDetails?.externalReference) && (
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '14px', color: '#374151', marginBottom: '12px', fontWeight: '600' }}>
                        Admin Notes
                      </h4>
                      <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px' }}>
                        {withdrawalDetails?.adminNotes && (
                          <p style={{ margin: 0, fontSize: '13px' }}>{withdrawalDetails.adminNotes}</p>
                        )}
                        {withdrawalDetails?.externalReference && (
                          <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#6b7280' }}>
                            Ref: {withdrawalDetails.externalReference}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Attach House Bank — record which internal bank paid this
                      withdrawal so the per-bank ledger surfaces it (per doc §3.1). */}
                  {withdrawalDetails && (
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{
                        fontSize: '14px', color: '#374151', marginBottom: '12px',
                        fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px',
                      }}>
                        <FiCreditCard /> House Bank Used
                      </h4>
                      <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px' }}>
                        {withdrawalDetails.bankId ? (
                          <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#065f46' }}>
                            Attached: bank #{withdrawalDetails.bankId}
                            {withdrawalDetails.bankIdentifier ? ` (${withdrawalDetails.bankIdentifier})` : ''}
                          </p>
                        ) : (
                          <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#6b7280' }}>
                            No internal bank attached yet — record the one used for payout.
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <select
                            value={selectedBankId}
                            onChange={(e) => setSelectedBankId(e.target.value)}
                            style={{
                              flex: '1 1 220px', padding: '8px 10px', fontSize: '13px',
                              border: '1px solid #d1d5db', borderRadius: '6px',
                            }}
                            disabled={attachingBank}
                          >
                            <option value="">Select active house bank…</option>
                            {activeBanks.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.bankName} — {b.accountName} ({b.payId || b.accountNumber || `id:${b.id}`})
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn btn-primary"
                            disabled={!selectedBankId || attachingBank
                              || String(withdrawalDetails.bankId || '') === String(selectedBankId)}
                            onClick={handleAttachBank}
                            style={{ padding: '8px 14px' }}
                          >
                            {attachingBank
                              ? 'Attaching…'
                              : withdrawalDetails.bankId
                                ? 'Re-attach'
                                : 'Attach Bank'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reject Reason Input */}
                  {modalMode === 'reject' && selectedTransaction.status === 'PENDING' && (
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                        Rejection Reason:
                      </label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Enter reason for rejection (will be shown to user)..."
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          minHeight: '80px',
                          resize: 'vertical',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #eee',
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
              background: '#f9fafb'
            }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowModal(false);
                  setSelectedTransaction(null);
                  setRejectReason('');
                  setWithdrawalDetails(null);
                }}
              >
                Close
              </button>
              {selectedTransaction.status === 'PENDING' && modalMode === 'view' && (
                <>
                  <button
                    className="btn btn-danger"
                    onClick={() => setModalMode('reject')}
                  >
                    <FiX style={{ marginRight: '4px' }} /> Reject
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={() => handleApprove(selectedTransaction)}
                    disabled={processing === selectedTransaction.id}
                  >
                    {processing === selectedTransaction.id ? (
                      <><FiRefreshCw className="spin" style={{ marginRight: '4px' }} /> Processing...</>
                    ) : (
                      <><FiCheck style={{ marginRight: '4px' }} /> Approve</>
                    )}
                  </button>
                </>
              )}
              {modalMode === 'reject' && selectedTransaction.status === 'PENDING' && (
                <button
                  className="btn btn-danger"
                  onClick={handleReject}
                  disabled={processing === selectedTransaction.id}
                >
                  {processing === selectedTransaction.id ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        .action-btns {
          display: flex;
          gap: 6px;
          flex-wrap: nowrap;
        }
        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .action-btn svg {
          width: 14px;
          height: 14px;
        }
        .action-btn.approve {
          background: #10b981;
          color: white;
        }
        .action-btn.approve:hover:not(:disabled) {
          background: #059669;
        }
        .action-btn.reject {
          background: #ef4444;
          color: white;
        }
        .action-btn.reject:hover:not(:disabled) {
          background: #dc2626;
        }
        .action-btn.view {
          background: #6b7280;
          color: white;
        }
        .action-btn.view:hover:not(:disabled) {
          background: #4b5563;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          font-size: 13px;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-row span:first-child {
          color: #6b7280;
        }
        .detail-row span:last-child {
          color: #1f2937;
          font-weight: 500;
          text-align: right;
        }
        .btn-success {
          background: #10b981;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
        }
        .btn-success:hover {
          background: #059669;
        }
        .btn-danger {
          background: #ef4444;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
        }
        .btn-danger:hover {
          background: #dc2626;
        }
        @media (max-width: 768px) {
          .action-btns {
            flex-direction: column;
            gap: 4px;
          }
          .action-btn {
            padding: 8px 10px;
            font-size: 11px;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default Transactions;
