'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/features/auth/hooks/use-auth';

interface HeaderProps {
  showNewProductButton?: boolean;
}

export default function Header({ showNewProductButton = false }: HeaderProps) {
  const { user, isLoading } = useAuthStore();
  const { logoutMutation } = useAuth();

  return (
    <header className='border-b border-border bg-surface/60 backdrop-blur-xl sticky top-0 z-50'>
      <div className='max-w-5xl mx-auto px-6 py-4 flex items-center justify-between'>
        <Link href='/' className='flex items-center gap-2 group'>
          <div className='w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center group-hover:bg-primary/25 transition-colors'>
            <span className='text-primary font-heading font-bold text-sm'>V</span>
          </div>
          <span className='font-heading font-bold text-text-primary text-lg tracking-tight'>
            Varogo
          </span>
        </Link>

        <div className='flex items-center gap-4'>
          {showNewProductButton && (
            <Link
              href='/products/new'
              className='inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors'
            >
              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24' aria-hidden='true'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
              </svg>
              새 제품 등록
            </Link>
          )}

          {isLoading ? (
            <div className='h-8 w-32 skeleton' aria-label='사용자 정보 로딩 중' />
          ) : user ? (
            <div className='flex items-center gap-3'>
              <div className='flex items-center gap-2'>
                <div className='w-7 h-7 rounded-full bg-primary-dim border border-primary/20 flex items-center justify-center'>
                  <span className='text-xs font-medium text-primary'>
                    {(user.name ?? user.email)[0].toUpperCase()}
                  </span>
                </div>
                <span className='text-sm text-text-secondary'>{user.name ?? user.email}</span>
              </div>
              <button
                type='button'
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                aria-busy={logoutMutation.isPending}
                className='text-sm text-text-muted hover:text-text-secondary disabled:opacity-50 transition-colors'
              >
                {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
