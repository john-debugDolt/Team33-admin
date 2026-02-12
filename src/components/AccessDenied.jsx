import { FiLock } from 'react-icons/fi';

const AccessDenied = ({ message = "You don't have permission to access this page" }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'rgba(239, 68, 68, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.5rem'
      }}>
        <FiLock size={40} color="#ef4444" />
      </div>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '0.5rem'
      }}>
        Access Denied
      </h2>
      <p style={{
        fontSize: '1rem',
        color: '#6b7280',
        maxWidth: '400px'
      }}>
        {message}
      </p>
    </div>
  );
};

export default AccessDenied;
