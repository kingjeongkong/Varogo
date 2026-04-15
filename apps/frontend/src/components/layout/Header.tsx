'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/features/auth/hooks/use-auth';

export default function Header() {
  const pathname = usePathname();
  const { user, isLoading } = useAuthStore();
  const { logoutMutation } = useAuth();

  return (
    <header className="border-b border-border bg-surface/60 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
              <span className="text-primary font-heading font-bold text-sm">
                V
              </span>
            </div>
            <span className="font-heading font-bold text-text-primary text-lg tracking-tight">
              Varogo
            </span>
          </Link>
          {user && (
            <Link
              href="/integrations"
              aria-current={pathname === '/integrations' ? 'page' : undefined}
              className="text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              Integrations
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div
              className="h-8 w-32 skeleton"
              aria-label="Loading user info"
            />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary-dim border border-primary/20 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">
                    {(user.name ?? user.email)[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-text-secondary">
                  {user.name ?? user.email}
                </span>
              </div>
              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                aria-busy={logoutMutation.isPending}
                className="text-sm text-text-muted hover:text-text-secondary disabled:opacity-50 transition-colors"
              >
                {logoutMutation.isPending ? 'Logging out...' : 'Log out'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
