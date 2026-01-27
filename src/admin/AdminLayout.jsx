import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from '../context/TranslationContext';
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
  FiKey
} from 'react-icons/fi';

const AdminLayout = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { t, currentLanguage, languages, changeLanguage } = useTranslation();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Lock body scroll when sidebar is open (mobile)
  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => document.body.classList.remove('sidebar-open');
  }, [sidebarOpen]);

  const formatDateTime = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const day = days[date.getDay()];
    return `--- ${date.getDate().toString().padStart(2, '0')} January ${date.getFullYear()} (${day}) ${date.toLocaleTimeString('en-GB')} --- To get latest Maintenance Announcement click →`;
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
      {/* Announcement Bar */}
      <div className="announcement-bar">
        {formatDateTime(currentTime)} <a href="#">Here</a>
      </div>

      {/* Top Header with Icons */}
      <header className="top-header">
        <div className="header-icons">
          <NavLink to="/chatlist" className={({ isActive }) => `header-icon-btn ${isActive ? 'active' : ''}`} title={t('chatList')}>
            <FiMessageSquare size={28} />
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
