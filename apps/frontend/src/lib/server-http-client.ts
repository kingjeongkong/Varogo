import { cookies } from 'next/headers';
import { API_BASE_URL } from './constants';
import { baseFetch } from './http-client';

export async function serverFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  return baseFetch<T>(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(cookieHeader && { Cookie: cookieHeader }),
      ...options.headers,
    },
  });
}
