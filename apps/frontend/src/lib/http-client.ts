import { cookies } from 'next/headers';
import { API_BASE_URL } from './constants';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function _baseFetch<T>(url: string, options: RequestInit): Promise<T> {
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
    return await _baseFetch<T>(url, opts);
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;

    // 401 → refresh 시도
    try {
      await _baseFetch<void>(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      window.location.href = '/login';
      throw err;
    }

    // 재시도 — 실패 시 /login
    try {
      return await _baseFetch<T>(url, opts);
    } catch (retryErr) {
      window.location.href = '/login';
      throw retryErr;
    }
  }
}

export async function serverFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  return _baseFetch<T>(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(cookieHeader && { Cookie: cookieHeader }),
      ...options.headers,
    },
  });
}
