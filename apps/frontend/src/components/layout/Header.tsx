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
    <header className='bg-white border-b border-gray-200'>
      <div className='max-w-5xl mx-auto px-6 py-4 flex items-center justify-between'>
        <Link href='/' className='text-lg font-bold text-gray-900'>
          <span className='text-indigo-600'>Varogo</span>
        </Link>

        <div className='flex items-center gap-4'>
          {showNewProductButton && (
            <Link
              href='/products/new'
              className='inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors'
            >
              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24' aria-hidden='true'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
              </svg>
              새 제품 등록
            </Link>
          )}

          {isLoading ? (
            <div className='h-8 w-32 bg-gray-100 rounded-lg animate-pulse' aria-label='사용자 정보 로딩 중' />
          ) : user ? (
            <div className='flex items-center gap-3'>
              <span className='text-sm text-gray-600'>{user.name ?? user.email}</span>
              <button
                type='button'
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                aria-busy={logoutMutation.isPending}
                className='text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors'
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
