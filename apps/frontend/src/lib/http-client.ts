import { ERROR_MESSAGES } from './error-messages';
import { API_BASE_URL, PUBLIC_PAGE_PATHS } from './constants';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
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
    let message = `Error ${res.status}`;
    let code: string | undefined;
    try {
      const parsed = JSON.parse(errorBody);
      code = parsed.code;
      const rawMessage = parsed.message ?? parsed.detail ?? message;
      message = (code && ERROR_MESSAGES[code]) ?? rawMessage;
    } catch {
      message = errorBody || message;
    }
    throw new ApiError(message, res.status, code);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

let refreshPromise: Promise<void> | null = null;

const AUTH_PATHS = ['/auth/login', '/auth/signup', '/auth/refresh'];

function redirectToLogin() {
  const isPublic = PUBLIC_PAGE_PATHS.some((p) => window.location.pathname.startsWith(p));
  if (!isPublic) window.location.href = '/login';
}

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
    // Auth endpoints returning 401 mean bad credentials, not expired session
    if (AUTH_PATHS.some((p) => path.startsWith(p))) throw err;

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
      redirectToLogin();
      throw err;
    }

    try {
      return await baseFetch<T>(url, opts);
    } catch (retryErr) {
      if (retryErr instanceof ApiError && retryErr.status === 401) {
        redirectToLogin();
      }
      throw retryErr;
    }
  }
}
