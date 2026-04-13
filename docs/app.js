const terminal = document.getElementById('terminal');
const rateEl = document.getElementById('rate');
const errorEl = document.getElementById('errors');
const p95El = document.getElementById('p95');

const sequence = [
  {
    command: '/status',
    output: 'OpsBot: Cluster healthy. 3/3 pods running.',
    latency: 0.091,
    ok: true,
  },
  {
    command: '/logs ops-backend-77f56f6d4-pj8v9',
    output: 'OpsBot: Last 20 lines streamed from pod logs.',
    latency: 0.188,
    ok: true,
  },
  {
    command: '/restart ops-backend',
    output: 'OpsBot: Rollout restart requested for deployment/ops-backend.',
    latency: 0.337,
    ok: true,
  },
  {
    command: '/unknown',
    output: 'OpsBot: Unknown command: /unknown',
    latency: 0.063,
    ok: false,
  },
  {
    command: '/visualize',
    output: 'OpsBot: Rendered service health snapshot.',
    latency: 0.129,
    ok: true,
  },
];

const stats = {
  total: 0,
  errors: 0,
  latencies: [],
};

function quantile(values, q) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(q * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function updateMetrics() {
  const errorRate = stats.total === 0 ? 0 : (stats.errors / stats.total) * 100;
  const p95 = quantile(stats.latencies, 0.95);
  const rate = stats.total / Math.max(1, stats.total * 1.25);

  rateEl.textContent = `${rate.toFixed(2)} cmd/s`;
  errorEl.textContent = `${errorRate.toFixed(1)}%`;
  p95El.textContent = `${p95.toFixed(3)}s`;
}

let i = 0;

function runStep() {
  const item = sequence[i % sequence.length];
  const stamp = new Date().toLocaleTimeString();
  const lineA = `${stamp} $ ${item.command}`;
  const lineB = `${item.output} (${item.latency.toFixed(3)}s)`;

  terminal.textContent += `${lineA}\n${lineB}\n\n`;
  terminal.scrollTop = terminal.scrollHeight;

  stats.total += 1;
  stats.latencies.push(item.latency);
  if (!item.ok) stats.errors += 1;
  if (stats.latencies.length > 60) stats.latencies.shift();

  updateMetrics();
  i += 1;
}

terminal.textContent = 'Booting OpsCommand simulator...\n';
updateMetrics();
setTimeout(runStep, 500);
setInterval(runStep, 2300);
