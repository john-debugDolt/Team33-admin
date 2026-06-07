import { useEffect, useState } from 'react';
import {
  getCheckinBonusCampaigns,
  createCheckinBonusCampaign,
  setCheckinBonusCampaignActive,
} from '../../services/apiService';

/**
 * Daily Check-in Bonus admin manager.
 *
 * One active campaign at a time (the schema doesn't enforce this — admins
 * must deactivate the old one before activating a new one). The list view
 * shows every campaign including soft-disabled ones so old campaigns can
 * be re-enabled instead of recreated.
 */
export default function CheckinBonus() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    displayName: '',
    description: '',
    dailyAmount: '',
    days: '',
    active: true,
  });
  const [togglingId, setTogglingId] = useState(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    const r = await getCheckinBonusCampaigns();
    setLoading(false);
    if (r.success) setCampaigns(Array.isArray(r.data) ? r.data : []);
    else setError(r.error || 'Failed to load campaigns');
  };

  useEffect(() => { refresh(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const dailyAmount = Number(form.dailyAmount);
    const days = Number(form.days);
    if (!form.displayName.trim()) return setError('Display name is required');
    if (!(dailyAmount >= 0.01)) return setError('Daily amount must be at least 0.01');
    if (!(days >= 1 && days <= 365)) return setError('Days must be between 1 and 365');

    setSaving(true);
    setError(null);
    const r = await createCheckinBonusCampaign({
      displayName: form.displayName.trim(),
      description: form.description.trim() || undefined,
      dailyAmount,
      days,
      active: form.active,
    });
    setSaving(false);

    if (r.success) {
      setShowCreate(false);
      setForm({ displayName: '', description: '', dailyAmount: '', days: '', active: true });
      refresh();
    } else {
      setError(r.error || 'Failed to create campaign');
    }
  };

  const handleToggle = async (campaign) => {
    setTogglingId(campaign.id);
    const r = await setCheckinBonusCampaignActive(campaign.id, !campaign.active);
    setTogglingId(null);
    if (r.success) refresh();
    else setError(r.error || 'Toggle failed');
  };

  const fmtMoney = (n) => `$${(Number(n) || 0).toFixed(2)}`;
  const fmtDate = (s) => (s ? new Date(s).toLocaleString() : '-');

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Check-in Bonus</h1>
        <button className="btn btn-primary" onClick={() => { setError(null); setShowCreate(true); }}>
          + New Campaign
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showCreate && (
        <form className="form-card" onSubmit={handleCreate} style={{ marginBottom: 24, padding: 20, background: '#1a1a2e', borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Create campaign</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>
              Display name *
              <input
                type="text"
                maxLength={120}
                required
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="7-Day Login Bonus"
              />
            </label>
            <label>
              Daily amount (AUD) *
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.dailyAmount}
                onChange={(e) => setForm({ ...form, dailyAmount: e.target.value })}
                placeholder="5.00"
              />
            </label>
            <label>
              Days *
              <input
                type="number"
                min="1"
                max="365"
                required
                value={form.days}
                onChange={(e) => setForm({ ...form, days: e.target.value })}
                placeholder="7"
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 22 }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Activate on save
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              Description
              <textarea
                maxLength={2000}
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Claim $5 every day for 7 days"
              />
            </label>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Create'}
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#a7f3d0', marginTop: 12 }}>
            Tip: only one campaign should be active at a time. Toggle the old one off below before
            activating a new one — the backend does not enforce this.
          </p>
        </form>
      )}

      {loading ? (
        <div className="loading">Loading campaigns…</div>
      ) : campaigns.length === 0 ? (
        <div className="empty-state">No campaigns yet. Click "+ New Campaign" to create one.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Daily amount</th>
              <th>Days</th>
              <th>Status</th>
              <th>Created</th>
              <th>By</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>
                  <div><strong>{c.displayName}</strong></div>
                  {c.description && <div className="small" style={{ color: '#a7f3d0' }}>{c.description}</div>}
                </td>
                <td>{fmtMoney(c.dailyAmount)}</td>
                <td>{c.days}</td>
                <td>
                  <span className={`status-badge ${c.active ? 'completed' : 'failed'}`}>
                    {c.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td className="small">{fmtDate(c.createdAt)}</td>
                <td className="small">{c.createdBy || '-'}</td>
                <td>
                  <button
                    className="btn"
                    disabled={togglingId === c.id}
                    onClick={() => handleToggle(c)}
                  >
                    {togglingId === c.id ? '…' : (c.active ? 'Deactivate' : 'Activate')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
