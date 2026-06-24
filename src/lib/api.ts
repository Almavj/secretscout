export function setApiKey(key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('secretscout_api_key', key);
  }
}

export function getApiKey(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('secretscout_api_key') || '';
  }
  return '';
}

export function clearApiKey() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('secretscout_api_key');
  }
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const key = getApiKey();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (key) {
    headers['Authorization'] = `Bearer ${key}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || res.statusText, body.code || 'API_ERROR', res.status);
  }

  return res.json();
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}
