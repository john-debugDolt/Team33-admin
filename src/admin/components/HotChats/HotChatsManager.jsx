import { useState, useEffect } from 'react';
import { FiX, FiPlus, FiTrash2, FiEdit2, FiCheck, FiEye, FiEyeOff } from 'react-icons/fi';
import {
  getAllHotChats,
  createHotChat,
  updateHotChat,
  setHotChatActive,
  deleteHotChat,
} from '../../../services/apiService';

const EMPTY = { title: '', content: '', category: 'GENERAL', sortOrder: 0, active: true };

/**
 * Hot Chats Manager — CRUD modal for staff to add/edit/disable/delete reusable replies.
 * Calls onClose() when dismissed; parent should refetch the active list afterwards.
 */
export default function HotChatsManager({ onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null = list view; object = edit form
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const r = await getAllHotChats();
    if (r.success && Array.isArray(r.data)) {
      setItems(r.data);
    } else {
      setError(r.error || 'Failed to load hot chats');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    if (!editing.title?.trim() || !editing.content?.trim()) {
      setError('Title and content are required');
      return;
    }
    setSaving(true);
    setError(null);

    const body = {
      title: editing.title.trim(),
      content: editing.content.trim(),
      category: (editing.category || 'GENERAL').trim().toUpperCase(),
      sortOrder: Number(editing.sortOrder) || 0,
      active: editing.active !== false,
    };

    const r = editing.id
      ? await updateHotChat(editing.id, body)
      : await createHotChat(body);

    setSaving(false);
    if (r.success) {
      setEditing(null);
      load();
    } else {
      setError(r.error || 'Save failed');
    }
  };

  const handleToggle = async (item) => {
    const r = await setHotChatActive(item.id, !item.active);
    if (r.success) load();
    else setError(r.error || 'Toggle failed');
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    const r = await deleteHotChat(item.id);
    if (r.success) load();
    else setError(r.error || 'Delete failed');
  };

  return (
    <div className="hot-chats-modal-backdrop" onClick={onClose}>
      <div className="hot-chats-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hot-chats-modal-header">
          <h3>Hot Chats</h3>
          <button type="button" className="hot-chats-modal-close" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        {error && <div className="hot-chats-error">{error}</div>}

        {editing ? (
          <div className="hot-chats-form">
            <label>
              <span>Title</span>
              <input
                type="text"
                maxLength={120}
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="e.g. Greeting"
              />
            </label>
            <label>
              <span>Content (sent into chat)</span>
              <textarea
                rows={4}
                maxLength={4000}
                value={editing.content}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                placeholder="The actual message that will be sent."
              />
            </label>
            <div className="hot-chats-form-row">
              <label>
                <span>Category</span>
                <input
                  type="text"
                  maxLength={50}
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value.toUpperCase() })}
                  placeholder="GENERAL"
                />
              </label>
              <label>
                <span>Sort order</span>
                <input
                  type="number"
                  value={editing.sortOrder}
                  onChange={(e) => setEditing({ ...editing, sortOrder: e.target.value })}
                />
              </label>
              <label className="hot-chats-checkbox">
                <input
                  type="checkbox"
                  checked={editing.active !== false}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                />
                <span>Active</span>
              </label>
            </div>
            <div className="hot-chats-form-actions">
              <button type="button" className="hot-chats-btn-secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="hot-chats-btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                <FiCheck size={14} /> {saving ? 'Saving…' : editing.id ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="hot-chats-toolbar">
              <button
                type="button"
                className="hot-chats-btn-primary"
                onClick={() => setEditing({ ...EMPTY })}
              >
                <FiPlus size={14} /> New hot chat
              </button>
              <span className="hot-chats-count">{items.length} total</span>
            </div>

            {loading ? (
              <div className="hot-chats-loading">Loading…</div>
            ) : items.length === 0 ? (
              <div className="hot-chats-empty-state">No hot chats yet.</div>
            ) : (
              <div className="hot-chats-list">
                {items.map((it) => (
                  <div key={it.id} className={`hot-chats-row ${!it.active ? 'inactive' : ''}`}>
                    <div className="hot-chats-row-main">
                      <div className="hot-chats-row-title">
                        <span className="hot-chats-cat-tag">{it.category || 'GENERAL'}</span>
                        <strong>{it.title}</strong>
                      </div>
                      <div className="hot-chats-row-content">{it.content}</div>
                      <div className="hot-chats-row-meta">
                        sort {it.sortOrder ?? 0}
                        {it.createdBy && ` · by ${it.createdBy}`}
                      </div>
                    </div>
                    <div className="hot-chats-row-actions">
                      <button
                        type="button"
                        className="hot-chats-icon-btn"
                        onClick={() => handleToggle(it)}
                        title={it.active ? 'Disable' : 'Enable'}
                      >
                        {it.active ? <FiEye size={14} /> : <FiEyeOff size={14} />}
                      </button>
                      <button
                        type="button"
                        className="hot-chats-icon-btn"
                        onClick={() => setEditing({ ...it })}
                        title="Edit"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="hot-chats-icon-btn danger"
                        onClick={() => handleDelete(it)}
                        title="Delete"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
