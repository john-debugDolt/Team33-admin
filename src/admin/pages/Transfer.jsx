import { useState } from 'react';

// Dummy deposit/withdrawal requests
const initialDeposits = [
  { id: 1, user: 'John Doe', phone: '+61 412 345 678', amount: 500, method: 'Bank Transfer', status: 'pending', proof: 'receipt_001.jpg', date: '2024-01-20 14:30', accountId: 'ACC001' },
  { id: 2, user: 'Jane Smith', phone: '+61 423 456 789', amount: 2000, method: 'PayID', status: 'pending', proof: 'receipt_002.jpg', date: '2024-01-20 13:15', accountId: 'ACC002' },
  { id: 3, user: 'Mike Johnson', phone: '+61 434 567 890', amount: 1000, method: 'Bank Transfer', status: 'approved', proof: 'receipt_003.jpg', date: '2024-01-20 12:00', accountId: 'ACC003' },
  { id: 4, user: 'Sarah Wilson', phone: '+61 445 678 901', amount: 750, method: 'PayID', status: 'pending', proof: 'receipt_004.jpg', date: '2024-01-20 11:45', accountId: 'ACC004' },
  { id: 5, user: 'Tom Brown', phone: '+61 456 789 012', amount: 300, method: 'Bank Transfer', status: 'rejected', proof: 'receipt_005.jpg', date: '2024-01-20 10:30', accountId: 'ACC005' },
];

const initialWithdrawals = [
  { id: 1, user: 'Alice Cooper', phone: '+61 467 890 123', amount: 1200, bankName: 'Commonwealth Bank', accountNumber: '****4567', status: 'pending', date: '2024-01-20 15:00', accountId: 'ACC006' },
  { id: 2, user: 'Bob Martin', phone: '+61 478 901 234', amount: 3500, bankName: 'ANZ Bank', accountNumber: '****8901', status: 'pending', date: '2024-01-20 14:00', accountId: 'ACC007' },
  { id: 3, user: 'Emma Davis', phone: '+61 489 012 345', amount: 800, bankName: 'Westpac', accountNumber: '****2345', status: 'approved', date: '2024-01-20 13:30', accountId: 'ACC008' },
  { id: 4, user: 'Chris Lee', phone: '+61 490 123 456', amount: 2000, bankName: 'NAB', accountNumber: '****6789', status: 'pending', date: '2024-01-20 12:45', accountId: 'ACC009' },
];

