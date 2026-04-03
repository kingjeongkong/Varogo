import { apiFetch } from '@/lib/http-client';
import type { User } from '@/lib/types';
import type { LoginInput, SignupInput } from './types';

export function login(data: LoginInput): Promise<User> {
  return apiFetch<User>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function signup(data: SignupInput): Promise<User> {
  return apiFetch<User>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function logout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST' });
}

export function getMe(): Promise<User> {
  return apiFetch<User>('/auth/me');
}
