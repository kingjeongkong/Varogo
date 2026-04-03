import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct } from '@/features/product/server-api-client';
import { getAnalyses } from '@/features/analysis/server-api-client';
import type { Analysis } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import Header from '@/components/layout/Header';
import AnalyzeSection from '@/features/analysis/components/AnalyzeSection';
import AnalysisHistory from '@/features/analysis/components/AnalysisHistory';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let product;
  try {
    product = await getProduct(id);
  } catch {
    notFound();
  }

  let initialAnalyses: Analysis[] = [];
  try {
    initialAnalyses = await getAnalyses(id);
  } catch {
    // analyses list is non-critical — continue without it
  }

  return (
    <div className='min-h-screen'>
      <Header />

      <main className='max-w-3xl mx-auto px-6 py-10'>
        <Link
          href='/'
          className='inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary mb-6 transition-colors animate-fade-in'
        >
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
          </svg>
          목록으로
        </Link>

        <div className='glass-card p-6 mb-8 animate-slide-up'>
          <div className='flex items-start justify-between gap-4 mb-3'>
            <h2 className='text-xl font-bold text-text-primary font-heading'>{product.name}</h2>
            {product._count && (
              <span className='shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-dim text-primary border border-primary/20'>
                분석 {product._count.analyses}회
              </span>
            )}
          </div>

          {product.url && (
            <a
              href={product.url}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover mb-3 transition-colors'
            >
              <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                />
              </svg>
              {product.url}
            </a>
          )}

          <p className='text-base text-text-secondary leading-relaxed'>{product.description}</p>

          <p className='mt-4 text-xs text-text-muted'>
            등록일: {formatDate(product.createdAt)}
          </p>
        </div>

        <div className='animate-slide-up' style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
          <h3 className='text-base font-semibold text-text-primary font-heading mb-4 flex items-center gap-2'>
            <div className='w-5 h-5 rounded bg-primary-dim flex items-center justify-center'>
              <svg className='w-3 h-3 text-primary' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' />
              </svg>
            </div>
            AI 마케팅 분석
          </h3>
          <AnalyzeSection productId={product.id} initialAnalysis={product.latestAnalysis} />
        </div>

        <AnalysisHistory productId={product.id} initialAnalyses={initialAnalyses} />
      </main>
    </div>
  );
}
