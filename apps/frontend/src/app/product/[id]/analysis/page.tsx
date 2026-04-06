'use client';

import { use } from 'react';
import Header from '@/components/layout/Header';
import { AnalysisResult } from '@/features/product/components/analysis/AnalysisResult';
import { useProduct } from '@/features/product/hooks/use-product';

export default function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: product, isLoading, error } = useProduct(id);

  return (
    <div className='min-h-screen'>
      <Header />

      <main className='max-w-4xl mx-auto px-6 py-12'>
        {isLoading && (
          <div className='space-y-4'>
            <div className='skeleton h-8 w-1/3' />
            <div className='skeleton h-4 w-1/2' />
            <div className='skeleton h-48 w-full mt-6' />
            <div className='skeleton h-48 w-full' />
          </div>
        )}

        {error && (
          <div className='glass-card p-8 text-center'>
            <p className='text-error text-sm'>분석 결과를 불러오지 못했습니다.</p>
          </div>
        )}

        {product && <AnalysisResult product={product} />}
      </main>
    </div>
  );
}
