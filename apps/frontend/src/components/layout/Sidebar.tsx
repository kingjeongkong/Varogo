'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth';
import { useAuthStore } from '@/stores/auth-store';

type NavItem = {
  label: string;
  href: string;
  icon: string;
  isActive: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Products',
    href: '/products',
    icon: '📦',
    isActive: (p) => p === '/products' || p.startsWith('/product/'),
  },
  {
    label: 'Integrations',
    href: '/integrations',
    icon: '🔌',
    isActive: (p) => p.startsWith('/integrations'),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close mobile menu on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        className="md:hidden fixed top-4 left-4 z-30 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-surface-elevated border border-border text-text-primary hover:bg-surface-hover transition-colors"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ☰
        </span>
      </button>

      {/* Desktop sidebar (always visible md+) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[200px] flex-col bg-surface-elevated border-r border-border z-30">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile slide-in sidebar */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 w-[240px] flex flex-col bg-surface-elevated border-r border-border z-50 transform transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!open}
      >
        <SidebarContent
          pathname={pathname}
          onCloseMobile={() => setOpen(false)}
        />
      </aside>
    </>
  );
}

interface SidebarContentProps {
  pathname: string;
  onCloseMobile?: () => void;
}

function SidebarContent({ pathname, onCloseMobile }: SidebarContentProps) {
  return (
    <>
      <div className="px-4 py-5 border-b border-border flex items-center justify-between">
        <Link
          href="/products"
          className="flex items-center gap-2 group"
          onClick={onCloseMobile}
        >
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
            <span className="text-primary font-heading font-bold text-sm">
              V
            </span>
          </div>
          <span className="font-heading font-bold text-text-primary text-lg tracking-tight">
            Varogo
          </span>
        </Link>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="text-text-muted hover:text-text-primary text-lg leading-none"
          >
            ✕
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const active = item.isActive(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              onClick={onCloseMobile}
              className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                active
                  ? 'bg-primary-dim text-primary'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-primary"
                />
              )}
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <UserWidget />
    </>
  );
}

function UserWidget() {
  const { user, isLoading } = useAuthStore();
  const { logoutMutation } = useAuth();

  return (
    <div className="border-t border-border px-3 py-4">
      {isLoading ? (
        <div className="h-8 w-full skeleton" aria-label="Loading user info" />
      ) : user ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-primary-dim border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-medium text-primary">
                {(user.name ?? user.email)[0].toUpperCase()}
              </span>
            </div>
            <span className="text-base text-text-secondary truncate">
              {user.name ?? user.email}
            </span>
          </div>
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            aria-busy={logoutMutation.isPending}
            className="w-full text-left text-base text-text-muted hover:text-text-secondary disabled:opacity-50 transition-colors"
          >
            {logoutMutation.isPending ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
