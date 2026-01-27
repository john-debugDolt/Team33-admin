import { FiUsers, FiDollarSign, FiTrendingUp, FiActivity, FiUserPlus, FiCreditCard } from 'react-icons/fi';

const Dashboard = () => {
  const stats = [
    { icon: <FiUsers />, label: 'Total Members', value: '12,458', color: 'blue' },
    { icon: <FiUserPlus />, label: 'New Today', value: '145', color: 'green' },
    { icon: <FiDollarSign />, label: 'Total Deposits', value: '฿2.5M', color: 'gold' },
    { icon: <FiCreditCard />, label: 'Total Withdrawals', value: '฿1.8M', color: 'orange' },
    { icon: <FiTrendingUp />, label: 'Profit Today', value: '฿125K', color: 'purple' },
    { icon: <FiActivity />, label: 'Active Now', value: '892', color: 'pink' },
  ];

  const recentTransactions = [
    { id: 1, user: 'john_doe', type: 'Deposit', amount: '฿5,000', status: 'Completed', time: '2 min ago' },
    { id: 2, user: 'jane_smith', type: 'Withdrawal', amount: '฿3,500', status: 'Pending', time: '5 min ago' },
    { id: 3, user: 'mike_wong', type: 'Deposit', amount: '฿10,000', status: 'Completed', time: '8 min ago' },
    { id: 4, user: 'sarah_lee', type: 'Withdrawal', amount: '฿2,000', status: 'Completed', time: '12 min ago' },
    { id: 5, user: 'alex_chan', type: 'Deposit', amount: '฿7,500', status: 'Completed', time: '15 min ago' },
  ];

  const recentMembers = [
    { id: 1, username: 'player001', phone: '09x-xxx-1234', registered: '2 hours ago', status: 'Active' },
    { id: 2, username: 'player002', phone: '09x-xxx-5678', registered: '3 hours ago', status: 'Active' },
    { id: 3, username: 'player003', phone: '09x-xxx-9012', registered: '5 hours ago', status: 'Pending' },
    { id: 4, username: 'player004', phone: '09x-xxx-3456', registered: '6 hours ago', status: 'Active' },
  ];

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className={`stat-icon ${stat.color}`}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <h4>{stat.label}</h4>
              <p>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Recent Transactions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Transactions</h3>
            <button className="btn btn-secondary btn-sm">View All</button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td><strong>{tx.user}</strong></td>
                    <td>
                      <span className={`badge ${tx.type === 'Deposit' ? 'badge-success' : 'badge-warning'}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td><strong>{tx.amount}</strong></td>
                    <td>
                      <span className={`badge ${tx.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="text-muted">{tx.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Members */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Members</h3>
            <button className="btn btn-secondary btn-sm">View All</button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Phone</th>
                  <th>Registered</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentMembers.map((member) => (
                  <tr key={member.id}>
                    <td><strong>{member.username}</strong></td>
                    <td>{member.phone}</td>
                    <td className="text-muted">{member.registered}</td>
                    <td>
                      <span className={`badge ${member.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                        {member.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
