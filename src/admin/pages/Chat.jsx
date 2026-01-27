import { useState } from 'react';

const initialChats = [
  { id: 1, user: 'John Doe', lastMessage: 'I need help with my deposit', time: '2 mins ago', unread: 3, status: 'active' },
  { id: 2, user: 'Jane Smith', lastMessage: 'When will my withdrawal be processed?', time: '5 mins ago', unread: 1, status: 'active' },
  { id: 3, user: 'Mike Johnson', lastMessage: 'Thank you for your help!', time: '15 mins ago', unread: 0, status: 'closed' },
  { id: 4, user: 'Sarah Wilson', lastMessage: 'How do I verify my account?', time: '30 mins ago', unread: 2, status: 'active' },
  { id: 5, user: 'Tom Brown', lastMessage: 'My game is not loading', time: '1 hour ago', unread: 0, status: 'waiting' },
];

const chatMessages = {
  1: [
    { id: 1, sender: 'user', text: 'Hello, I need help with my deposit', time: '14:30' },
    { id: 2, sender: 'user', text: 'I made a transfer but it hasnt reflected yet', time: '14:31' },
    { id: 3, sender: 'user', text: 'Its been 2 hours already', time: '14:32' },
  ],
  2: [
    { id: 1, sender: 'user', text: 'Hi, I requested a withdrawal yesterday', time: '14:25' },
    { id: 2, sender: 'agent', text: 'Hello! Let me check that for you.', time: '14:26' },
    { id: 3, sender: 'user', text: 'When will my withdrawal be processed?', time: '14:28' },
  ],
  4: [
    { id: 1, sender: 'user', text: 'How do I verify my account?', time: '14:00' },
    { id: 2, sender: 'user', text: 'I uploaded my documents but nothing happened', time: '14:01' },
  ],
};

export default function Chat() {
  const [chats, setChats] = useState(initialChats);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [filter, setFilter] = useState('all');

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    setMessages(chatMessages[chat.id] || []);
    setChats(chats.map(c => c.id === chat.id ? { ...c, unread: 0 } : c));
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat) return;
    const msg = { id: Date.now(), sender: 'agent', text: newMessage, time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) };
    setMessages([...messages, msg]);
    setNewMessage('');
    setChats(chats.map(c => c.id === selectedChat.id ? { ...c, lastMessage: newMessage, time: 'Just now' } : c));
  };

  const handleCloseChat = () => {
    if (selectedChat) {
      setChats(chats.map(c => c.id === selectedChat.id ? { ...c, status: 'closed' } : c));
      setSelectedChat({ ...selectedChat, status: 'closed' });
    }
  };

  const filteredChats = chats.filter(c => filter === 'all' || c.status === filter);
  const totalUnread = chats.reduce((sum, c) => sum + c.unread, 0);

  return (
    <div className="admin-chat-page">
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2>Support Chats</h2>
          {totalUnread > 0 && <span className="total-unread">{totalUnread}</span>}
        </div>
        <div className="chat-filter-tabs">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
          <button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>Active</button>
          <button className={filter === 'waiting' ? 'active' : ''} onClick={() => setFilter('waiting')}>Waiting</button>
          <button className={filter === 'closed' ? 'active' : ''} onClick={() => setFilter('closed')}>Closed</button>
        </div>
        <div className="chat-list">
          {filteredChats.map(chat => (
            <div key={chat.id} className={`chat-item ${chat.unread > 0 ? 'unread' : ''} ${selectedChat?.id === chat.id ? 'selected' : ''}`} onClick={() => handleSelectChat(chat)}>
              <div className="chat-avatar">{chat.user.charAt(0)}</div>
              <div className="chat-info">
                <div className="chat-name">{chat.user}</div>
                <div className="chat-preview">{chat.lastMessage}</div>
              </div>
              <div className="chat-meta">
                <div className="chat-time">{chat.time}</div>
                {chat.unread > 0 && <div className="chat-badge">{chat.unread}</div>}
                <div className={`chat-status-dot ${chat.status}`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-main">
        {selectedChat ? (
          <>
            <div className="chat-main-header">
              <div className="chat-user-info">
                <div className="chat-avatar">{selectedChat.user.charAt(0)}</div>
                <div>
                  <div className="chat-user-name">{selectedChat.user}</div>
                  <div className={`chat-user-status ${selectedChat.status}`}>{selectedChat.status}</div>
                </div>
              </div>
              <div className="chat-actions">
                {selectedChat.status !== 'closed' && (
                  <button className="admin-btn danger" onClick={handleCloseChat}>Close Chat</button>
                )}
              </div>
            </div>
            <div className="chat-messages">
              {messages.map(msg => (
                <div key={msg.id} className={`chat-message ${msg.sender}`}>
                  <div className="message-bubble">{msg.text}</div>
                  <div className="message-time">{msg.time}</div>
                </div>
              ))}
            </div>
            {selectedChat.status !== 'closed' && (
              <div className="chat-input-area">
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type a message..." />
                <button className="send-btn" onClick={handleSendMessage}>Send</button>
              </div>
            )}
          </>
        ) : (
          <div className="chat-empty">
            <div className="empty-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Choose a chat from the sidebar to start responding</p>
          </div>
        )}
      </div>
    </div>
  );
}
