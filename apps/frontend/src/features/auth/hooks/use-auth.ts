import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { login, signup, logout } from '../api-client';
import type { LoginInput, SignupInput } from '../types';

export function useAuth() {
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);
  const router = useRouter();

  const loginMutation = useMutation({
    mutationFn: (data: LoginInput) => login(data),
    onSuccess: (user) => {
      setUser(user);
      router.push('/');
    },
  });

  const signupMutation = useMutation({
    mutationFn: (data: SignupInput) => signup(data),
    onSuccess: (user) => {
      setUser(user);
      router.push('/');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearUser();
      router.push('/login');
    },
  });

  return { loginMutation, signupMutation, logoutMutation };
}
