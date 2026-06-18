'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { getMe } from '@/features/auth';

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);
  const pathname = usePathname();

  const isPublicPage = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const { data, isPending, isSuccess, isError } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !isPublicPage,
  });

  useEffect(() => {
    if (isPublicPage) {
      clearUser();
      return;
    }
    if (isSuccess) setUser(data);
    else if (isError) clearUser();
    else if (!isPending) clearUser();
  }, [isPending, isSuccess, isError, data, setUser, clearUser, isPublicPage]);

  return <>{children}</>;
}
