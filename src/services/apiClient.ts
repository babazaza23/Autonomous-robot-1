export function normalizeServerHost(serverHost: string) {
  return serverHost
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^wss?:\/\//, '')
    .replace(/\/+$/, '');
}

export function httpProtocol() {
  return typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https' : 'http';
}

export function buildApiBaseUrl(serverHost: string) {
  const normalizedHost = normalizeServerHost(serverHost);
  return normalizedHost ? `${httpProtocol()}://${normalizedHost}` : '';
}

export async function parseApiError(response: Response, fallback = 'Máy chủ từ chối yêu cầu.') {
  try {
    const payload = await response.json() as { detail?: string; message?: string };
    return payload.detail || payload.message || fallback;
  } catch {
    return fallback;
  }
}

export async function requestJson<T>(apiBaseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    cache: 'no-store',
    headers: init?.body instanceof FormData ? init.headers : { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return await response.json() as T;
}
