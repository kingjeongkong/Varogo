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
    <div className='min-h-screen bg-gray-50'>
      <Header />

      <main className='max-w-3xl mx-auto px-6 py-10'>
        <Link
          href='/'
          className='inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6'
        >
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
          </svg>
          목록으로
        </Link>

        <div className='bg-white border border-gray-200 rounded-xl p-6 mb-8'>
          <div className='flex items-start justify-between gap-4 mb-3'>
            <h2 className='text-xl font-bold text-gray-900'>{product.name}</h2>
            {product._count && (
              <span className='shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700'>
                분석 {product._count.analyses}회
              </span>
            )}
          </div>

          {product.url && (
            <a
              href={product.url}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 mb-3'
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

          <p className='text-sm text-gray-600 leading-relaxed'>{product.description}</p>

          <p className='mt-4 text-xs text-gray-400'>
            등록일: {formatDate(product.createdAt)}
          </p>
        </div>

        <div>
          <h3 className='text-base font-semibold text-gray-900 mb-4'>AI 마케팅 분석</h3>
          <AnalyzeSection productId={product.id} initialAnalysis={product.latestAnalysis} />
        </div>

        <AnalysisHistory productId={product.id} initialAnalyses={initialAnalyses} />
      </main>
    </div>
  );
}
