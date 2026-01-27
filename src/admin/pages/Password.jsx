import { useState } from 'react';
import { FiKey, FiLock, FiEye, FiEyeOff, FiCheck, FiX } from 'react-icons/fi';

const Password = () => {
  const [showPasswords, setShowPasswords] = useState({});
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const toggleShow = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const passwordRequirements = [
    { text: 'At least 8 characters', met: formData.newPassword.length >= 8 },
    { text: 'Contains uppercase letter', met: /[A-Z]/.test(formData.newPassword) },
    { text: 'Contains lowercase letter', met: /[a-z]/.test(formData.newPassword) },
    { text: 'Contains a number', met: /[0-9]/.test(formData.newPassword) },
    { text: 'Contains special character', met: /[!@#$%^&*]/.test(formData.newPassword) },
  ];

  const passwordsMatch = formData.newPassword && formData.newPassword === formData.confirmPassword;

  return (
    <div className="content-inner">
      <div className="page-header">
        <h1><FiKey style={{ marginRight: '10px' }} /> Password Settings</h1>
        <p>Update your admin password</p>
      </div>

      <div className="two-column-grid">
        <div className="card">
          <div className="card-header">
            <h3><FiLock /> Change Password</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label>Current Password</label>
              <div className="password-input">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter current password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                />
                <button className="toggle-btn" onClick={() => toggleShow('current')}>
                  {showPasswords.current ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>New Password</label>
              <div className="password-input">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter new password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                />
                <button className="toggle-btn" onClick={() => toggleShow('new')}>
                  {showPasswords.new ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <div className="password-input">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
                <button className="toggle-btn" onClick={() => toggleShow('confirm')}>
                  {showPasswords.confirm ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {formData.confirmPassword && (
                <span className={`match-indicator ${passwordsMatch ? 'match' : 'no-match'}`}>
                  {passwordsMatch ? <><FiCheck /> Passwords match</> : <><FiX /> Passwords do not match</>}
                </span>
              )}
            </div>

            <button
              className="btn btn-primary"
              disabled={!formData.currentPassword || !passwordsMatch || passwordRequirements.some(r => !r.met)}
            >
              Update Password
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Password Requirements</h3>
          </div>
          <div className="card-body">
            <ul className="requirements-list">
              {passwordRequirements.map((req, i) => (
                <li key={i} className={req.met ? 'met' : ''}>
                  {req.met ? <FiCheck style={{ color: '#10b981' }} /> : <FiX style={{ color: '#ccc' }} />}
                  {req.text}
                </li>
              ))}
            </ul>

            <div className="password-tips">
              <h4>Security Tips</h4>
              <ul>
                <li>Never share your password with anyone</li>
                <li>Use a unique password for this account</li>
                <li>Consider using a password manager</li>
                <li>Change your password regularly</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Password;
