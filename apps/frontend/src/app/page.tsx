import Link from 'next/link';
import { getProducts } from '@/lib/api';
import ProductCard from '@/components/product/ProductCard';
import type { Product } from '@/lib/types';

export default async function HomePage() {
  let products: Product[] = [];
  let fetchError: string | null = null;

  try {
    products = await getProducts();
  } catch {
    fetchError = '제품 목록을 불러오지 못했습니다. 백엔드 서버가 실행 중인지 확인해주세요.';
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <header className='bg-white border-b border-gray-200'>
        <div className='max-w-5xl mx-auto px-6 py-4 flex items-center justify-between'>
          <h1 className='text-lg font-bold text-gray-900'>
            <span className='text-indigo-600'>Varogo</span>
          </h1>
          <Link
            href='/products/new'
            className='inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors'
          >
            <svg
              className='w-4 h-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
            </svg>
            새 제품 등록
          </Link>
        </div>
      </header>

      <main className='max-w-5xl mx-auto px-6 py-10'>
        <div className='mb-8'>
          <h2 className='text-2xl font-bold text-gray-900'>내 제품</h2>
          <p className='mt-1 text-sm text-gray-500'>
            등록된 제품을 선택해 마케팅 전략을 분석하세요.
          </p>
        </div>

        {fetchError ? (
          <div className='bg-red-50 border border-red-200 text-red-700 rounded-lg px-5 py-4 text-sm'>
            {fetchError}
          </div>
        ) : products.length === 0 ? (
          <div className='text-center py-20 bg-white border border-dashed border-gray-300 rounded-xl'>
            <p className='text-gray-400 text-sm mb-4'>아직 등록된 제품이 없습니다.</p>
            <Link
              href='/products/new'
              className='inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors'
            >
              첫 번째 제품 등록하기
            </Link>
          </div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
