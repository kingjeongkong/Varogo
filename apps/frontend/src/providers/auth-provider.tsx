'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { getMe } from '@/features/auth';
import { PUBLIC_PAGE_PATHS } from '@/lib/constants';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);
  const pathname = usePathname();

  const isPublicPage = PUBLIC_PAGE_PATHS.some((p) => pathname.startsWith(p));

  const { data, isSuccess, isError } = useQuery({
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
  }, [isPublicPage, isSuccess, isError, data, setUser, clearUser]);

  return <>{children}</>;
}
