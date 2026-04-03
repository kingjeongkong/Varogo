import { API_BASE_URL } from './constants';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function baseFetch<T>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new ApiError(errorText || `API error: ${res.status}`, res.status);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const opts: RequestInit = { ...options, credentials: 'include' };

  try {
    return await baseFetch<T>(url, opts);
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;

    // 401 → refresh 시도
    try {
      await baseFetch<void>(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      window.location.href = '/login';
      throw err;
    }

    // 재시도 — 실패 시 /login
    try {
      return await baseFetch<T>(url, opts);
    } catch (retryErr) {
      window.location.href = '/login';
      throw retryErr;
    }
  }
}
