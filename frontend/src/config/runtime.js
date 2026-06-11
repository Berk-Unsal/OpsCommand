const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

function trimTrailingSlash(url) {
  return url.replace(/\/+$/, '');
}

function resolveBackendUrl() {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return trimTrailingSlash(envUrl.trim());
  }

  if (typeof window !== 'undefined') {
    if (LOCAL_HOSTS.has(window.location.hostname)) {
      // Docker Compose/local dev uses backend on :4000.
      return 'http://localhost:4000';
    }

    // In ingress deployments, API is served from the same host.
    return `${window.location.protocol}//${window.location.host}`;
  }

  return 'http://localhost:4000';
}

export const BACKEND_URL = resolveBackendUrl();

function resolveToolUrl(envKey, localPort, ingressPath) {
  const envUrl = import.meta.env[envKey];
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return trimTrailingSlash(envUrl.trim());
  }

  if (typeof window !== 'undefined') {
    if (LOCAL_HOSTS.has(window.location.hostname)) {
      return `${window.location.protocol}//localhost:${localPort}`;
    }

    return `${window.location.protocol}//${window.location.host}${ingressPath}`;
  }

  return `http://localhost:${localPort}`;
}

export const GRAFANA_URL = resolveToolUrl('VITE_GRAFANA_URL', 3000, '/grafana');
export const PROMETHEUS_URL = resolveToolUrl('VITE_PROMETHEUS_URL', 9090, '/prometheus');
