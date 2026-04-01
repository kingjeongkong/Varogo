import Link from 'next/link';
import ProductForm from '@/components/product/ProductForm';

export default function NewProductPage() {
  return (
    <div className='min-h-screen bg-gray-50'>
      <header className='bg-white border-b border-gray-200'>
        <div className='max-w-5xl mx-auto px-6 py-4 flex items-center justify-between'>
          <Link href='/' className='text-lg font-bold text-gray-900'>
            <span className='text-indigo-600'>Varogo</span>
          </Link>
        </div>
      </header>

      <main className='max-w-xl mx-auto px-6 py-10'>
        <div className='mb-8'>
          <Link
            href='/'
            className='inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4'
          >
            <svg
              className='w-4 h-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
            </svg>
            목록으로
          </Link>
          <h2 className='text-2xl font-bold text-gray-900'>새 제품 등록</h2>
          <p className='mt-1 text-sm text-gray-500'>
            제품 정보를 입력하면 AI가 마케팅 전략을 분석해드립니다.
          </p>
        </div>

        <div className='bg-white border border-gray-200 rounded-xl p-6'>
          <ProductForm />
        </div>
      </main>
    </div>
  );
}
