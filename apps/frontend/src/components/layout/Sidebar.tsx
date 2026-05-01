'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '@/features/auth';
import { useAuthStore } from '@/stores/auth-store';

type NavItem = {
  label: string;
  href: string;
  icon: string;
  isActive: (pathname: string) => boolean;
};

const matchesRoute = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(base + '/');

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Products',
    href: '/products',
    icon: '📦',
    isActive: (p) => matchesRoute(p, '/products') || matchesRoute(p, '/product'),
  },
  {
    label: 'Integrations',
    href: '/integrations',
    icon: '🔌',
    isActive: (p) => matchesRoute(p, '/integrations'),
  },
];

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const titleId = useId();

  const closeMobile = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeMobile]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Move focus into drawer on open + trap Tab cycle
  useEffect(() => {
    if (!open) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusables = drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    drawer.addEventListener('keydown', onKeyDown);
    return () => drawer.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Auto-close when viewport crosses into desktop
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        aria-controls={titleId}
        className="md:hidden fixed top-[max(env(safe-area-inset-top),1rem)] left-[max(env(safe-area-inset-left),1rem)] z-30 inline-flex items-center justify-center w-11 h-11 rounded-lg bg-surface-elevated border border-border text-text-primary hover:bg-surface-hover motion-safe:transition-colors"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ☰
        </span>
      </button>

      {/* Desktop sidebar (always visible md+) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[200px] flex-col bg-surface-elevated border-r border-border z-30 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
        <SidebarContent pathname={pathname} titleId={`${titleId}-desktop`} />
      </aside>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile slide-in sidebar */}
      <aside
        ref={drawerRef}
        id={titleId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${titleId}-title`}
        // React 19 supports the `inert` boolean attribute on intrinsic elements.
        inert={!open}
        className={`md:hidden fixed inset-y-0 left-0 w-[240px] flex flex-col bg-surface-elevated border-r border-border z-50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] transform motion-safe:transition-transform motion-safe:duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent
          pathname={pathname}
          titleId={`${titleId}-title`}
          onCloseMobile={closeMobile}
        />
      </aside>
    </>
  );
}

interface SidebarContentProps {
  pathname: string;
  titleId: string;
  onCloseMobile?: () => void;
}

function SidebarContent({
  pathname,
  titleId,
  onCloseMobile,
}: SidebarContentProps) {
  return (
    <>
      <div className="px-4 py-5 border-b border-border flex items-center justify-between">
        <Link
          href="/products"
          className="flex items-center gap-2 group"
          onClick={onCloseMobile}
        >
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center group-hover:bg-primary/25 motion-safe:transition-colors">
            <span className="text-primary font-heading font-bold text-sm">
              V
            </span>
          </div>
          <span
            id={titleId}
            className="font-heading font-bold text-text-primary text-lg tracking-tight"
          >
            Varogo
          </span>
        </Link>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="inline-flex items-center justify-center w-11 h-11 -mr-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover text-lg leading-none motion-safe:transition-colors"
          >
            <span aria-hidden="true">✕</span>
          </button>
        )}
      </div>

      <nav
        className="flex-1 px-2 py-4 space-y-1 overflow-y-auto"
        aria-label="Primary"
      >
        {NAV_ITEMS.map((item) => {
          const active = item.isActive(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              onClick={onCloseMobile}
              className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium motion-safe:transition-colors ${
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
            className="w-full text-left text-base text-text-muted hover:text-text-secondary disabled:opacity-50 motion-safe:transition-colors"
          >
            {logoutMutation.isPending ? 'Logging out...' : 'Log out'}
          </button>
          <div role="status" aria-live="polite" className="sr-only">
            {logoutMutation.isPending ? 'Logging out' : ''}
          </div>
        </div>
      ) : null}
    </div>
  );
}
