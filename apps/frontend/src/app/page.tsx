import Link from 'next/link';
import { getProducts } from '@/features/product/server-api-client';
import type { Product } from '@/lib/types';
import Header from '@/components/layout/Header';
import ProductCard from '@/features/product/components/ProductCard';

export default async function HomePage() {
  let products: Product[] = [];
  let fetchError: string | null = null;

  try {
    products = await getProducts();
  } catch {
    fetchError = '제품 목록을 불러오지 못했습니다. 백엔드 서버가 실행 중인지 확인해주세요.';
  }

  return (
    <div className='min-h-screen'>
      <Header showNewProductButton />

      <main className='max-w-5xl mx-auto px-6 py-10'>
        <div className='mb-10 animate-fade-in'>
          <h2 className='text-2xl font-bold text-text-primary font-heading'>내 제품</h2>
          <p className='mt-2 text-base text-text-muted'>
            등록된 제품을 선택해 마케팅 전략을 분석하세요.
          </p>
        </div>

        {fetchError ? (
          <div className='bg-error-dim border border-error/20 text-error rounded-xl px-5 py-4 text-sm animate-fade-in'>
            {fetchError}
          </div>
        ) : products.length === 0 ? (
          <div
            className='text-center py-20 glass-card border-dashed animate-slide-up'
            style={{ animationDelay: '0.1s', animationFillMode: 'both' }}
          >
            <div className='w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary-dim border border-primary/20 flex items-center justify-center'>
              <svg className='w-7 h-7 text-primary' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' />
              </svg>
            </div>
            <p className='text-text-muted text-sm mb-6'>아직 등록된 제품이 없습니다.</p>
            <Link
              href='/products/new'
              className='inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors'
            >
              첫 번째 제품 등록하기
            </Link>
          </div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {products.map((product, index) => (
              <div
                key={product.id}
                className='animate-slide-up'
                style={{ animationDelay: `${index * 0.06}s`, animationFillMode: 'both' }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
