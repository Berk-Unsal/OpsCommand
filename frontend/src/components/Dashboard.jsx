import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../config/runtime';
import './Dashboard.css';

const POD_COLORS = [
  '#31c48d',
  '#0ea5e9',
  '#f59e0b',
  '#a78bfa',
  '#f43f5e',
  '#14b8a6',
  '#eab308',
  '#60a5fa',
];

function toPieStops(data) {
  const entries = Object.entries(data)
    .map(([key, count]) => ({
      key,
      label: key,
      count: Number(count || 0),
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((entry, index) => ({
      ...entry,
      color: POD_COLORS[index % POD_COLORS.length],
    }));

  const total = entries.reduce((acc, item) => acc + item.count, 0);
  if (!total) {
    return {
      gradient: 'conic-gradient(#2f3846 0deg 360deg)',
      total: 0,
      entries: [],
    };
  }

  let angleStart = 0;
  const parts = [];
  const entriesWithPercent = entries.map((item) => {
    const percent = (item.count / total) * 100;
    const sweep = (item.count / total) * 360;
    const angleEnd = angleStart + sweep;

    parts.push(`${item.color} ${angleStart}deg ${angleEnd}deg`);

    angleStart = angleEnd;

    return {
      ...item,
      percent,
    };
  });

  return {
    gradient: `conic-gradient(${parts.join(', ')})`,
    total,
    entries: entriesWithPercent,
  };
}

export default function Dashboard({ token }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [runningPodsByWorkload, setRunningPodsByWorkload] = useState({});
  const [users, setUsers] = useState([]);

  const fetchOverview = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const res = await axios.get(`${BACKEND_URL}/api/dashboard/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const podGroups = res.data?.runningPodsByWorkload || res.data?.runningByService || {};
      setRunningPodsByWorkload(
        Object.fromEntries(
          Object.entries(podGroups).map(([key, value]) => [key, Number(value || 0)])
        )
      );
      setUsers(Array.isArray(res.data?.users) ? res.data.users : []);
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const pie = useMemo(() => toPieStops(runningPodsByWorkload), [runningPodsByWorkload]);

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
          <p className="dashboard-subtitle">All running workloads in the default namespace</p>

          <div className="pod-chart-row">
            <div className="pod-donut" style={{ background: pie.gradient }}>
              <div className="pod-donut-core">
                <span className="pod-total-label">Total</span>
                <strong>{pie.total}</strong>
              </div>
            </div>

            <ul className="pod-legend">
              {pie.entries.length === 0 && (
                <li className="pod-legend-empty">No running pods found.</li>
              )}
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