export default function Transfer() {
  const [activeTab, setActiveTab] = useState('deposits');
  const [deposits, setDeposits] = useState(initialDeposits);
  const [withdrawals, setWithdrawals] = useState(initialWithdrawals);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleApproveDeposit = (id) => {
    setDeposits(deposits.map(d => d.id === id ? { ...d, status: 'approved' } : d));
    if (selectedItem?.id === id) setSelectedItem({ ...selectedItem, status: 'approved' });
  };

  const handleRejectDeposit = (id) => {
    setDeposits(deposits.map(d => d.id === id ? { ...d, status: 'rejected' } : d));
    if (selectedItem?.id === id) setSelectedItem({ ...selectedItem, status: 'rejected' });
  };

  const handleApproveWithdrawal = (id) => {
    setWithdrawals(withdrawals.map(w => w.id === id ? { ...w, status: 'approved' } : w));
    if (selectedItem?.id === id) setSelectedItem({ ...selectedItem, status: 'approved' });
  };

  const handleRejectWithdrawal = (id) => {
    setWithdrawals(withdrawals.map(w => w.id === id ? { ...w, status: 'rejected' } : w));
    if (selectedItem?.id === id) setSelectedItem({ ...selectedItem, status: 'rejected' });
  };

  const filteredDeposits = deposits.filter(d => filterStatus === 'all' || d.status === filterStatus);
  const filteredWithdrawals = withdrawals.filter(w => filterStatus === 'all' || w.status === filterStatus);
  const pendingDepositsCount = deposits.filter(d => d.status === 'pending').length;
  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'pending').length;

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Deposits & Withdrawals</h1>

      <div className="transfer-summary">
        <div className="summary-card deposits">
          <div className="summary-icon">📥</div>
          <div className="summary-info">
            <span className="summary-value">${deposits.filter(d => d.status === 'pending').reduce((sum, d) => sum + d.amount, 0).toLocaleString()}</span>
            <span className="summary-label">Pending Deposits ({pendingDepositsCount})</span>
          </div>
        </div>
        <div className="summary-card withdrawals">
          <div className="summary-icon">📤</div>
          <div className="summary-info">
            <span className="summary-value">${withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0).toLocaleString()}</span>
            <span className="summary-label">Pending Withdrawals ({pendingWithdrawalsCount})</span>
          </div>
        </div>
      </div>

      <div className="transfer-tabs">
        <button className={`transfer-tab ${activeTab === 'deposits' ? 'active' : ''}`} onClick={() => setActiveTab('deposits')}>
          Deposits {pendingDepositsCount > 0 && <span className="tab-badge">{pendingDepositsCount}</span>}
        </button>
        <button className={`transfer-tab ${activeTab === 'withdrawals' ? 'active' : ''}`} onClick={() => setActiveTab('withdrawals')}>
          Withdrawals {pendingWithdrawalsCount > 0 && <span className="tab-badge">{pendingWithdrawalsCount}</span>}
        </button>
        <select className="admin-select filter-inline" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {activeTab === 'deposits' && (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr><th>User</th><th>Amount</th><th>Method</th><th>Date</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredDeposits.map(deposit => (
                <tr key={deposit.id}>
                  <td><div className="user-info"><div className="user-avatar">{deposit.user.charAt(0)}</div><div><div className="user-name">{deposit.user}</div><div className="user-email">{deposit.phone}</div></div></div></td>
                  <td><strong className="amount-green">${deposit.amount.toLocaleString()}</strong></td>
                  <td>{deposit.method}</td>
                  <td>{deposit.date}</td>
                  <td><span className={`status-badge ${deposit.status}`}>{deposit.status}</span></td>
                  <td>
                    <div className="action-btns">
                      <button className="action-btn view" onClick={() => { setSelectedItem({...deposit, type: 'deposit'}); setShowModal(true); }}>👁</button>
                      {deposit.status === 'pending' && (
                        <>
                          <button className="action-btn approve" onClick={() => handleApproveDeposit(deposit.id)}>✓</button>
                          <button className="action-btn reject" onClick={() => handleRejectDeposit(deposit.id)}>✗</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'withdrawals' && (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr><th>User</th><th>Amount</th><th>Bank</th><th>Account</th><th>Date</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredWithdrawals.map(w => (
                <tr key={w.id}>
                  <td><div className="user-info"><div className="user-avatar">{w.user.charAt(0)}</div><div><div className="user-name">{w.user}</div><div className="user-email">{w.phone}</div></div></div></td>
                  <td><strong className="amount-red">${w.amount.toLocaleString()}</strong></td>
                  <td>{w.bankName}</td>
                  <td>{w.accountNumber}</td>
                  <td>{w.date}</td>
                  <td><span className={`status-badge ${w.status}`}>{w.status}</span></td>
                  <td>
                    <div className="action-btns">
                      <button className="action-btn view" onClick={() => { setSelectedItem({...w, type: 'withdrawal'}); setShowModal(true); }}>👁</button>
                      {w.status === 'pending' && (
                        <>
                          <button className="action-btn approve" onClick={() => handleApproveWithdrawal(w.id)}>✓</button>
                          <button className="action-btn reject" onClick={() => handleRejectWithdrawal(w.id)}>✗</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedItem && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem.type === 'deposit' ? 'Deposit' : 'Withdrawal'} Details</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="transfer-detail-amount">
                <span className={selectedItem.type === 'deposit' ? 'amount-green' : 'amount-red'}>${selectedItem.amount.toLocaleString()}</span>
                <span className={`status-badge ${selectedItem.status}`}>{selectedItem.status}</span>
              </div>
              <div className="user-detail-grid">
                <div className="detail-item"><label>User</label><span>{selectedItem.user}</span></div>
                <div className="detail-item"><label>Phone</label><span>{selectedItem.phone}</span></div>
                {selectedItem.type === 'deposit' ? (
                  <><div className="detail-item"><label>Method</label><span>{selectedItem.method}</span></div>
                  <div className="detail-item"><label>Proof</label><span>📎 {selectedItem.proof}</span></div></>
                ) : (
                  <><div className="detail-item"><label>Bank</label><span>{selectedItem.bankName}</span></div>
                  <div className="detail-item"><label>Account</label><span>{selectedItem.accountNumber}</span></div></>
                )}
                <div className="detail-item"><label>Date</label><span>{selectedItem.date}</span></div>
              </div>
              {selectedItem.status === 'pending' && (
                <div className="modal-actions">
                  <button className="admin-btn primary" onClick={() => selectedItem.type === 'deposit' ? handleApproveDeposit(selectedItem.id) : handleApproveWithdrawal(selectedItem.id)}>✓ Approve</button>
                  <button className="admin-btn danger" onClick={() => selectedItem.type === 'deposit' ? handleRejectDeposit(selectedItem.id) : handleRejectWithdrawal(selectedItem.id)}>✗ Reject</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
