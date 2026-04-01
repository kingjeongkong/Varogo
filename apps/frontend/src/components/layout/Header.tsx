import Link from 'next/link';

interface HeaderProps {
  showNewProductButton?: boolean;
}

export default function Header({ showNewProductButton = false }: HeaderProps) {
  return (
    <header className='bg-white border-b border-gray-200'>
      <div className='max-w-5xl mx-auto px-6 py-4 flex items-center justify-between'>
        <Link href='/' className='text-lg font-bold text-gray-900'>
          <span className='text-indigo-600'>Varogo</span>
        </Link>
        {showNewProductButton && (
          <Link
            href='/products/new'
            className='inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors'
          >
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 4v16m8-8H4'
              />
            </svg>
            새 제품 등록
          </Link>
        )}
      </div>
    </header>
  );
}
