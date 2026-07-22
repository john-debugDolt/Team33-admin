import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/TranslationContext';
import { keycloakService } from '../services/keycloakService';
import { adminChatService } from './services/adminChatService';
import {
  FiMessageSquare,
  FiRepeat,
  FiGrid,
  FiUser,
  FiTrendingUp,
  FiMenu,
  FiX,
  FiGift,
  FiUsers,
  FiDollarSign,
  FiMail,
  FiCreditCard,
  FiUserCheck,
  FiSpeaker,
  FiMonitor,
  FiSettings,
  FiLayout,
  FiDroplet,
  FiEdit,
  FiFile,
  FiTool,
  FiLock,
  FiUserX,
  FiShoppingCart,
  FiMessageCircle,
  FiGlobe,
  FiCode,
  FiPackage,
  FiFileText,
  FiKey,
  FiLogOut
} from 'react-icons/fi';

const TIMEZONES = [
  { value: 'Australia/Melbourne', label: 'Melbourne (VIC)' },
  { value: 'Australia/Sydney', label: 'Sydney (NSW)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (QLD)' },
  { value: 'Australia/Adelaide', label: 'Adelaide (SA)' },
  { value: 'Australia/Perth', label: 'Perth (WA)' },
  { value: 'Australia/Hobart', label: 'Hobart (TAS)' },
  { value: 'Australia/Darwin', label: 'Darwin (NT)' },
  { value: 'Australia/Canberra', label: 'Canberra (ACT)' },
  { value: 'Asia/Kuala_Lumpur', label: 'Malaysia (MYT)' },
];

const DEFAULT_TZ = 'Australia/Melbourne';

// ─── Global chat alert helpers ────────────────────────────────────────────────
// Shared AudioContext — created/resumed on first user gesture so Chrome allows it.
let _audioCtx = null;
const getAudioCtx = () => {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
};
const globalBeep = () => {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
  } catch {}
};
// ─────────────────────────────────────────────────────────────────────────────

