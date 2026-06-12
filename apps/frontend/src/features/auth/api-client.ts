import { apiFetch } from '@/lib/http-client';
import type { User } from '@/lib/types';
import type { LoginInput, SignupInput, ForgotPasswordInput, ResetPasswordInput } from './types';

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

export function forgotPassword(data: ForgotPasswordInput): Promise<void> {
  return apiFetch<void>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function resetPassword(data: ResetPasswordInput): Promise<void> {
  return apiFetch<void>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token: data.token, new_password: data.newPassword }),
  });
}
