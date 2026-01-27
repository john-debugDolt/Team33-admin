import { useState } from 'react';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiEye, FiDollarSign } from 'react-icons/fi';

const Members = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const members = [
    { id: 1, username: 'player001', phone: '09x-xxx-1234', balance: '฿15,000', totalDeposit: '฿50,000', totalWithdraw: '฿35,000', status: 'Active', registered: '2024-01-15' },
    { id: 2, username: 'player002', phone: '09x-xxx-5678', balance: '฿8,500', totalDeposit: '฿30,000', totalWithdraw: '฿21,500', status: 'Active', registered: '2024-01-14' },
    { id: 3, username: 'player003', phone: '09x-xxx-9012', balance: '฿0', totalDeposit: '฿10,000', totalWithdraw: '฿10,000', status: 'Suspended', registered: '2024-01-13' },
    { id: 4, username: 'player004', phone: '09x-xxx-3456', balance: '฿25,000', totalDeposit: '฿100,000', totalWithdraw: '฿75,000', status: 'Active', registered: '2024-01-12' },
    { id: 5, username: 'player005', phone: '09x-xxx-7890', balance: '฿3,200', totalDeposit: '฿20,000', totalWithdraw: '฿16,800', status: 'Active', registered: '2024-01-11' },
    { id: 6, username: 'player006', phone: '09x-xxx-2345', balance: '฿12,800', totalDeposit: '฿45,000', totalWithdraw: '฿32,200', status: 'Active', registered: '2024-01-10' },
    { id: 7, username: 'player007', phone: '09x-xxx-6789', balance: '฿0', totalDeposit: '฿5,000', totalWithdraw: '฿5,000', status: 'Inactive', registered: '2024-01-09' },
    { id: 8, username: 'player008', phone: '09x-xxx-0123', balance: '฿45,000', totalDeposit: '฿200,000', totalWithdraw: '฿155,000', status: 'VIP', registered: '2024-01-08' },
  ];

  return (
    <div className="members-page">
      <div className="page-header">
        <h1 className="page-title">Members Management</h1>
        <div className="page-actions">
          <button className="btn btn-primary">
            <FiPlus /> Add Member
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="filters-row">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by username or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Status:</label>
            <select>
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>Suspended</option>
              <option>VIP</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Date:</label>
            <input type="date" />
            <span>to</span>
            <input type="date" />
          </div>
          <button className="btn btn-secondary">Search</button>
        </div>
      </div>

      {/* Members Table */}
      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Phone</th>
              <th>Balance</th>
              <th>Total Deposit</th>
              <th>Total Withdraw</th>
              <th>Status</th>
              <th>Registered</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>{member.id}</td>
                <td style={{ fontWeight: 600 }}>{member.username}</td>
                <td>{member.phone}</td>
                <td style={{ fontWeight: 600, color: '#16a34a' }}>{member.balance}</td>
                <td>{member.totalDeposit}</td>
                <td>{member.totalWithdraw}</td>
                <td>
                  <span className={`badge ${
                    member.status === 'Active' ? 'badge-success' :
                    member.status === 'VIP' ? 'badge-info' :
                    member.status === 'Suspended' ? 'badge-danger' : 'badge-warning'
                  }`}>
                    {member.status}
                  </span>
                </td>
                <td>{member.registered}</td>
                <td>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px' }} title="View">
                      <FiEye />
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px' }} title="Edit">
                      <FiEdit2 />
                    </button>
                    <button className="btn btn-primary" style={{ padding: '6px 10px' }} title="Add Credit">
                      <FiDollarSign />
                    </button>
                    <button className="btn btn-danger" style={{ padding: '6px 10px' }} title="Delete">
                      <FiTrash2 />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <button>Previous</button>
          <button className="active">1</button>
          <button>2</button>
          <button>3</button>
          <button>...</button>
          <button>10</button>
          <button>Next</button>
        </div>
      </div>
    </div>
  );
};

export default Members;
