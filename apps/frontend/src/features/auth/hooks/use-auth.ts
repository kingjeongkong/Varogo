'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { login, signup, logout, forgotPassword, resetPassword } from '../api-client';
import type { LoginInput, SignupInput, ForgotPasswordInput, ResetPasswordInput } from '../types';

export function useAuth() {
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);
  const router = useRouter();

  const loginMutation = useMutation({
    mutationFn: (data: LoginInput) => login(data),
    onSuccess: (user) => {
      setUser(user);
      router.push('/products');
    },
  });

  const signupMutation = useMutation({
    mutationFn: (data: SignupInput) => signup(data),
    onSuccess: (user) => {
      setUser(user);
      router.push('/products');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearUser();
      router.push('/login');
    },
    onError: () => {
      clearUser();
      router.push('/login');
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (data: ForgotPasswordInput) => forgotPassword(data),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (data: ResetPasswordInput) => resetPassword(data),
    onSuccess: () => {
      router.push('/login');
    },
  });

  return { loginMutation, signupMutation, logoutMutation, forgotPasswordMutation, resetPasswordMutation };
}
