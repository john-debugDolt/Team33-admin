import { useState, useEffect, useMemo } from 'react';
import { FiSettings, FiZap } from 'react-icons/fi';
import { getActiveHotChats } from '../../../services/apiService';
import HotChatsManager from './HotChatsManager';
import './HotChats.css';

/**
 * Hot Chats Bar — quick-reply chips that appear above the chat input.
 * Click a chip → invokes onSelect(content) which the parent uses to send.
 *
 * Props:
 * - onSelect(content): called when a chip is clicked
 * - disabled: hides click interaction (e.g. while a message is sending)
 */
export default function HotChatsBar({ onSelect, disabled = false }) {
  const [hotChats, setHotChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [managerOpen, setManagerOpen] = useState(false);

  const loadActive = async () => {
    setLoading(true);
    const result = await getActiveHotChats();
    if (result.success && Array.isArray(result.data)) {
      setHotChats(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadActive();
    // Refresh on tab focus
    const onFocus = () => loadActive();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Group categories for the filter strip
  const categories = useMemo(() => {
    const set = new Set(hotChats.map((h) => h.category || 'GENERAL'));
    return ['ALL', ...[...set].sort()];
  }, [hotChats]);

  const visible = useMemo(() => {
    const filtered = activeCategory === 'ALL'
      ? hotChats
      : hotChats.filter((h) => (h.category || 'GENERAL') === activeCategory);
    return [...filtered].sort((a, b) => {
      const c = (a.category || '').localeCompare(b.category || '');
      if (c !== 0) return c;
      const s = (a.sortOrder || 0) - (b.sortOrder || 0);
      if (s !== 0) return s;
      return a.id - b.id;
    });
  }, [hotChats, activeCategory]);

  return (
    <div className="hot-chats-bar">
      <div className="hot-chats-header">
        <div className="hot-chats-categories">
          <span className="hot-chats-icon"><FiZap size={13} /></span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`hot-chats-cat-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="hot-chats-manage-btn"
          onClick={() => setManagerOpen(true)}
          title="Manage hot chats"
        >
          <FiSettings size={14} />
          <span>Manage</span>
        </button>
      </div>

      <div className="hot-chats-strip">
        {loading && <span className="hot-chats-empty">Loading…</span>}
        {!loading && visible.length === 0 && (
          <span className="hot-chats-empty">
            No hot chats yet. Click <strong>Manage</strong> to add one.
          </span>
        )}
        {!loading && visible.map((h) => (
          <button
            key={h.id}
            type="button"
            className="hot-chat-chip"
            disabled={disabled}
            title={h.content}
            onClick={() => onSelect?.(h.content)}
          >
            {h.title}
          </button>
        ))}
      </div>

      {managerOpen && (
        <HotChatsManager
          onClose={() => {
            setManagerOpen(false);
            loadActive();
          }}
        />
      )}
    </div>
  );
}
