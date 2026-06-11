import { useMemo, useState } from 'react';
import { BACKEND_URL, GRAFANA_URL, PROMETHEUS_URL } from '../config/runtime';
import './Analytics.css';

const ANALYTICS_DESTINATIONS = [
  {
    key: 'grafana',
    label: 'Grafana',
    href: GRAFANA_URL,
    metric: 'Dashboards',
    accent: '#f97316',
  },
  {
    key: 'prometheus',
    label: 'Prometheus',
    href: PROMETHEUS_URL,
    metric: 'Queries',
    accent: '#e11d48',
  },
  {
    key: 'metrics',
    label: 'Backend Metrics',
    href: `${BACKEND_URL}/metrics`,
    metric: 'Scrape',
    accent: '#31c48d',
  },
];

export default function Analytics() {
  const [selectedKey, setSelectedKey] = useState(ANALYTICS_DESTINATIONS[0].key);

  const selectedDestination = useMemo(
    () => ANALYTICS_DESTINATIONS.find((item) => item.key === selectedKey) || ANALYTICS_DESTINATIONS[0],
    [selectedKey]
  );

  return (
    <div className="analytics-wrap">
      <div className="analytics-head">
        <div>
          <h2>Analytics</h2>
          <p>Grafana, Prometheus, and backend telemetry</p>
        </div>

        <div className="analytics-launcher" style={{ '--analytics-accent': selectedDestination.accent }}>
          <select
            className="analytics-select"
            value={selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
            aria-label="Analytics destination"
          >
            {ANALYTICS_DESTINATIONS.map((destination) => (
              <option key={destination.key} value={destination.key}>
                {destination.label}
              </option>
            ))}
          </select>
          <a
            className="analytics-open"
            href={selectedDestination.href}
            target="_blank"
            rel="noreferrer"
          >
            Open
          </a>
        </div>
      </div>

      <section className="analytics-primary">
        <div className="analytics-route-panel" style={{ '--analytics-accent': selectedDestination.accent }}>
          <span className="analytics-pill">{selectedDestination.metric}</span>
          <h3>{selectedDestination.label}</h3>
          <a href={selectedDestination.href} target="_blank" rel="noreferrer">
            {selectedDestination.href}
          </a>
        </div>
      </section>

      <div className="analytics-grid">
        {ANALYTICS_DESTINATIONS.map((destination) => (
          <a
            className={`analytics-tile ${destination.key === selectedKey ? 'active' : ''}`}
            href={destination.href}
            target="_blank"
            rel="noreferrer"
            key={destination.key}
            style={{ '--analytics-accent': destination.accent }}
          >
            <span className="analytics-tile-marker" />
            <span className="analytics-tile-label">{destination.label}</span>
            <span className="analytics-tile-url">{destination.href}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
