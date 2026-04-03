import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { API_BASE_URL } from './constants';
import { ApiError, baseFetch } from './http-client';

export async function serverFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const AUTH_COOKIES = ['access_token', 'refresh_token'];
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .filter((c) => AUTH_COOKIES.includes(c.name))
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  try {
    return await baseFetch<T>(`${API_BASE_URL}${path}`, {
      ...options,
      cache: 'no-store',
      headers: {
        ...(cookieHeader && { Cookie: cookieHeader }),
        ...options.headers,
      },
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirect('/login');
    }
    throw err;
  }
}
