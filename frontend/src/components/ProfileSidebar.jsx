import { useState } from 'react';
import axios from 'axios';
import './ProfileSidebar.css';
import { BACKEND_URL } from '../config/runtime';

const API = BACKEND_URL;

export default function ProfileSidebar({ user, token, onUpdate, onLogout, open, onClose }) {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNew, setConfirmNew] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg({ text: '', type: '' });

    if (newPassword && newPassword !== confirmNew) {
      setMsg({ text: 'New passwords do not match.', type: 'error' });
      return;
    }

    const payload = {};
    if (displayName.trim() && displayName.trim() !== user?.displayName) {
      payload.displayName = displayName.trim();
    }
    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    if (Object.keys(payload).length === 0) {
      setMsg({ text: 'No changes to save.', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const res = await axios.put(`${API}/api/auth/profile`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { token: newToken, user: updatedUser } = res.data;
      localStorage.setItem('ops_token', newToken);
      localStorage.setItem('ops_user', JSON.stringify(updatedUser));
      onUpdate(updatedUser, newToken);

      // Reset password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNew('');
      setMsg({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Update failed.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ops_token');
    localStorage.removeItem('ops_user');
    onLogout();
  };

  /** Initials for avatar */
  const initials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Overlay */}
      <div className={`profile-overlay ${open ? 'visible' : ''}`} onClick={onClose} />

      {/* Sidebar panel */}
      <aside className={`profile-sidebar ${open ? 'open' : ''}`}>
        {/* Close btn */}
        <button className="profile-close" onClick={onClose} aria-label="Close profile">
          ✕
        </button>

        {/* Avatar & identity */}
        <div className="profile-identity">
          <div className="profile-avatar">{initials(user?.displayName)}</div>
          <h2 className="profile-name">{user?.displayName}</h2>
          <span className="profile-username">@{user?.username}</span>
        </div>

        <div className="profile-divider" />

        {/* Settings form */}
        <form className="profile-form" onSubmit={handleSave}>
          <h3 className="profile-section-title">Profile Settings</h3>

          {msg.text && (
            <div className={`profile-msg ${msg.type}`}>{msg.text}</div>
          )}

          <label className="profile-label">
            Display Name
            <input
              type="text"
              className="profile-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </label>

          <div className="profile-divider" />
          <h3 className="profile-section-title">Change Password</h3>

          <label className="profile-label">
            Current Password
            <input
              type="password"
              className="profile-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          <label className="profile-label">
            New Password
            <input
              type="password"
              className="profile-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </label>

          <label className="profile-label">
            Confirm New Password
            <input
              type="password"
              className="profile-input"
              value={confirmNew}
              onChange={(e) => setConfirmNew(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </label>

          <button type="submit" className="profile-save-btn" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>

        {/* Logout at bottom */}
        <div className="profile-bottom">
          <button type="button" className="profile-logout-btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
