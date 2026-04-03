'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { getMe } from '@/features/auth/api-client';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => clearUser());
  }, [setUser, clearUser]);

  return <>{children}</>;
}
