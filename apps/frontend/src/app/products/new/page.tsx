import Link from 'next/link';
import Header from '@/components/layout/Header';
import ProductForm from '@/features/product/components/ProductForm';

export default function NewProductPage() {
  return (
    <div className='min-h-screen'>
      <Header />

      <main className='max-w-xl mx-auto px-6 py-10'>
        <div className='mb-8 animate-fade-in'>
          <Link
            href='/'
            className='inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary mb-4 transition-colors'
          >
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 19l-7-7 7-7'
              />
            </svg>
            목록으로
          </Link>
          <h2 className='text-2xl font-bold text-text-primary font-heading'>새 제품 등록</h2>
          <p className='mt-2 text-base text-text-muted'>
            제품 정보를 입력하면 AI가 마케팅 전략을 분석해드립니다.
          </p>
        </div>

        <div className='glass-card p-6 animate-slide-up' style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          <ProductForm />
        </div>
      </main>
    </div>
  );
}