const AdminLayout = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const prevUnreadRef = useRef({});
  // Read soundOn from localStorage so it stays in sync with ChatList's toggle
  const getSoundOn = () => {
    try { return localStorage.getItem('admin_chat_sound') !== 'false'; } catch { return true; }
  };
  const [timezone, setTimezone] = useState(() => {
    try {
      return localStorage.getItem('admin_tz') || DEFAULT_TZ;
    } catch {
      return DEFAULT_TZ;
    }
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { t, currentLanguage, languages, changeLanguage } = useTranslation();

  // Get current user from Keycloak service
  const currentUser = keycloakService.getCurrentUser();

  // Handle logout - clears tokens and redirects to login
  const handleLogout = () => {
    keycloakService.logout();
    navigate('/login');
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Global chat notification polling ──────────────────────────────────────
  // Runs on every page so staff get alerts regardless of which screen they're on.
  const pollChat = useCallback(async () => {
    try {
      const result = await adminChatService.getAllSessions(null);
      if (!result.success) return;

      const sessions = result.sessions || [];
      const totalUnread = sessions.reduce((s, c) => s + (Number(c.unreadCount) || 0), 0);
      setChatUnread(totalUnread);

      // Detect newly-unread sessions synchronously before updating the ref
      const newlyUnread = sessions.filter((s) => {
        const prev = prevUnreadRef.current[s.sessionId] ?? 0;
        return (Number(s.unreadCount) || 0) > prev && s.sessionId in prevUnreadRef.current;
      });

      // Snapshot for next poll
      prevUnreadRef.current = Object.fromEntries(
        sessions.map((s) => [s.sessionId, Number(s.unreadCount) || 0])
      );

      if (newlyUnread.length === 0) return;

      // Sound alert
      if (getSoundOn()) globalBeep();

      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        newlyUnread.forEach((s) => {
          new Notification('New message — Team33 Support', {
            body: `${s.userName || s.accountId || 'Player'}: ${s.lastMessage || 'New message'}`,
            icon: '/favicon.ico',
            tag: s.sessionId,
          });
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    pollChat();
    const id = setInterval(pollChat, 5000);
    return () => clearInterval(id);
  }, [pollChat]);
  // ─────────────────────────────────────────────────────────────────────────

  // Lock body scroll when sidebar is open (mobile)
  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => document.body.classList.remove('sidebar-open');
  }, [sidebarOpen]);

  const formatDate = (date) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);

  const formatTime = (date) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);

  const handleTimezoneChange = (e) => {
    const tz = e.target.value;
    setTimezone(tz);
    try {
      localStorage.setItem('admin_tz', tz);
    } catch { /* ignore */ }
  };

  // First section of sidebar menu
  const sidebarMenuTop = [
    { icon: <FiEdit />, labelKey: 'layout', path: '/layout' },
    { icon: <FiFile />, labelKey: 'managePage', path: '/manage-page' },
    { icon: <FiMonitor />, labelKey: 'adminTool', path: '/admin-tool' },
    { icon: <FiTool />, labelKey: 'tools', path: '/tools' },
    { icon: <FiLock />, labelKey: 'securityMenu', path: '/security' },
    { icon: <FiUserX />, labelKey: 'blacklist', path: '/blacklist' },
    { icon: <FiShoppingCart />, labelKey: 'paymentMenu', path: '/payment' },
    { icon: <FiMessageCircle />, labelKey: 'messagingMenu', path: '/messaging' },
    { icon: <FiGlobe />, labelKey: 'domain', path: '/domain' },
    { icon: <FiCode />, labelKey: 'manageAPI', path: '/manage-api' },
    { icon: <FiPackage />, labelKey: 'marketplace', path: '/marketplace' },
    { icon: <FiFileText />, labelKey: 'changelog', path: '/changelog' },
    { icon: <FiKey />, labelKey: 'passwordMenu', path: '/password' },
  ];

  // Second section of sidebar menu
  const sidebarMenuBottom = [
    { icon: <FiGift />, labelKey: 'rebate', path: '/rebate' },
    { icon: <FiUsers />, labelKey: 'referrer', path: '/referrer' },
    { icon: <FiDollarSign />, labelKey: 'commissionMenu', path: '/commission' },
    { icon: <FiMail />, labelKey: 'sms', path: '/sms' },
    { icon: <FiCreditCard />, labelKey: 'manageBank', path: '/manage-bank' },
    { icon: <FiUserCheck />, labelKey: 'manageStaff', path: '/manage-staff' },
    { icon: <FiSpeaker />, labelKey: 'promotionMenu', path: '/promotion' },
    { icon: <FiGift />, label: 'Check-in Bonus', path: '/checkin-bonus' },
    { icon: <FiMonitor />, labelKey: 'gameKiosk', path: '/game-kiosk' },
    { icon: <FiSettings />, labelKey: 'gameSetting', path: '/game-setting' },
    { icon: <FiSettings />, labelKey: 'settingMenu', path: '/setting' },
    { icon: <FiLayout />, labelKey: 'displayMenu', path: '/display' },
    { icon: <FiDroplet />, labelKey: 'themeMenu', path: '/theme' },
  ];

  const leftMenuItems = [
    { labelKey: 'transactions', path: '/transactions', hasArrow: true },
    { label: 'Customer', path: '/customers' },
    { label: 'Top Customer', path: '/top-customers' },
    { labelKey: 'promotionMenu', path: '/promotion-report' },
    { label: 'Bank', path: '/bank-report' },
    { labelKey: 'commissionMenu', path: '/commission-report' },
    { label: 'Payment Gateway', path: '/payment-gateway' },
    { labelKey: 'rebate', path: '/rebate-report' },
    { label: 'Manual / Other', path: '/manual' },
    { label: 'Lucky Number', path: '/lucky-number' },
    { label: 'Lucky Draw 4D', path: '/lucky-draw' },
    { label: 'Staff', path: '/staff-report' },
    { label: 'Activity Log', path: '/activity-log' },
    { label: 'Game WinLose', path: '/game-winlose' },
    { label: 'Feedback', path: '/feedback' },
    { label: 'Leaderboard', path: '/leaderboard' },
    { label: 'Top Referrer', path: '/top-referrer' },
  ];

  const showLeftSidebar = location.pathname.includes('report') || location.pathname === '/cashflow';

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleLanguageChange = (e) => {
    changeLanguage(e.target.value);
  };

  return (
    <div className="admin-layout">
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>
      {/* Top Time Bar */}
      <div className="time-bar">
        <div className="time-bar-left">
          <span className="time-bar-date">{formatDate(currentTime)}</span>
          <span className="time-bar-sep">·</span>
          <span className="time-bar-time">{formatTime(currentTime)}</span>
        </div>
        <div className="time-bar-right">
          <label className="tz-label" htmlFor="admin-tz-select">Timezone</label>
          <select
            id="admin-tz-select"
            className="tz-select"
            value={timezone}
            onChange={handleTimezoneChange}
          >
            {TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Header with Icons */}
      <header className="top-header">
        <div className="header-icons">
          <NavLink
            to="/chatlist"
            className={({ isActive }) => `header-icon-btn ${isActive ? 'active' : ''}`}
            title={t('chatList')}
            onClick={() => { try { getAudioCtx(); } catch {} }}
            style={{ position: 'relative' }}
          >
            <FiMessageSquare size={28} />
            {chatUnread > 0 && (
              <span style={{
                position: 'absolute', top: '2px', right: '2px',
                background: '#dc2626', color: '#fff',
                borderRadius: '999px', minWidth: '18px', height: '18px',
                fontSize: '10px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px', lineHeight: 1,
                animation: 'pulse 1.4s ease-in-out infinite',
              }}>
                {chatUnread > 99 ? '99+' : chatUnread}
              </span>
            )}
          </NavLink>
          <NavLink to="/transactions" className={({ isActive }) => `header-icon-btn ${isActive ? 'active' : ''}`} title={t('transactions')}>
            <FiRepeat size={28} />
          </NavLink>
          <NavLink to="/bank-tx" className={({ isActive }) => `header-icon-btn ${isActive ? 'active' : ''}`} title={t('bankTransactions')}>
            <FiGrid size={28} />
          </NavLink>
          <NavLink to="/users" className={({ isActive }) => `header-icon-btn ${isActive ? 'active' : ''}`} title={t('users')}>
            <FiUser size={28} />
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => `header-icon-btn ${isActive ? 'active' : ''}`} title={t('reports')}>
            <FiTrendingUp size={28} />
          </NavLink>
          <button className="header-icon-btn" onClick={toggleSidebar}>
            <FiMenu size={28} />
          </button>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      {/* Hamburger Sidebar */}
      <aside className={`hamburger-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="sidebar-close-btn" onClick={closeSidebar}>
            <FiX size={24} />
          </button>
        </div>

        <div className="sidebar-top-section">
          {/* User info display */}
          <div className="sidebar-user-info">
            <FiUser size={18} />
            <span className="sidebar-username">{currentUser?.username || 'Admin'}</span>
            {currentUser?.isAdmin && <span className="sidebar-role-badge">Admin</span>}
            {currentUser?.isStaff && !currentUser?.isAdmin && <span className="sidebar-role-badge staff">Staff</span>}
          </div>

          <select value={currentLanguage} onChange={handleLanguageChange} className="sidebar-select">
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
          <div className="sidebar-time">
            System: +08:00 Device: +11:00
          </div>

          {/* Logout button */}
          <button onClick={handleLogout} className="sidebar-logout-btn">
            <FiLogOut size={18} />
            <span>Logout</span>
          </button>
        </div>

        <div className="sidebar-menu-section">
          <ul className="sidebar-menu">
            {sidebarMenuBottom.map((item, index) => (
              <NavLink
                key={`bottom-${index}`}
                to={item.path}
                className={({ isActive }) => `sidebar-menu-item ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                {item.icon}
                <span>{t(item.labelKey)}</span>
              </NavLink>
            ))}
          </ul>
        </div>

        <div className="sidebar-divider"></div>

        <div className="sidebar-menu-section">
          <ul className="sidebar-menu">
            {sidebarMenuTop.map((item, index) => (
              <NavLink
                key={`top-${index}`}
                to={item.path}
                className={({ isActive }) => `sidebar-menu-item ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                {item.icon}
                <span>{t(item.labelKey)}</span>
              </NavLink>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Left Sidebar - Only on Reports pages */}
        {showLeftSidebar && (
          <aside className="left-sidebar">
            <div className="left-sidebar-header">
              <FiTrendingUp /> {t('reports')}
            </div>
            <ul className="left-sidebar-menu">
              {leftMenuItems.map((item, index) => (
                <NavLink
                  key={index}
                  to={item.path}
                  className={({ isActive }) =>
                    `left-sidebar-item ${isActive ? 'active' : ''} ${item.hasArrow ? 'has-arrow' : ''}`
                  }
                >
                  {item.labelKey ? t(item.labelKey) : item.label}
                </NavLink>
              ))}
            </ul>
          </aside>
        )}

        {/* Content Area */}
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
