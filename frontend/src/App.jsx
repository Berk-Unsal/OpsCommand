import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './App.css';
import TeamChat from './components/TeamChat';
import OpsTerminal from './components/OpsTerminal';
import LoginScreen from './components/LoginScreen';
import ProfileSidebar from './components/ProfileSidebar';
import { BACKEND_URL } from './config/runtime';

const socket = io(BACKEND_URL, {
  transports: ['websocket'],
});

function App() {
  // ── Auth state ──────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  // ── Socket / UI state ───────────────────────────────────
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [myId, setMyId] = useState(socket.id || null);
  const [messageInput, setMessageInput] = useState('');
  const inputRef = useRef(null);

  // ── Bootstrap: check saved token on mount ───────────────
  useEffect(() => {
    const savedToken = localStorage.getItem('ops_token');
    if (!savedToken) {
      setAuthLoading(false);
      return;
    }
    axios
      .get(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
      .then((res) => {
        setUser(res.data.user);
        setToken(savedToken);
      })
      .catch(() => {
        localStorage.removeItem('ops_token');
        localStorage.removeItem('ops_user');
      })
      .finally(() => setAuthLoading(false));
  }, []);

  // ── Socket listeners ────────────────────────────────────
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setMyId(socket.id);
    };
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  // Keep the unified input focused
  useEffect(() => {
    if (!user) return; // only when logged in
    const refocus = () => setTimeout(() => inputRef.current?.focus(), 0);
    refocus();
    window.addEventListener('click', refocus);
    return () => window.removeEventListener('click', refocus);
  }, [user]);

  // ── Auth callbacks ──────────────────────────────────────
  const handleLogin = (u, t) => {
    setUser(u);
    setToken(t);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
  };

  const handleProfileUpdate = (u, t) => {
    setUser(u);
    setToken(t);
  };

  // ── Derive sender name from user ───────────────────────
  const senderName = user?.displayName || 'Engineer-' + (myId?.substr(0, 4) || '????');

  /** Unified input: /command → ops, anything else → team chat */
  const handleSend = (e) => {
    e.preventDefault();
    const text = messageInput.trim();
    if (!text) return;

    if (text.startsWith('/')) {
      socket.emit('ops-command', { text, sender: senderName });
    } else {
      socket.emit('team-message', { text, sender: senderName });
    }
    setMessageInput('');
  };

  const isCommand = messageInput.trimStart().startsWith('/');

  // ── Loading / Login gate ────────────────────────────────
  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // ── Authenticated UI ────────────────────────────────────
  return (
    <div className="app-shell">
      {/* Profile sidebar (slides from left) */}
      <ProfileSidebar
        user={user}
        token={token}
        onUpdate={handleProfileUpdate}
        onLogout={handleLogout}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      {/* ===== Top bar ===== */}
      <div className="app-topbar">
        <button className="topbar-avatar-btn" onClick={() => setProfileOpen(true)} title="Profile settings">
          <span className="topbar-avatar">
            {user.displayName?.substring(0, 2).toUpperCase() || '??'}
          </span>
        </button>
        <span className="topbar-greeting">
          {user.displayName}
        </span>
        <span className={`topbar-status ${isConnected ? 'online' : 'offline'}`}>
          {isConnected ? 'connected' : 'disconnected'}
        </span>
      </div>

      {/* ===== Split Pane ===== */}
      <div className="split-pane">
        <div className="pane pane-left">
          <TeamChat socket={socket} isConnected={isConnected} myId={myId} />
        </div>

        <div className="pane-divider" />

        <div className="pane pane-right">
          <OpsTerminal socket={socket} isConnected={isConnected} myId={myId} />
        </div>
      </div>

      {/* ===== Unified Input Bar ===== */}
      <form className="unified-input" onSubmit={handleSend}>
        <span className={`input-mode-badge ${isCommand ? 'cmd' : 'chat'}`}>
          {isCommand ? 'CMD' : 'CHAT'}
        </span>
        <input
          ref={inputRef}
          type="text"
          className={`unified-input-field ${isCommand ? 'cmd' : 'chat'}`}
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder={
            isConnected
              ? 'Type a message or /command…'
              : 'disconnected...'
          }
          disabled={!isConnected}
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="submit"
          className={`unified-send ${isCommand ? 'cmd' : 'chat'}`}
          disabled={!isConnected}
        >
          {isCommand ? '▶' : '➤'}
        </button>
      </form>
    </div>
  );
}

export default App;