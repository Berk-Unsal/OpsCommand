import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../config/runtime';
import './Dashboard.css';

const SEGMENTS = [
  { key: 'ops-backend', label: 'ops-backend', color: '#31c48d' },
  { key: 'ops-frontend', label: 'ops-frontend', color: '#0ea5e9' },
  { key: 'ops-mongo', label: 'ops-mongo', color: '#f59e0b' },
];

function toPieStops(data) {
  const total = SEGMENTS.reduce((acc, item) => acc + (data[item.key] || 0), 0);
  if (!total) {
    return {
      gradient: 'conic-gradient(#2f3846 0deg 360deg)',
      total: 0,
      entries: SEGMENTS.map((item) => ({ ...item, count: 0, percent: 0 })),
    };
  }

  let angleStart = 0;
  const parts = [];
  const entries = SEGMENTS.map((item) => {
    const count = data[item.key] || 0;
    const percent = (count / total) * 100;
    const sweep = (count / total) * 360;
    const angleEnd = angleStart + sweep;

    if (count > 0) {
      parts.push(`${item.color} ${angleStart}deg ${angleEnd}deg`);
    }

    angleStart = angleEnd;

    return {
      ...item,
      count,
      percent,
    };
  });

  return {
    gradient: `conic-gradient(${parts.join(', ')})`,
    total,
    entries,
  };
}

export default function Dashboard({ token }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [runningByService, setRunningByService] = useState({
    'ops-backend': 0,
    'ops-frontend': 0,
    'ops-mongo': 0,
  });
  const [users, setUsers] = useState([]);

  const fetchOverview = async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const res = await axios.get(`${BACKEND_URL}/api/dashboard/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRunningByService({
        'ops-backend': Number(res.data?.runningByService?.['ops-backend'] || 0),
        'ops-frontend': Number(res.data?.runningByService?.['ops-frontend'] || 0),
        'ops-mongo': Number(res.data?.runningByService?.['ops-mongo'] || 0),
      });
      setUsers(Array.isArray(res.data?.users) ? res.data.users : []);
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [token]);

  const pie = useMemo(() => toPieStops(runningByService), [runningByService]);

  return (
    <div className="dashboard-wrap">
      <div className="dashboard-head">
        <h2>Cluster Dashboard</h2>
        <button type="button" className="dashboard-refresh" onClick={fetchOverview} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && <div className="dashboard-error">{error}</div>}

      <div className="dashboard-grid">
        <section className="dashboard-card">
          <h3>Running Pods</h3>
          <p className="dashboard-subtitle">ops-backend vs ops-frontend vs ops-mongo</p>

          <div className="pod-chart-row">
            <div className="pod-donut" style={{ background: pie.gradient }}>
              <div className="pod-donut-core">
                <span className="pod-total-label">Total</span>
                <strong>{pie.total}</strong>
              </div>
            </div>

            <ul className="pod-legend">
              {pie.entries.map((entry) => (
                <li key={entry.key}>
                  <span className="legend-dot" style={{ backgroundColor: entry.color }} />
                  <span className="legend-name">{entry.label}</span>
                  <span className="legend-count">{entry.count}</span>
                  <span className="legend-percent">{entry.percent.toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="dashboard-card users-card">
          <h3>Users</h3>
          <p className="dashboard-subtitle">Registered team members</p>

          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Display Name</th>
                  <th>Role</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan="4" className="users-empty">No users found.</td>
                  </tr>
                )}
                {users.map((user) => (
                  <tr key={user._id || user.username}>
                    <td>{user.username}</td>
                    <td>{user.displayName}</td>
                    <td>{user.role || 'engineer'}</td>
                    <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
