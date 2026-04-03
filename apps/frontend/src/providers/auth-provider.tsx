'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { getMe } from '@/features/auth/api-client';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);

  const { data, isSuccess, isError } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (isSuccess) setUser(data);
  }, [isSuccess, data, setUser]);

  useEffect(() => {
    if (isError) clearUser();
  }, [isError, clearUser]);

  return <>{children}</>;
}
