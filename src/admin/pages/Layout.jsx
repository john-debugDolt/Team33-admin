import { FiEdit, FiLayout, FiMonitor, FiSmartphone } from 'react-icons/fi';

const Layout = () => {
  return (
    <div className="content-inner">
      <div className="page-header">
        <h1><FiEdit style={{ marginRight: '10px' }} /> Layout Manager</h1>
        <p>Customize the website layout and design</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3><FiLayout /> Layout Settings</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div className="setting-card">
              <FiMonitor size={40} style={{ color: '#3b82f6', marginBottom: '10px' }} />
              <h4>Desktop Layout</h4>
              <p>Configure desktop view settings</p>
              <button className="btn btn-primary btn-sm">Configure</button>
            </div>
            <div className="setting-card">
              <FiSmartphone size={40} style={{ color: '#10b981', marginBottom: '10px' }} />
              <h4>Mobile Layout</h4>
              <p>Configure mobile view settings</p>
              <button className="btn btn-primary btn-sm">Configure</button>
            </div>
            <div className="setting-card">
              <FiLayout size={40} style={{ color: '#f59e0b', marginBottom: '10px' }} />
              <h4>Homepage Layout</h4>
              <p>Arrange homepage sections</p>
              <button className="btn btn-primary btn-sm">Configure</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
