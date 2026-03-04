import { useState } from 'react';
import axios from 'axios';
import './LoginScreen.css';

const API = import.meta.env.VITE_BACKEND_URL || 'http://opscommand.local';

export default function LoginScreen({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }

    if (isRegistering) {
      if (!displayName.trim()) {
        setError('Display name is required.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegistering
        ? { username: username.trim(), displayName: displayName.trim(), password }
        : { username: username.trim(), password };

      const res = await axios.post(`${API}${endpoint}`, payload);
      const { token, user } = res.data;

      localStorage.setItem('ops_token', token);
      localStorage.setItem('ops_user', JSON.stringify(user));
      onLogin(user, token);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering((prev) => !prev);
    setError('');
  };

  return (
    <div className="login-backdrop">
      <div className="login-card">
        {/* Logo / Header */}
        <div className="login-header">
          <div className="login-logo">⌘</div>
          <h1 className="login-title">OpsCommand</h1>
          <p className="login-subtitle">
            {isRegistering ? 'Create your account' : 'Sign in to your workspace'}
          </p>
        </div>

        {/* Error */}
        {error && <div className="login-error">{error}</div>}

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-label">
            Username
            <input
              type="text"
              className="login-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. jdoe"
              autoFocus
              autoComplete="username"
            />
          </label>

          {isRegistering && (
            <label className="login-label">
              Display Name
              <input
                type="text"
                className="login-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Jane Doe"
                autoComplete="name"
              />
            </label>
          )}

          <label className="login-label">
            Password
            <input
              type="password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
            />
          </label>

          {isRegistering && (
            <label className="login-label">
              Confirm Password
              <input
                type="password"
                className="login-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </label>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Please wait…' : isRegistering ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {/* Toggle */}
        <p className="login-toggle">
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" className="login-toggle-btn" onClick={toggleMode}>
            {isRegistering ? 'Sign In' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  );
}
