import { useState } from 'react';
import { FiShoppingCart, FiCreditCard, FiDollarSign, FiToggleLeft, FiToggleRight, FiSettings } from 'react-icons/fi';

const Payment = () => {
  const [gateways, setGateways] = useState([
    { id: 1, name: 'Bank Transfer', status: true, fee: '0%', minDeposit: 10, maxDeposit: 50000 },
    { id: 2, name: 'Credit Card', status: true, fee: '2.5%', minDeposit: 10, maxDeposit: 10000 },
    { id: 3, name: 'PayID', status: true, fee: '0%', minDeposit: 10, maxDeposit: 50000 },
    { id: 4, name: 'Crypto (BTC)', status: false, fee: '1%', minDeposit: 50, maxDeposit: 100000 },
    { id: 5, name: 'PayPal', status: false, fee: '3%', minDeposit: 10, maxDeposit: 5000 },
  ]);

  const toggleGateway = (id) => {
    setGateways(prev => prev.map(g => g.id === id ? { ...g, status: !g.status } : g));
  };

  return (
    <div className="content-inner">
      <div className="page-header">
        <h1><FiShoppingCart style={{ marginRight: '10px' }} /> Payment Settings</h1>
        <p>Configure payment gateways and transaction limits</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <FiDollarSign size={24} style={{ color: '#10b981' }} />
          <div>
            <span className="stat-value">$125,430</span>
            <span className="stat-label">Total Deposits (This Month)</span>
          </div>
        </div>
        <div className="stat-card">
          <FiCreditCard size={24} style={{ color: '#3b82f6' }} />
          <div>
            <span className="stat-value">$45,200</span>
            <span className="stat-label">Total Withdrawals (This Month)</span>
          </div>
        </div>
        <div className="stat-card">
          <FiSettings size={24} style={{ color: '#f59e0b' }} />
          <div>
            <span className="stat-value">{gateways.filter(g => g.status).length}</span>
            <span className="stat-label">Active Gateways</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3><FiCreditCard /> Payment Gateways</h3>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Gateway</th>
                <th>Status</th>
                <th>Fee</th>
                <th>Min Deposit</th>
                <th>Max Deposit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {gateways.map(gateway => (
                <tr key={gateway.id}>
                  <td><strong>{gateway.name}</strong></td>
                  <td>
                    <span className={`badge ${gateway.status ? 'badge-success' : 'badge-secondary'}`}>
                      {gateway.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{gateway.fee}</td>
                  <td>${gateway.minDeposit}</td>
                  <td>${gateway.maxDeposit.toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button className="toggle-btn" onClick={() => toggleGateway(gateway.id)}>
                        {gateway.status ? <FiToggleRight size={24} color="#10b981" /> : <FiToggleLeft size={24} color="#ccc" />}
                      </button>
                      <button className="btn btn-secondary btn-sm"><FiSettings /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Payment;
