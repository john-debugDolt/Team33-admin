import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMessageSquare, FiVolume2, FiVolumeX, FiUser, FiClock, FiRefreshCw, FiTrash2, FiInfo } from 'react-icons/fi';
import { adminChatService } from '../services/adminChatService';
import { chatStorageService } from '../../services/chatStorageService';
import { accountService } from '../../services/accountService';
import UserDetailsModal from '../components/UserDetailsModal';

// Play a short notification beep using the Web Audio API — no audio file needed.
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch { /* AudioContext blocked by browser policy — silently skip */ }
};

const ChatList = () => {
  const navigate = useNavigate();
  const [soundOn, setSoundOn] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState('');
  const [accountsByid, setAccountsByid] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  // Track which session IDs are "newly unread" since last poll so we can
  // flash them. Keyed by sessionId, value = timestamp of first detection.
  const [flashIds, setFlashIds] = useState({});
  const prevUnreadRef = useRef({});
  const soundOnRef = useRef(soundOn);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);

  const openUserDetails = (e, chat) => {
    e.stopPropagation();
    if (!chat?.accountId) return;
    const acct = accountsByid[chat.accountId] || {};
    setSelectedUser({
      accountId: chat.accountId,
      firstName: acct.firstName || '',
      lastName: acct.lastName || '',
      phoneNumber: acct.phoneNumber || '',
      email: acct.email || '',
      ...acct,
    });
  };

  // Request browser notification permission once on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const filters = ['ALL', 'WAITING', 'ACTIVE', 'CLOSED'];

  const handleDeleteChat = async (e, chat) => {
    e.stopPropagation();
    if (!confirm(`Delete chat with ${chat.username}? This cannot be undone.`)) return;
    try {
      if (chat.status !== 'CLOSED') {
        await adminChatService.closeSession(chat.sessionId);
      }
      chatStorageService.deleteSession(chat.sessionId);
      fetchSessions();
    } catch (err) {
      console.error('Delete chat error:', err);
      alert('Failed to delete chat');
    }
  };

  const parseDate = (dateString) => {
    if (!dateString) return null;
    const normalized = dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('-', 10)
      ? dateString
      : dateString + 'Z';
    return new Date(normalized);
  };

  const formatTimeAgo = (dateString) => {
    const date = parseDate(dateString);
    if (!date) return '';
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const fetchSessions = useCallback(async () => {
    try {
      const statusParam = activeFilter === 'ALL' ? null : activeFilter;
      const result = await adminChatService.getAllSessions(statusParam);

      if (result.success) {
        const formattedChats = result.sessions.map((session, index) => ({
          id: session.sessionId || session.id || index,
          sessionId: session.sessionId || session.id,
          accountId: session.accountId,
          username: session.userName || session.accountId || session.userId || 'Unknown User',
          subject: session.subject || 'General Inquiry',
          // Last message content is the primary preview
          message: session.lastMessage || session.subject || 'New chat session',
          // Sort key — prefer lastMessageAt so active chats bubble to top
          lastActivity: session.lastMessageAt || session.updatedAt || session.createdAt,
          time: formatTimeAgo(session.lastMessageAt || session.updatedAt || session.createdAt),
          unread: session.unreadCount || 0,
          status: session.status || 'WAITING',
          createdAt: session.createdAt,
        }));

        // Sort: unread WAITING first, then by most recent activity
        formattedChats.sort((a, b) => {
          // Unread WAITING sessions always float to top
          const aUrgent = a.unread > 0 && a.status === 'WAITING' ? 1 : 0;
          const bUrgent = b.unread > 0 && b.status === 'WAITING' ? 1 : 0;
          if (bUrgent !== aUrgent) return bUrgent - aUrgent;
          // Then any unread
          const aUnread = a.unread > 0 ? 1 : 0;
          const bUnread = b.unread > 0 ? 1 : 0;
          if (bUnread !== aUnread) return bUnread - aUnread;
          // Then by most recent activity
          return new Date(b.lastActivity) - new Date(a.lastActivity);
        });

        // Detect newly-unread sessions since last poll — flash, sound, notification
        const newlyUnread = [];
        setFlashIds((prev) => {
          const next = { ...prev };
          const now = Date.now();
          formattedChats.forEach((c) => {
            const prevUnread = prevUnreadRef.current[c.sessionId] ?? 0;
            if (c.unread > prevUnread) {
              next[c.sessionId] = now;
              // Only fire alerts if prevUnread is defined (not first load)
              if (c.sessionId in prevUnreadRef.current) {
                newlyUnread.push(c);
              }
            }
            // Remove flash after 4 seconds
            if (next[c.sessionId] && now - next[c.sessionId] > 4000) {
              delete next[c.sessionId];
            }
          });
          return next;
        });

        // After state update, fire sound + browser notification for new messages
        if (newlyUnread.length > 0) {
          if (soundOnRef.current) playBeep();
          if ('Notification' in window && Notification.permission === 'granted') {
            newlyUnread.forEach((c) => {
              new Notification('New message — Team33 Support', {
                body: `${c.username}: ${c.message || 'New message'}`,
                icon: '/favicon.ico',
                tag: c.sessionId,
              });
            });
          }
        }

        // Update the prev-unread snapshot
        prevUnreadRef.current = Object.fromEntries(
          formattedChats.map((c) => [c.sessionId, c.unread])
        );

        setChats(formattedChats);
        setDataSource(result.source || '');
        setError(result.error || null);

        setAccountsByid((prev) => {
          const missing = formattedChats
            .map((c) => c.accountId)
            .filter((id) => id && !(id in prev));
          const unique = Array.from(new Set(missing));
          unique.forEach((id) => {
            accountService.getAccount(id).then((res) => {
              if (res.success) {
                setAccountsByid((cur) => ({ ...cur, [id]: res.account }));
              }
            }).catch(() => {});
          });
          return prev;
        });
      } else {
        setError(result.error || 'Failed to fetch sessions');
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    setLoading(true);
    fetchSessions();
    const pollInterval = setInterval(fetchSessions, 5000);
    return () => clearInterval(pollInterval);
  }, [fetchSessions]);

  const handleChatClick = (chat) => {
    navigate(`/chat/${chat.sessionId}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'WAITING': return '#f59e0b';
      case 'ACTIVE':  return '#22c55e';
      case 'CLOSED':  return '#6b7280';
      default:        return '#6b7280';
    }
  };

  const getLeftBorder = (chat) => {
    if (chat.unread > 0) return '4px solid #3b82f6';
    if (chat.status === 'WAITING') return '4px solid #f59e0b';
    if (chat.status === 'ACTIVE')  return '4px solid #22c55e';
    return '4px solid transparent';
  };

  const filteredChats = activeFilter === 'ALL'
    ? chats
    : chats.filter(c => c.status === activeFilter);

  const totalUnread = chats.reduce((s, c) => s + (c.unread || 0), 0);
  const waitingCount = chats.filter(c => c.status === 'WAITING').length;

  // Show unread count in browser tab title so staff sees it even when the tab is not focused
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) Live Chats — Admin` : 'Live Chats — Admin';
    return () => { document.title = 'Team33 Admin'; };
  }, [totalUnread]);

  return (
    <div className="chat-list-page">
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes chatFlash {
          0%, 100% { background: transparent; }
          25%  { background: rgba(59,130,246,0.12); }
          50%  { background: rgba(59,130,246,0.20); }
          75%  { background: rgba(59,130,246,0.12); }
        }
        @keyframes unreadPulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.18); }
        }
        .spin { animation: spin 1s linear infinite; }
        .chat-row-flash { animation: chatFlash 0.9s ease-in-out 2; }
        .unread-badge { animation: unreadPulse 1.4s ease-in-out infinite; }
      `}</style>

      {/* Header summary bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '10px 20px',
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        flexWrap: 'wrap',
      }}>
        <div style={{ fontWeight: 700, fontSize: '16px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiMessageSquare size={18} />
          Live Chats
          {totalUnread > 0 && (
            <span className="unread-badge" style={{
              background: '#dc2626', color: '#fff',
              borderRadius: '999px', padding: '2px 10px',
              fontSize: '12px', fontWeight: 700,
            }}>
              {totalUnread} new
            </span>
          )}
          {waitingCount > 0 && (
            <span style={{
              background: '#fef3c7', color: '#92400e',
              border: '1px solid #fde68a',
              borderRadius: '999px', padding: '2px 10px',
              fontSize: '12px', fontWeight: 600,
            }}>
              {waitingCount} waiting
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
          <button
            className="btn btn-sm btn-secondary"
            onClick={fetchSessions}
            disabled={loading}
            title="Refresh"
          >
            <FiRefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
          <button
            className={`btn btn-sm ${soundOn ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSoundOn(!soundOn)}
          >
            {soundOn ? <FiVolume2 size={14} /> : <FiVolumeX size={14} />}
            <span style={{ marginLeft: '6px' }}>{soundOn ? 'Sound On' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="chat-filters" style={{ borderBottom: '1px solid #e5e7eb' }}>
        {filters.map((filter) => {
          const count = filter === 'ALL'
            ? chats.length
            : chats.filter(c => c.status === filter).length;
          const hasUnread = filter === 'WAITING'
            ? chats.some(c => c.status === 'WAITING' && c.unread > 0)
            : false;
          return (
            <button
              key={filter}
              className={`chat-filter-link ${activeFilter === filter ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter)}
              style={{ position: 'relative' }}
            >
              {filter}
              {count > 0 && (
                <span style={{
                  marginLeft: '6px',
                  background: activeFilter === filter ? 'rgba(255,255,255,0.3)' : '#e5e7eb',
                  color: activeFilter === filter ? '#fff' : '#374151',
                  borderRadius: '999px',
                  padding: '1px 7px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}>
                  {count}
                </span>
              )}
              {hasUnread && (
                <span style={{
                  position: 'absolute', top: '6px', right: '2px',
                  width: '7px', height: '7px',
                  background: '#dc2626', borderRadius: '50%',
                  animation: 'unreadPulse 1.4s ease-in-out infinite',
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          color: '#dc2626', padding: '10px 15px', margin: '10px 15px',
          borderRadius: '8px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{error}</span>
          <button onClick={fetchSessions} style={{
            background: '#dc2626', color: '#fff', border: 'none',
            padding: '5px 10px', borderRadius: '4px', cursor: 'pointer',
          }}>
            Retry
          </button>
        </div>
      )}

      {dataSource && dataSource !== 'api' && chats.length > 0 && (
        <div style={{
          padding: '8px 15px', background: '#fef3c7',
          color: '#92400e', fontSize: '12px',
          margin: '0 15px 10px', borderRadius: '6px',
        }}>
          Showing cached data — live server may differ.
        </div>
      )}

      {/* Chat rows */}
      <div className="content-inner">
        {loading && chats.length === 0 ? (
          <div className="empty-state">
            <div style={{
              width: '40px', height: '40px',
              border: '3px solid #e5e7eb', borderTop: '3px solid #3b82f6',
              borderRadius: '50%', animation: 'spin 1s linear infinite',
              margin: '0 auto 15px',
            }} />
            <p className="empty-state-text">Loading chats…</p>
          </div>
        ) : filteredChats.length > 0 ? (
          <div className="card" style={{ overflow: 'hidden' }}>
            {filteredChats.map((chat) => {
              const isFlashing = !!flashIds[chat.sessionId];
              const hasUnread = chat.unread > 0;
              const acct = chat.accountId ? accountsByid[chat.accountId] : null;
              const fullName = acct ? `${acct.firstName || ''} ${acct.lastName || ''}`.trim() : '';
              const displayName = fullName || chat.username;

              return (
                <div
                  key={chat.id}
                  className={isFlashing ? 'chat-row-flash' : ''}
                  onClick={() => handleChatClick(chat)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 18px',
                    borderBottom: '1px solid #f3f4f6',
                    borderLeft: getLeftBorder(chat),
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    background: hasUnread
                      ? 'rgba(59,130,246,0.04)'
                      : chat.status === 'WAITING'
                        ? 'rgba(245,158,11,0.04)'
                        : '#fff',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = hasUnread
                    ? 'rgba(59,130,246,0.04)'
                    : chat.status === 'WAITING'
                      ? 'rgba(245,158,11,0.04)'
                      : '#fff'
                  }
                >
                  {/* Avatar */}
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    background: hasUnread ? '#dbeafe' : chat.status === 'WAITING' ? '#fef3c7' : '#f3f4f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginRight: '14px', flexShrink: 0, fontWeight: 700, fontSize: '16px',
                    color: hasUnread ? '#2563eb' : chat.status === 'WAITING' ? '#d97706' : '#6b7280',
                    position: 'relative',
                  }}>
                    {displayName.charAt(0).toUpperCase() || <FiUser size={18} />}
                    {/* Online dot for ACTIVE sessions */}
                    {chat.status === 'ACTIVE' && (
                      <span style={{
                        position: 'absolute', bottom: 1, right: 1,
                        width: '10px', height: '10px', background: '#22c55e',
                        borderRadius: '50%', border: '2px solid #fff',
                      }} />
                    )}
                  </div>

                  {/* Main content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Row 1: name + status badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{
                        fontWeight: hasUnread ? 700 : 600,
                        fontSize: '14px',
                        color: hasUnread ? '#111827' : '#374151',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        maxWidth: '160px',
                      }}>
                        {displayName}
                      </span>
                      <span style={{
                        fontSize: '10px', fontWeight: 600,
                        backgroundColor: getStatusColor(chat.status),
                        color: '#fff', padding: '2px 7px', borderRadius: '999px',
                        flexShrink: 0,
                      }}>
                        {chat.status}
                      </span>
                      {chat.accountId && (
                        <button
                          type="button"
                          onClick={(e) => openUserDetails(e, chat)}
                          title="View account details"
                          style={{
                            padding: '2px 7px', fontSize: '10px',
                            background: '#eef2ff', color: '#4338ca',
                            border: '1px solid #c7d2fe', borderRadius: '999px',
                            cursor: 'pointer', display: 'inline-flex',
                            alignItems: 'center', gap: '3px', flexShrink: 0,
                          }}
                        >
                          <FiInfo size={10} /> Details
                        </button>
                      )}
                    </div>

                    {/* Row 2: last message preview (primary info) */}
                    <p style={{
                      margin: 0,
                      color: hasUnread ? '#1e40af' : '#6b7280',
                      fontSize: '13px',
                      fontWeight: hasUnread ? 600 : 400,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {chat.message}
                    </p>

                    {/* Row 3: phone (if available) */}
                    {acct?.phoneNumber && (
                      <p style={{ margin: '2px 0 0', color: '#9ca3af', fontSize: '11px' }}>
                        📱 {acct.phoneNumber}
                      </p>
                    )}
                  </div>

                  {/* Right column: time + unread badge + delete */}
                  <div style={{
                    flexShrink: 0, marginLeft: '12px',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'flex-end', gap: '6px',
                  }}>
                    <span style={{ fontSize: '11px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                      <FiClock size={11} style={{ marginRight: '3px', verticalAlign: 'middle' }} />
                      {chat.time}
                    </span>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {hasUnread && (
                        <span
                          className="unread-badge"
                          style={{
                            background: '#dc2626', color: '#fff',
                            borderRadius: '999px', minWidth: '22px', height: '22px',
                            padding: '0 7px', fontSize: '12px', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {chat.unread}
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDeleteChat(e, chat)}
                        title="Delete chat"
                        style={{
                          background: 'transparent', border: 'none',
                          cursor: 'pointer', padding: '4px', borderRadius: '4px',
                          color: '#d1d5db', transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = '#fee2e2'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <FiMessageSquare size={48} style={{ opacity: 0.3, marginBottom: '15px' }} />
            <p className="empty-state-text">
              {activeFilter === 'ALL' ? 'No chat sessions yet' : `No ${activeFilter.toLowerCase()} chats`}
            </p>
            {activeFilter !== 'ALL' && (
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setActiveFilter('ALL')}
                style={{ marginTop: '10px' }}
              >
                View All Chats
              </button>
            )}
          </div>
        )}
      </div>

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
};

export default ChatList;
