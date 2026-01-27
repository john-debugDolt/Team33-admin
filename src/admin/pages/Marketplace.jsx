import { FiPackage, FiDownload, FiStar, FiCheck } from 'react-icons/fi';

const Marketplace = () => {
  const plugins = [
    { id: 1, name: 'Live Casino Integration', description: 'Connect to premium live casino providers', rating: 4.8, downloads: 1250, installed: true, price: 'Free' },
    { id: 2, name: 'Sports Betting Module', description: 'Full sports betting functionality with live odds', rating: 4.5, downloads: 890, installed: false, price: '$199' },
    { id: 3, name: 'Affiliate System', description: 'Complete affiliate and referral tracking system', rating: 4.7, downloads: 2100, installed: true, price: 'Free' },
    { id: 4, name: 'VIP Rewards Program', description: 'Tiered VIP system with automatic upgrades', rating: 4.9, downloads: 1560, installed: false, price: '$99' },
    { id: 5, name: 'Crypto Payments', description: 'Accept Bitcoin, Ethereum, and more cryptocurrencies', rating: 4.6, downloads: 780, installed: false, price: '$149' },
    { id: 6, name: 'Tournament System', description: 'Host slot tournaments and leaderboard competitions', rating: 4.4, downloads: 650, installed: false, price: '$79' },
  ];

  return (
    <div className="content-inner">
      <div className="page-header">
        <h1><FiPackage style={{ marginRight: '10px' }} /> Marketplace</h1>
        <p>Browse and install plugins to extend functionality</p>
      </div>

      <div className="filter-bar">
        <input type="text" className="form-input" placeholder="Search plugins..." style={{ maxWidth: '300px' }} />
        <select className="form-select" style={{ maxWidth: '150px' }}>
          <option>All Categories</option>
          <option>Games</option>
          <option>Payments</option>
          <option>Marketing</option>
          <option>Security</option>
        </select>
      </div>

      <div className="plugins-grid">
        {plugins.map(plugin => (
          <div key={plugin.id} className="plugin-card">
            <div className="plugin-icon">
              <FiPackage size={32} />
            </div>
            <h3>{plugin.name}</h3>
            <p>{plugin.description}</p>
            <div className="plugin-meta">
              <span className="rating"><FiStar style={{ color: '#f59e0b' }} /> {plugin.rating}</span>
              <span className="downloads"><FiDownload /> {plugin.downloads}</span>
            </div>
            <div className="plugin-footer">
              <span className="price">{plugin.price}</span>
              {plugin.installed ? (
                <button className="btn btn-success btn-sm" disabled>
                  <FiCheck /> Installed
                </button>
              ) : (
                <button className="btn btn-primary btn-sm">
                  Install
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Marketplace;
