import { API_BASE_URL } from './constants';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function baseFetch<T>(
  url: string,
  options: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    let message = `API error: ${res.status}`;
    try {
      const parsed = JSON.parse(errorBody);
      message = parsed.detail ?? parsed.message ?? message;
    } catch {
      message = errorBody || message;
    }
    throw new ApiError(message, res.status);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

let refreshPromise: Promise<void> | null = null;

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const opts: RequestInit = { ...options, credentials: 'include' };

  try {
    return await baseFetch<T>(url, opts);
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;

    // 동시 401 → 하나의 refresh만 실행
    if (!refreshPromise) {
      refreshPromise = baseFetch<void>(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      }).finally(() => {
        refreshPromise = null;
      });
    }

    try {
      await refreshPromise;
    } catch {
      window.location.href = '/login';
      throw err;
    }

    try {
      return await baseFetch<T>(url, opts);
    } catch (retryErr) {
      if (retryErr instanceof ApiError && retryErr.status === 401) {
        window.location.href = '/login';
      }
      throw retryErr;
    }
  }
}
